// ============================================================
// Mirror of backend/src/game/types.ts — giữ đồng bộ với server.
// ============================================================

export type GroupId =
  | 'brown'
  | 'light_blue'
  | 'pink'
  | 'orange'
  | 'red'
  | 'yellow'
  | 'green'
  | 'dark_blue';

export interface Player {
  id: string;
  name: string;
  money: number;
  position: number;
  isBankrupt: boolean;
  inJail: boolean;
  jailTurns: number;
  color: string;
  getOutOfJailCards: number;
  tokenSkin: string;
}

export type TileType =
  | 'go'
  | 'property'
  | 'railroad'
  | 'utility'
  | 'tax'
  | 'jail'
  | 'go_to_jail'
  | 'chance'
  | 'community_chest'
  | 'parking';

export interface TileMetadata {
  id: number;
  name: string;
  type: TileType;
  price?: number;
  rent?: number[];
  housePrice?: number;
  group: string;
  description?: string;
}

export interface TileState {
  id: number;
  ownerId: string | null;
  houses: number;
  hotel: boolean;
  mortgaged: boolean;
  ownerVisits: number;
}

export interface PendingPayment {
  fromPlayerId: string;
  toPlayerId: string | 'bank';
  amount: number;
  purpose: 'rent' | 'tax' | 'jail_fine' | 'other';
}

// ---- Thẻ bài ----
export type CardEffectKind =
  | 'money'
  | 'moneyPerPlayer'
  | 'moveTo'
  | 'moveBy'
  | 'goToJail'
  | 'getOutOfJail'
  | 'repairs'
  | 'advanceToGo'
  | 'nearest';

export interface CardEffect {
  kind: CardEffectKind;
  amount?: number;
  perHotel?: number;
  target?: number;
  nearest?: 'railroad' | 'utility';
  grantGo?: boolean;
}

export interface Card {
  id: string;
  text: string;
  effect: CardEffect;
}

export interface PendingLanding {
  kind: 'pay_rent' | 'pay_tax' | 'card' | 'go_to_jail';
  tileId?: number;
  amount?: number;
  ownerId?: string;
  card?: {
    type: 'chance' | 'community_chest';
    text: string;
    effect: CardEffect;
  };
}

// ---- Cấu hình phòng ----
export type GameMode = 'classic' | 'fast' | 'chaos';
export interface HouseRules {
  freeParkingJackpot: boolean;
  doubleGo: boolean;
  turnTimerSec: number | null;
  allowJailDoublesContinue: boolean;
  sellDeedOutright: boolean;
}
export interface RoomSettings {
  startingMoney: number;
  gameMode: GameMode;
  houseRules: HouseRules;
  boardSkin: string;
  diceSkin: string;
}

export type ModalType =
  | 'buy_property'
  | 'pay_rent'
  | 'pay_tax'
  | 'chance'
  | 'community_chest'
  | 'jail'
  | 'bankruptcy'
  | 'upgrade_hotel'
  | 'go_landing'
  | 'build_houses'
  | 'mortgage'
  | null;

export interface ModalPayload {
  tileId?: number;
  amount?: number;
  ownerId?: string;
  cardText?: string;
  toPlayerId?: string | 'bank';
}

export type ActionRequired =
  | 'none'
  | 'buy_or_pass'
  | 'pay_rent'
  | 'pay_tax'
  | 'draw_card'
  | 'go_to_jail'
  | 'bankruptcy_decision'
  | 'upgrade_hotel_decision'
  | 'go_landing_decision'
  | 'jail_options'
  | 'must_raise_funds';

export interface GameState {
  roomCode: string;
  players: Player[];
  tiles: TileState[];
  activePlayerIndex: number;
  dice: [number, number];
  diceRolled: boolean;
  hasMoved: boolean;
  currentActionRequired: ActionRequired;
  pendingPayment: PendingPayment | null;
  winnerId: string | null;
  logs: string[];
  activeCard: {
    type: 'chance' | 'community_chest';
    text: string;
  } | null;
  activeModal: ModalType;
  modalPayload: ModalPayload | null;
  pendingLanding: PendingLanding | null;
  settings: RoomSettings;
  freeParkingPot: number;
  rolledDoubles: boolean;
  doublesCount: number;
  turnDeadline: number | null;
}

export interface ChatMessage {
  sender: string;
  message: string;
  timestamp: string;
}
