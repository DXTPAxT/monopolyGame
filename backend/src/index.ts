import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import {
  createRoom,
  joinRoom,
  leaveRoom,
  startGame,
  restartGame,
  getRoom,
  relinkPlayer
} from './game/gameManager';
import {
  rollDiceAndMove,
  buyProperty,
  buildHouse,
  endTurn,
  declareBankruptcy,
  upgradeHotel,
  handleGoBonus,
  sellHouse,
  mortgageTile,
  unmortgageTile,
  leaveJail,
  settleRaisedFunds,
  passBuy,
  finishBuild,
} from './game/gameEngine';
import { RoomSettings } from './game/types';
import { ReconnectRegistry } from './realtime/reconnect';

const reconnectRegistry = new ReconnectRegistry();
const GRACE_MS = 60_000;

// Quản lý đồng hồ lượt (auto-pass) & reconnect
const turnTimers = new Map<string, ReturnType<typeof setTimeout>>();
const graceTimers = new Map<string, ReturnType<typeof setTimeout>>();
const socketToToken = new Map<string, string>();

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.send({ status: 'OK', message: 'Monopoly game backend is running.' });
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*', // Cho phép mọi nguồn kết nối (thuận tiện chạy dev)
    methods: ['GET', 'POST']
  }
});

// Đặt/đặt-lại đồng hồ lượt cho phòng; hết giờ thì tự tung + kết thúc lượt (nếu trạng thái đơn giản).
function armTurnTimer(roomCode: string) {
  const code = roomCode.toUpperCase();
  const old = turnTimers.get(code);
  if (old) { clearTimeout(old); turnTimers.delete(code); }

  const room = getRoom(code);
  if (!room || !room.gameState || room.gameState.winnerId) return;
  const sec = room.gameState.settings.houseRules.turnTimerSec;
  if (!sec) return;

  room.gameState.turnDeadline = Date.now() + sec * 1000;
  const timer = setTimeout(() => {
    const r = getRoom(code);
    if (!r || !r.gameState || r.gameState.winnerId) return;
    const gs = r.gameState;
    let event = 'Hết giờ — tự động xử lý lượt.';
    try {
      if (!gs.diceRolled && gs.currentActionRequired === 'none' && !gs.players[gs.activePlayerIndex].inJail) {
        event = rollDiceAndMove(gs).event;
      }
      if (gs.currentActionRequired === 'none' || gs.currentActionRequired === 'buy_or_pass') {
        endTurn(gs);
      }
    } catch { /* bỏ qua, để người chơi tự xử lý trạng thái phức tạp */ }
    io.to(code).emit('turn_timeout', {});
    io.to(code).emit('game_state_update', { gameState: gs, lastEvent: event });
    armTurnTimer(code);
  }, sec * 1000);
  turnTimers.set(code, timer);
}

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // 1. Tạo phòng mới
  socket.on('create_room', ({ playerName }) => {
    if (!playerName || playerName.trim() === '') {
      socket.emit('error_message', { message: 'Tên hiển thị không được bỏ trống!' });
      return;
    }
    
    const { room, hostId } = createRoom(playerName.trim(), socket.id);
    socket.join(room.roomCode);

    const hostToken = reconnectRegistry.generateToken();
    reconnectRegistry.register(hostToken, room.roomCode, socket.id);
    socketToToken.set(socket.id, hostToken);
    socket.emit('room_created', { roomCode: room.roomCode, playerId: socket.id, playerToken: hostToken });
    
    // Đồng bộ trạng thái phòng
    io.to(room.roomCode).emit('room_state_update', {
      players: room.players,
      hostId: room.hostId,
      gameStarted: room.gameStarted
    });

    console.log(`Room created: ${room.roomCode} by ${playerName}`);
  });

  // 2. Tham gia phòng sẵn có
  socket.on('join_room', ({ roomCode, playerName }) => {
    if (!playerName || playerName.trim() === '') {
      socket.emit('error_message', { message: 'Tên hiển thị không được bỏ trống!' });
      return;
    }
    if (!roomCode || roomCode.trim() === '') {
      socket.emit('error_message', { message: 'Mã phòng không được bỏ trống!' });
      return;
    }

    const cleanRoomCode = roomCode.trim().toUpperCase();
    const result = joinRoom(cleanRoomCode, playerName.trim(), socket.id);

    if ('error' in result) {
      socket.emit('error_message', { message: result.error });
      return;
    }

    const { room, player } = result;
    socket.join(room.roomCode);

    const joinToken = reconnectRegistry.generateToken();
    reconnectRegistry.register(joinToken, room.roomCode, socket.id);
    socketToToken.set(socket.id, joinToken);
    socket.emit('room_joined', { roomCode: room.roomCode, playerId: socket.id, players: room.players, playerToken: joinToken });

    // Thông báo cho phòng có người mới tham gia
    io.to(room.roomCode).emit('room_state_update', {
      players: room.players,
      hostId: room.hostId,
      gameStarted: room.gameStarted
    });

    // Phát sự kiện chat thông báo
    io.to(room.roomCode).emit('chat_message', {
      sender: 'Hệ thống',
      message: `${player.name} đã tham gia phòng.`,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    });

    console.log(`User ${playerName} joined Room ${room.roomCode}`);
  });

  // 3. Bắt đầu trận đấu
  socket.on('start_game', ({ roomCode }) => {
    const result = startGame(roomCode, socket.id);
    if ('error' in result) {
      socket.emit('error_message', { message: result.error });
      return;
    }

    io.to(roomCode.toUpperCase()).emit('game_started', { gameState: result.gameState });
    armTurnTimer(roomCode);
    console.log(`Game started in Room ${roomCode.toUpperCase()}`);
  });

  // 4. Tung xúc xắc và di chuyển
  socket.on('roll_dice', ({ roomCode }) => {
    const room = getRoom(roomCode);
    if (!room || !room.gameState || !room.gameStarted) {
      socket.emit('error_message', { message: 'Trận đấu chưa bắt đầu hoặc không tồn tại phòng!' });
      return;
    }

    const activePlayer = room.gameState.players[room.gameState.activePlayerIndex];
    if (activePlayer.id !== socket.id) {
      socket.emit('error_message', { message: 'Không phải lượt chơi của bạn!' });
      return;
    }

    const { state, event } = rollDiceAndMove(room.gameState);
    room.gameState = state;

    io.to(roomCode.toUpperCase()).emit('game_state_update', { gameState: room.gameState, lastEvent: event });
  });

  // 5. Mua đất
  socket.on('buy_property', ({ roomCode }) => {
    const room = getRoom(roomCode);
    if (!room || !room.gameState) return;

    const activePlayer = room.gameState.players[room.gameState.activePlayerIndex];
    if (activePlayer.id !== socket.id) {
      socket.emit('error_message', { message: 'Không phải lượt chơi của bạn!' });
      return;
    }

    if (room.gameState.currentActionRequired !== 'buy_or_pass') {
      socket.emit('error_message', { message: 'Bạn không thể thực hiện hành động này lúc này!' });
      return;
    }

    const { state, event } = buyProperty(room.gameState);
    room.gameState = state;

    io.to(roomCode.toUpperCase()).emit('game_state_update', { gameState: room.gameState, lastEvent: event });
  });

  // 6. Xây nhà / Nâng cấp đất
  socket.on('build_house', ({ roomCode, tileId }) => {
    const room = getRoom(roomCode);
    if (!room || !room.gameState) return;

    const activePlayer = room.gameState.players[room.gameState.activePlayerIndex];
    if (activePlayer.id !== socket.id) {
      socket.emit('error_message', { message: 'Chỉ người đang thực hiện lượt mới được xây nhà!' });
      return;
    }

    const { state, event } = buildHouse(room.gameState, tileId);
    room.gameState = state;

    io.to(roomCode.toUpperCase()).emit('game_state_update', { gameState: room.gameState, lastEvent: event });
  });

  // 6b. Nâng cấp Khách Sạn (khi đi vào ô có 3 nhà)
  socket.on('upgrade_hotel', ({ roomCode }) => {
    const room = getRoom(roomCode);
    if (!room || !room.gameState) return;

    const activePlayer = room.gameState.players[room.gameState.activePlayerIndex];
    if (activePlayer.id !== socket.id) {
      socket.emit('error_message', { message: 'Không phải lượt chơi của bạn!' });
      return;
    }

    const { state, event } = upgradeHotel(room.gameState);
    room.gameState = state;

    io.to(roomCode.toUpperCase()).emit('game_state_update', { gameState: room.gameState, lastEvent: event });
  });

  socket.on('pass_upgrade_hotel', ({ roomCode }) => {
    const room = getRoom(roomCode);
    if (!room || !room.gameState) return;

    const activePlayer = room.gameState.players[room.gameState.activePlayerIndex];
    if (activePlayer.id !== socket.id) return;

    room.gameState.currentActionRequired = 'none';
    room.gameState.activeModal = null;
    room.gameState.modalPayload = null;

    const event = `${activePlayer.name} từ chối nâng cấp lên Khách Sạn.`;
    room.gameState.logs.push(event);

    io.to(roomCode.toUpperCase()).emit('game_state_update', { gameState: room.gameState, lastEvent: event });
  });

  // 6c. Chọn phần thưởng khi dừng chân ô Start (GO)
  socket.on('go_choose_bonus', ({ roomCode, choiceType, tileId }) => {
    const room = getRoom(roomCode);
    if (!room || !room.gameState) return;

    const activePlayer = room.gameState.players[room.gameState.activePlayerIndex];
    if (activePlayer.id !== socket.id) {
      socket.emit('error_message', { message: 'Không phải lượt chơi của bạn!' });
      return;
    }

    const { state, event } = handleGoBonus(room.gameState, choiceType, tileId);
    room.gameState = state;

    io.to(roomCode.toUpperCase()).emit('game_state_update', { gameState: room.gameState, lastEvent: event });
  });

  // 7. Kết thúc lượt
  socket.on('end_turn', ({ roomCode }) => {
    const room = getRoom(roomCode);
    if (!room || !room.gameState) return;

    const activePlayer = room.gameState.players[room.gameState.activePlayerIndex];
    if (activePlayer.id !== socket.id) {
      socket.emit('error_message', { message: 'Không phải lượt chơi của bạn!' });
      return;
    }

    const { state, event } = endTurn(room.gameState);
    room.gameState = state;

    io.to(roomCode.toUpperCase()).emit('game_state_update', { gameState: room.gameState, lastEvent: event });
    armTurnTimer(roomCode);
  });

  // 8. Tuyên bố phá sản
  socket.on('declare_bankruptcy', ({ roomCode }) => {
    const room = getRoom(roomCode);
    if (!room || !room.gameState) return;

    const activePlayer = room.gameState.players[room.gameState.activePlayerIndex];
    if (activePlayer.id !== socket.id) {
      socket.emit('error_message', { message: 'Không phải lượt chơi của bạn!' });
      return;
    }

    if (room.gameState.currentActionRequired !== 'bankruptcy_decision') {
      socket.emit('error_message', { message: 'Bạn chưa rơi vào trạng thái phá sản nợ nần!' });
      return;
    }

    const { state, event } = declareBankruptcy(room.gameState);
    room.gameState = state;

    io.to(roomCode.toUpperCase()).emit('game_state_update', { gameState: room.gameState, lastEvent: event });
  });

  // 9. Gửi tin nhắn chat
  socket.on('send_chat', ({ roomCode, message }) => {
    if (!message || message.trim() === '') return;
    const room = getRoom(roomCode);
    if (!room) return;

    const player = room.players.find(p => p.id === socket.id);
    const senderName = player ? player.name : 'Vô danh';

    io.to(roomCode.toUpperCase()).emit('chat_message', {
      sender: senderName,
      message: message.trim(),
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    });
  });

  // 10. Chơi lại (Restart)
  socket.on('restart_game', ({ roomCode }) => {
    const result = restartGame(roomCode, socket.id);
    if ('error' in result) {
      socket.emit('error_message', { message: result.error });
      return;
    }

    const room = result.room;
    // Báo cho các client quay về màn hình chờ lobby
    io.to(room.roomCode).emit('game_restarted');
    io.to(room.roomCode).emit('room_state_update', {
      players: room.players,
      hostId: room.hostId,
      gameStarted: room.gameStarted
    });

    // Phát chat thông báo
    io.to(room.roomCode).emit('chat_message', {
      sender: 'Hệ thống',
      message: `Chủ phòng đã khởi động lại game. Hãy sẵn sàng!`,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    });

    console.log(`Game restarted in Room ${room.roomCode}`);
  });

  // ============================================================
  // WS-2: Handlers cho cơ chế mới (quản lý tài sản, đấu giá, giao dịch)
  // ============================================================

  const broadcast = (roomCode: string, event: string) => {
    const room = getRoom(roomCode);
    if (room?.gameState) {
      io.to(roomCode.toUpperCase()).emit('game_state_update', { gameState: room.gameState, lastEvent: event });
    }
  };

  // Yêu cầu là người chơi đang tới lượt (cho các hành động trong lượt)
  const requireActive = (roomCode: string) => {
    const room = getRoom(roomCode);
    if (!room || !room.gameState) return null;
    const active = room.gameState.players[room.gameState.activePlayerIndex];
    if (active.id !== socket.id) {
      socket.emit('error_message', { message: 'Không phải lượt chơi của bạn!' });
      return null;
    }
    return room;
  };

  // --- Quản lý tài sản (cho phép trong lượt của mình) ---
  socket.on('sell_house', ({ roomCode, tileId }) => {
    const room = requireActive(roomCode); if (!room) return;
    const { event } = sellHouse(room.gameState!, tileId);
    broadcast(roomCode, event);
  });

  socket.on('mortgage_tile', ({ roomCode, tileId }) => {
    const room = requireActive(roomCode); if (!room) return;
    const { event } = mortgageTile(room.gameState!, tileId);
    broadcast(roomCode, event);
  });

  socket.on('unmortgage_tile', ({ roomCode, tileId }) => {
    const room = requireActive(roomCode); if (!room) return;
    const { event } = unmortgageTile(room.gameState!, tileId);
    broadcast(roomCode, event);
  });

  // --- Ra tù chủ động ---
  socket.on('jail_action', ({ roomCode, method }: { roomCode: string; method: 'pay' | 'use_card' }) => {
    const room = requireActive(roomCode); if (!room) return;
    const { event } = leaveJail(room.gameState!, method);
    broadcast(roomCode, event);
  });

  // --- Gom tiền trả nợ (sau khi bán/cầm cố) ---
  socket.on('settle_funds', ({ roomCode }) => {
    const room = requireActive(roomCode); if (!room) return;
    const { event } = settleRaisedFunds(room.gameState!);
    broadcast(roomCode, event);
  });

  // --- Từ chối mua → ô vẫn thuộc ngân hàng (không đấu giá) ---
  socket.on('decline_buy', ({ roomCode }) => {
    const room = requireActive(roomCode); if (!room) return;
    if (room.gameState!.currentActionRequired !== 'buy_or_pass') {
      socket.emit('error_message', { message: 'Không có tài sản nào để từ chối lúc này.' });
      return;
    }
    const { event } = passBuy(room.gameState!);
    broadcast(roomCode, event);
  });

  // --- Kết thúc xây nhà (đóng modal build) ---
  socket.on('finish_build', ({ roomCode }) => {
    const room = requireActive(roomCode); if (!room) return;
    const { event } = finishBuild(room.gameState!);
    broadcast(roomCode, event);
  });

  // --- Cấu hình phòng (host) & chọn skin ---
  socket.on('update_room_settings', ({ roomCode, settings }: { roomCode: string; settings: Partial<RoomSettings> }) => {
    const room = getRoom(roomCode);
    if (!room) return;
    if (room.hostId !== socket.id) {
      socket.emit('error_message', { message: 'Chỉ chủ phòng được đổi cấu hình.' });
      return;
    }
    if (room.gameStarted) {
      socket.emit('error_message', { message: 'Không thể đổi cấu hình khi trận đã bắt đầu.' });
      return;
    }
    room.settings = {
      ...room.settings,
      ...settings,
      houseRules: { ...room.settings.houseRules, ...(settings.houseRules || {}) },
    };
    // Khi đổi game mode → áp preset (host có thể tinh chỉnh lại từng toggle sau đó)
    if (settings.gameMode) {
      if (settings.gameMode === 'fast') {
        room.settings.startingMoney = 1000;
        room.settings.houseRules.turnTimerSec = 30;
      } else if (settings.gameMode === 'chaos') {
        room.settings.startingMoney = 1500;
        room.settings.houseRules.freeParkingJackpot = true;
        room.settings.houseRules.doubleGo = true;
      } else {
        room.settings.startingMoney = 1500;
        room.settings.houseRules = { freeParkingJackpot: false, doubleGo: false, turnTimerSec: null };
      }
    }
    io.to(roomCode.toUpperCase()).emit('room_state_update', {
      players: room.players, hostId: room.hostId, gameStarted: room.gameStarted, settings: room.settings,
    });
  });

  socket.on('select_skin', ({ roomCode, tokenSkin }) => {
    const room = getRoom(roomCode);
    if (!room) return;
    const player = room.players.find((p) => p.id === socket.id);
    if (player) player.tokenSkin = tokenSkin;
    io.to(roomCode.toUpperCase()).emit('room_state_update', {
      players: room.players, hostId: room.hostId, gameStarted: room.gameStarted, settings: room.settings,
    });
  });

  // 12. Vào lại phòng sau khi rớt mạng (reconnect)
  socket.on('rejoin', ({ playerToken }: { playerToken: string }) => {
    const entry = reconnectRegistry.get(playerToken);
    if (!entry) {
      socket.emit('error_message', { message: 'Phiên chơi đã hết hạn, không thể vào lại.' });
      return;
    }
    const oldId = entry.playerId;
    const updated = reconnectRegistry.reconnect(playerToken, socket.id, Date.now(), GRACE_MS);
    if (!updated) {
      socket.emit('error_message', { message: 'Đã quá thời gian vào lại phòng.' });
      return;
    }

    const gt = graceTimers.get(playerToken);
    if (gt) { clearTimeout(gt); graceTimers.delete(playerToken); }

    const code = entry.roomCode;
    relinkPlayer(code, oldId, socket.id);
    socketToToken.set(socket.id, playerToken);
    socket.join(code);

    const room = getRoom(code);
    if (!room) {
      socket.emit('error_message', { message: 'Phòng không còn tồn tại.' });
      return;
    }

    socket.emit('rejoined', { roomCode: code, playerId: socket.id, players: room.players, gameState: room.gameState });
    io.to(code).emit('room_state_update', {
      players: room.players, hostId: room.hostId, gameStarted: room.gameStarted, settings: room.settings,
    });
    if (room.gameState) {
      io.to(code).emit('game_state_update', { gameState: room.gameState, lastEvent: 'Một người chơi đã vào lại phòng.' });
    }
  });

  // 11. Mất kết nối
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    const token = socketToToken.get(socket.id);
    socketToToken.delete(socket.id);

    // Nếu đang trong ván & người chơi chưa phá sản → cho thời gian grace để vào lại
    if (token) {
      const entry = reconnectRegistry.get(token);
      const liveRoom = entry ? getRoom(entry.roomCode) : undefined;
      if (liveRoom && liveRoom.gameStarted && liveRoom.gameState && !liveRoom.gameState.winnerId) {
        const p = liveRoom.gameState.players.find((pp) => pp.id === socket.id);
        if (p && !p.isBankrupt) {
          reconnectRegistry.markDisconnected(token, Date.now());
          liveRoom.gameState.logs.push(`${p.name} mất kết nối — chờ tối đa ${GRACE_MS / 1000}s để vào lại...`);
          io.to(liveRoom.roomCode).emit('game_state_update', { gameState: liveRoom.gameState, lastEvent: `${p.name} mất kết nối.` });
          const t = setTimeout(() => {
            reconnectRegistry.remove(token);
            graceTimers.delete(token);
            const res = leaveRoom(socket.id);
            if (res && !res.roomEmpty) {
              io.to(res.roomCode).emit('room_state_update', {
                players: res.playersLeft, hostId: res.newHostId, gameStarted: getRoom(res.roomCode)?.gameStarted || false,
              });
              if (res.gameStateUpdate) {
                io.to(res.roomCode).emit('game_state_update', { gameState: res.gameStateUpdate, lastEvent: 'Người chơi rớt mạng quá lâu, tự động phá sản.' });
              }
            }
          }, GRACE_MS);
          graceTimers.set(token, t);
          return;
        }
      }
    }

    // Mặc định: rời phòng ngay (đang ở lobby hoặc đã phá sản)
    const result = leaveRoom(socket.id);
    if (result) {
      const { roomCode, roomEmpty, playersLeft, newHostId, gameStateUpdate } = result;
      if (!roomEmpty) {
        io.to(roomCode).emit('room_state_update', {
          players: playersLeft,
          hostId: newHostId,
          gameStarted: getRoom(roomCode)?.gameStarted || false
        });
        if (gameStateUpdate) {
          io.to(roomCode).emit('game_state_update', {
            gameState: gameStateUpdate,
            lastEvent: `Một người chơi đã mất kết nối và tự động tuyên bố phá sản.`
          });
        }
      }
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
