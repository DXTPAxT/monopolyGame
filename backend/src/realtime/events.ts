// ============================================================
// Socket.IO Realtime Events & Payloads — Cờ Tỷ Phú Game
// Reference: constants + payload types only (no logic)
// ============================================================

import { RoomSettings } from '../game/types';

// ============================================================
// EVENT NAMES
// ============================================================

export const EVENTS = {
  // ---- Client → Server ----
  CLIENT: {
    // Room management
    CREATE_ROOM: 'create_room',
    JOIN_ROOM: 'join_room',
    REJOIN: 'rejoin',

    // Game flow
    START_GAME: 'start_game',
    ROLL_DICE: 'roll_dice',
    END_TURN: 'end_turn',
    RESTART_GAME: 'restart_game',

    // Property actions
    BUY_PROPERTY: 'buy_property',
    BUILD_HOUSE: 'build_house',
    FINISH_BUILD: 'finish_build',
    UPGRADE_HOTEL: 'upgrade_hotel',
    PASS_UPGRADE_HOTEL: 'pass_upgrade_hotel',
    GO_CHOOSE_BONUS: 'go_choose_bonus',
    SELL_HOUSE: 'sell_house',
    MORTGAGE_TILE: 'mortgage_tile',
    UNMORTGAGE_TILE: 'unmortgage_tile',

    // Từ chối mua (không còn đấu giá)
    DECLINE_BUY: 'decline_buy',

    // Jail
    JAIL_ACTION: 'jail_action',

    // Landing confirmation
    CONFIRM_LANDING: 'confirm_landing',

    // Bankruptcy & payments
    DECLARE_BANKRUPTCY: 'declare_bankruptcy',
    SETTLE_FUNDS: 'settle_funds',

    // Customization & settings
    UPDATE_ROOM_SETTINGS: 'update_room_settings',
    SELECT_SKIN: 'select_skin',

    // Chat
    SEND_CHAT: 'send_chat',
  },

  // ---- Server → Client ----
  SERVER: {
    // Room state
    ROOM_CREATED: 'room_created',
    ROOM_JOINED: 'room_joined',
    ROOM_STATE_UPDATE: 'room_state_update',

    // Game state
    GAME_STARTED: 'game_started',
    GAME_STATE_UPDATE: 'game_state_update',
    GAME_RESTARTED: 'game_restarted',

    // Messages
    CHAT_MESSAGE: 'chat_message',
    ERROR_MESSAGE: 'error_message',

    // Timing
    TURN_TIMEOUT: 'turn_timeout',
  },
} as const;

// ============================================================
// CLIENT → SERVER PAYLOADS
// ============================================================

export interface CreateRoomPayload {
  playerName: string;
}

export interface JoinRoomPayload {
  roomCode: string;
  playerName: string;
}

export interface RejoinPayload {
  roomCode: string;
  playerToken: string;
}

export interface StartGamePayload {
  roomCode: string;
}

export interface RollDicePayload {
  roomCode: string;
}

export interface EndTurnPayload {
  roomCode: string;
}

export interface RestartGamePayload {
  roomCode: string;
}

export interface BuyPropertyPayload {
  roomCode: string;
}

export interface BuildHousePayload {
  roomCode: string;
  tileId: number;
}

export interface UpgradeHotelPayload {
  roomCode: string;
}

export interface PassUpgradeHotelPayload {
  roomCode: string;
}

export interface GoChooseBonusPayload {
  roomCode: string;
  choiceType: string;
  tileId: number;
}

export interface SellHousePayload {
  roomCode: string;
  tileId: number;
}

export interface MortgagePayload {
  roomCode: string;
  tileId: number;
}

export interface UnmortgagePayload {
  roomCode: string;
  tileId: number;
}

export interface DeclineBuyPayload {
  roomCode: string;
}

export interface FinishBuildPayload {
  roomCode: string;
}

export interface JailActionPayload {
  roomCode: string;
  method: 'pay' | 'use_card';
}

export interface DeclareBankruptcyPayload {
  roomCode: string;
}

export interface SettleFundsPayload {
  roomCode: string;
  amount: number;
}

export interface UpdateRoomSettingsPayload {
  roomCode: string;
  settings: Partial<RoomSettings>;
}

export interface SelectSkinPayload {
  roomCode: string;
  tokenSkin: string;
}

export interface SendChatPayload {
  roomCode: string;
  message: string;
}

export interface ConfirmLandingPayload {
  roomCode: string;
}

// ============================================================
// SERVER → CLIENT PAYLOADS
// ============================================================

export interface RoomCreatedPayload {
  roomCode: string;
  playerId: string;
}

export interface RoomJoinedPayload {
  roomCode: string;
  playerId: string;
  players: any[];
}

export interface RoomStateUpdatePayload {
  players: any[];
  hostId: string;
  gameStarted: boolean;
}

export interface GameStartedPayload {
  gameState: any;
}

export interface GameStateUpdatePayload {
  gameState: any;
  lastEvent: string;
}

export interface ChatMessagePayload {
  sender: string;
  message: string;
  timestamp: string;
}

export interface ErrorMessagePayload {
  message: string;
}

export interface TurnTimeoutPayload {
  playerName: string;
  secondsRemaining: number;
}
