import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type { GameState, Player, ChatMessage, RoomSettings } from '../types/game';
import { playDiceSound, playCoinsSound, playPaySound, playSadSound, playClickSound } from '../utils/sound';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [playerId, setPlayerId] = useState<string>('');
  const [roomCode, setRoomCode] = useState<string>('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [hostId, setHostId] = useState<string>('');
  const [gameStarted, setGameStarted] = useState(false);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [chats, setChats] = useState<ChatMessage[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [playerToken, setPlayerToken] = useState<string>('');
  const [roomSettings, setRoomSettings] = useState<RoomSettings | null>(null);

  useEffect(() => {
    // Khởi tạo socket
    const socket = io(BACKEND_URL, {
      autoConnect: true,
      transports: ['websocket']
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      setPlayerId(socket.id || '');
      console.log('Connected to server:', socket.id);
      // Thử vào lại phòng cũ nếu còn token (reconnect sau khi rớt mạng / reload)
      try {
        const token = localStorage.getItem('ctp_token');
        if (token) socket.emit('rejoin', { playerToken: token });
      } catch { /* ignore */ }
    });

    socket.on('disconnect', () => {
      setConnected(false);
      console.log('Disconnected from server');
    });

    // 1. Tạo phòng thành công
    socket.on('room_created', ({ roomCode, playerId, playerToken }) => {
      setRoomCode(roomCode);
      setPlayerId(playerId);
      if (playerToken) {
        setPlayerToken(playerToken);
        try { localStorage.setItem('ctp_token', playerToken); localStorage.setItem('ctp_room', roomCode); } catch { /* ignore */ }
      }
      setErrorMsg(null);
    });

    // 2. Tham gia phòng thành công
    socket.on('room_joined', ({ roomCode, playerId, players, playerToken }) => {
      setRoomCode(roomCode);
      setPlayerId(playerId);
      setPlayers(players);
      if (playerToken) {
        setPlayerToken(playerToken);
        try { localStorage.setItem('ctp_token', playerToken); localStorage.setItem('ctp_room', roomCode); } catch { /* ignore */ }
      }
      setErrorMsg(null);
    });

    // 3. Cập nhật danh sách người chờ trong phòng
    socket.on('room_state_update', ({ players, hostId, gameStarted, settings }) => {
      setPlayers(players);
      setHostId(hostId);
      setGameStarted(gameStarted);
      if (settings) setRoomSettings(settings);
    });

    // 4. Báo game bắt đầu
    socket.on('game_started', ({ gameState }) => {
      setGameState(gameState);
      setGameStarted(true);
      setChats([]); // reset chat khi bắt đầu
      playCoinsSound();
    });

    // 5. Cập nhật trạng thái trận đấu
    socket.on('game_state_update', ({ gameState }) => {
      setGameState(gameState);
      
      // Phân tích dòng nhật ký cuối cùng để phát âm thanh tương ứng
      if (gameState.logs && gameState.logs.length > 0) {
        const lastLog = gameState.logs[gameState.logs.length - 1];
        if (lastLog.includes('đổ được') || lastLog.includes('đổ xúc xắc')) {
          playDiceSound();
        } else if (lastLog.includes('đã mua') || lastLog.includes('nâng cấp') || lastLog.includes('nhận $')) {
          playCoinsSound();
        } else if (lastLog.includes('phải trả') || lastLog.includes('đã trả') || lastLog.includes('thanh toán') || lastLog.includes('nộp phạt') || lastLog.includes('đóng thuế')) {
          playPaySound();
        } else if (lastLog.includes('PHÁ SẢN')) {
          playSadSound();
        }
      }
    });

    // 6. Nhận tin nhắn chat
    socket.on('chat_message', (chat: ChatMessage) => {
      setChats((prev) => [...prev, chat]);
    });

    // 7. Khi chủ phòng restart game
    socket.on('game_restarted', () => {
      setGameState(null);
      setGameStarted(false);
    });

    // 7b. Vào lại phòng sau khi rớt mạng
    socket.on('rejoined', ({ roomCode, playerId, players, gameState }) => {
      setRoomCode(roomCode);
      setPlayerId(playerId);
      setPlayers(players);
      if (gameState) {
        setGameState(gameState);
        setGameStarted(true);
      }
      setErrorMsg(null);
    });

    // 8. Nhận thông báo lỗi
    socket.on('error_message', ({ message }) => {
      setErrorMsg(message);
      // Tự động ẩn lỗi sau 5 giây
      setTimeout(() => {
        setErrorMsg((prev) => (prev === message ? null : prev));
      }, 5000);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Emitters
  const createRoom = (playerName: string) => {
    playClickSound();
    socketRef.current?.emit('create_room', { playerName });
  };

  const joinRoom = (roomCode: string, playerName: string) => {
    playClickSound();
    socketRef.current?.emit('join_room', { roomCode, playerName });
  };

  const startGame = () => {
    if (roomCode) {
      playClickSound();
      socketRef.current?.emit('start_game', { roomCode });
    }
  };

  const rollDice = () => {
    if (roomCode) {
      playClickSound();
      socketRef.current?.emit('roll_dice', { roomCode });
    }
  };

  const buyProperty = () => {
    if (roomCode) {
      playClickSound();
      socketRef.current?.emit('buy_property', { roomCode });
    }
  };

  const buildHouse = (tileId: number) => {
    if (roomCode) {
      playClickSound();
      socketRef.current?.emit('build_house', { roomCode, tileId });
    }
  };

  const endTurn = () => {
    if (roomCode) {
      playClickSound();
      socketRef.current?.emit('end_turn', { roomCode });
    }
  };

  const declareBankruptcy = () => {
    if (roomCode) {
      playSadSound();
      socketRef.current?.emit('declare_bankruptcy', { roomCode });
    }
  };

  const sendChat = (message: string) => {
    if (roomCode && message.trim()) {
      playClickSound();
      socketRef.current?.emit('send_chat', { roomCode, message });
    }
  };

  const restartGame = () => {
    if (roomCode) {
      playClickSound();
      socketRef.current?.emit('restart_game', { roomCode });
    }
  };

  const upgradeHotel = () => {
    if (roomCode) {
      playClickSound();
      socketRef.current?.emit('upgrade_hotel', { roomCode });
    }
  };

  const passUpgradeHotel = () => {
    if (roomCode) {
      playClickSound();
      socketRef.current?.emit('pass_upgrade_hotel', { roomCode });
    }
  };

  const goChooseBonus = (choiceType: 'money' | 'upgrade', tileId?: number) => {
    if (roomCode) {
      playClickSound();
      socketRef.current?.emit('go_choose_bonus', { roomCode, choiceType, tileId });
    }
  };

  // ---- WS-2: cơ chế mới ----
  const emit = (event: string, payload: Record<string, unknown> = {}) => {
    if (!roomCode) return;
    playClickSound();
    socketRef.current?.emit(event, { roomCode, ...payload });
  };

  const sellHouse = (tileId: number) => emit('sell_house', { tileId });
  const mortgageTile = (tileId: number) => emit('mortgage_tile', { tileId });
  const unmortgageTile = (tileId: number) => emit('unmortgage_tile', { tileId });
  const sellDeed = (tileId: number) => emit('sell_deed', { tileId });
  const jailAction = (method: 'pay' | 'use_card') => emit('jail_action', { method });
  const settleFunds = () => emit('settle_funds');
  const declineBuy = () => emit('decline_buy');
  const finishBuild = () => emit('finish_build');
  const updateRoomSettings = (settings: Partial<RoomSettings>) => emit('update_room_settings', { settings });
  const selectSkin = (tokenSkin: string) => emit('select_skin', { tokenSkin });

  const clearError = () => {
    setErrorMsg(null);
  };

  return {
    connected,
    playerId,
    roomCode,
    players,
    hostId,
    gameStarted,
    gameState,
    chats,
    errorMsg,
    createRoom,
    joinRoom,
    startGame,
    rollDice,
    buyProperty,
    buildHouse,
    endTurn,
    declareBankruptcy,
    sendChat,
    restartGame,
    upgradeHotel,
    passUpgradeHotel,
    goChooseBonus,
    clearError,
    // WS-2 additions
    playerToken,
    roomSettings,
    sellHouse,
    mortgageTile,
    unmortgageTile,
    sellDeed,
    jailAction,
    settleFunds,
    declineBuy,
    finishBuild,
    updateRoomSettings,
    selectSkin,
  };
}
