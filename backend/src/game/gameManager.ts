import { Room, Player, GameState, DEFAULT_ROOM_SETTINGS } from './types';
import { generateRoomCode, getPlayerColor } from '../utils/helpers';
import { initializeGame, declareBankruptcy } from './gameEngine';

function makePlayer(id: string, name: string, index: number): Player {
  return {
    id,
    name,
    money: 1500,
    position: 0,
    isBankrupt: false,
    inJail: false,
    jailTurns: 0,
    color: getPlayerColor(index),
    getOutOfJailCards: 0,
    tokenSkin: 'default',
  };
}

const rooms = new Map<string, Room>();
const socketToRoomMap = new Map<string, string>(); // socketId -> roomCode

export function getRoom(roomCode: string): Room | undefined {
  return rooms.get(roomCode.toUpperCase());
}

export function createRoom(hostPlayerName: string, hostSocketId: string): { room: Room; hostId: string } {
  const roomCode = generateRoomCode(4);
  
  const hostPlayer: Player = makePlayer(hostSocketId, hostPlayerName, 0);

  const room: Room = {
    roomCode,
    players: [hostPlayer],
    hostId: hostSocketId,
    gameStarted: false,
    gameState: null,
    settings: { ...DEFAULT_ROOM_SETTINGS },
  };

  rooms.set(roomCode, room);
  socketToRoomMap.set(hostSocketId, roomCode);

  return { room, hostId: hostSocketId };
}

export function joinRoom(roomCode: string, playerName: string, socketId: string): { room: Room; player: Player } | { error: string } {
  const code = roomCode.toUpperCase();
  const room = rooms.get(code);

  if (!room) {
    return { error: 'Không tìm thấy phòng với mã này!' };
  }

  if (room.gameStarted) {
    return { error: 'Trận đấu trong phòng này đã bắt đầu!' };
  }

  if (room.players.length >= 6) {
    return { error: 'Phòng đã đầy (tối đa 6 người chơi)!' };
  }

  // Tránh trùng tên hiển thị
  const nameExists = room.players.some(p => p.name.trim().toLowerCase() === playerName.trim().toLowerCase());
  const finalName = nameExists ? `${playerName} (${room.players.length + 1})` : playerName;

  const newPlayer: Player = makePlayer(socketId, finalName, room.players.length);

  room.players.push(newPlayer);
  socketToRoomMap.set(socketId, code);

  return { room, player: newPlayer };
}

export function startGame(roomCode: string, hostSocketId: string): { gameState: GameState } | { error: string } {
  const code = roomCode.toUpperCase();
  const room = rooms.get(code);

  if (!room) {
    return { error: 'Không tìm thấy phòng!' };
  }

  if (room.hostId !== hostSocketId) {
    return { error: 'Chỉ có chủ phòng mới có quyền bắt đầu trận đấu!' };
  }

  if (room.players.length < 2) {
    return { error: 'Cần ít nhất 2 người chơi để bắt đầu trận đấu!' };
  }

  room.gameStarted = true;
  room.gameState = initializeGame(code, room.players, room.settings);
  
  return { gameState: room.gameState };
}

export function restartGame(roomCode: string, hostSocketId: string): { room: Room } | { error: string } {
  const code = roomCode.toUpperCase();
  const room = rooms.get(code);

  if (!room) {
    return { error: 'Không tìm thấy phòng!' };
  }

  if (room.hostId !== hostSocketId) {
    return { error: 'Chỉ có chủ phòng mới có quyền khởi động lại trận đấu!' };
  }

  // Khởi tạo lại thông tin người chơi về mặc định phòng chờ
  room.players = room.players.map((p, idx) => ({
    ...makePlayer(p.id, p.name, idx),
    tokenSkin: p.tokenSkin || 'default',
  }));
  
  room.gameStarted = false;
  room.gameState = null;

  return { room };
}

/**
 * Gắn lại một người chơi rớt mạng với socket id mới: cập nhật mọi tham chiếu tới id cũ
 * (phòng, gameState, tiles, pendingPayment) sang id mới.
 */
export function relinkPlayer(roomCode: string, oldId: string, newId: string): boolean {
  const room = rooms.get(roomCode.toUpperCase());
  if (!room) return false;

  socketToRoomMap.delete(oldId);
  socketToRoomMap.set(newId, room.roomCode);
  if (room.hostId === oldId) room.hostId = newId;
  room.players.forEach((p) => { if (p.id === oldId) p.id = newId; });

  const gs = room.gameState;
  if (gs) {
    gs.players.forEach((p) => { if (p.id === oldId) p.id = newId; });
    gs.tiles.forEach((t) => { if (t.ownerId === oldId) t.ownerId = newId; });
    if (gs.pendingPayment) {
      if (gs.pendingPayment.fromPlayerId === oldId) gs.pendingPayment.fromPlayerId = newId;
      if (gs.pendingPayment.toPlayerId === oldId) gs.pendingPayment.toPlayerId = newId;
    }
  }
  return true;
}

export function leaveRoom(socketId: string): {
  roomCode: string;
  roomEmpty: boolean;
  playersLeft: Player[];
  wasHost: boolean;
  newHostId?: string;
  gameStateUpdate?: GameState | null;
} | null {
  const roomCode = socketToRoomMap.get(socketId);
  if (!roomCode) return null;

  socketToRoomMap.delete(socketId);
  const room = rooms.get(roomCode);
  if (!room) return null;

  const wasHost = room.hostId === socketId;
  const playerIndex = room.players.findIndex(p => p.id === socketId);
  let playerWhoLeftName = 'Người chơi';

  if (playerIndex !== -1) {
    playerWhoLeftName = room.players[playerIndex].name;
  }

  // Nếu game đã bắt đầu, thay vì xóa người chơi ngay lập tức làm lỗi game, 
  // chúng ta đánh dấu họ phá sản trong gameState
  let gameStateUpdate: GameState | null = null;
  if (room.gameStarted && room.gameState && playerIndex !== -1) {
    const playerInGame = room.gameState.players.find(p => p.id === socketId);
    if (playerInGame && !playerInGame.isBankrupt) {
      room.gameState.logs.push(`[KẾT NỐI] ${playerWhoLeftName} đã thoát khỏi phòng.`);
      
      // Chuyển lượt tạm thời về người vừa thoát để thực hiện phá sản tự động
      const activeIdx = room.gameState.players.findIndex(p => p.id === socketId);
      if (activeIdx !== -1) {
        room.gameState.activePlayerIndex = activeIdx;
        declareBankruptcy(room.gameState);
        gameStateUpdate = room.gameState;
      }
    }
  }

  // Xóa khỏi danh sách phòng chờ/người chơi của room
  room.players = room.players.filter(p => p.id !== socketId);

  // Nếu không còn ai trong phòng
  if (room.players.length === 0) {
    rooms.delete(roomCode);
    return {
      roomCode,
      roomEmpty: true,
      playersLeft: [],
      wasHost
    };
  }

  // Nếu host thoát ra, đổi host cho người đầu tiên còn lại
  let newHostId = room.hostId;
  if (wasHost) {
    room.hostId = room.players[0].id;
    newHostId = room.hostId;
  }

  return {
    roomCode,
    roomEmpty: false,
    playersLeft: room.players,
    wasHost,
    newHostId,
    gameStateUpdate
  };
}
