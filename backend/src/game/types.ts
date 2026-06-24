// ============================================================
// Mô hình dữ liệu Cờ Tỷ Phú — mở rộng theo spec
// docs/specs/2026-06-22-upgrade-design.md §3
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
  id: string;          // Socket ID của người chơi
  name: string;        // Tên hiển thị
  money: number;       // Số tiền mặt hiện tại
  position: number;    // Vị trí trên bàn cờ (0 - 39)
  isBankrupt: boolean; // Đã bị phá sản chưa
  inJail: boolean;     // Có đang ở tù không
  jailTurns: number;   // Số lượt đã ở trong tù
  color: string;       // Màu sắc đại diện
  getOutOfJailCards: number; // Số thẻ "Ra Tù Miễn Phí" đang giữ
  tokenSkin: string;   // Id skin quân cờ (cosmetic)
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
  price?: number;         // Giá mua (đất/nhà ga/tiện ích)
  rent?: number[];        // [trống, 1 nhà, 2 nhà, 3 nhà, 4 nhà, khách sạn] hoặc hệ số
  housePrice?: number;    // Giá nâng cấp nhà
  group: string;          // Nhóm màu hoặc đặc biệt (railroad/utility/special)
  description?: string;
}

export interface TileState {
  id: number;
  ownerId: string | null; // ID người chơi sở hữu
  houses: number;         // Số nhà đã xây (0-4)
  hotel: boolean;         // true = khách sạn (thay cho 4 nhà)
  mortgaged: boolean;     // Đang bị cầm cố
  ownerVisits: number;    // Số lần chủ hiện tại đã "ghé" ô (mua=1, mỗi lần đáp lại +1). Khách sạn cần >=2.
}

export interface PendingPayment {
  fromPlayerId: string;
  toPlayerId: string | 'bank'; // ID người chơi nhận hoặc 'bank'
  amount: number;
  purpose: 'rent' | 'tax' | 'jail_fine' | 'other';
}

// ---- Thẻ bài (data-driven) ----
export type CardEffectKind =
  | 'money'          // ±amount với ngân hàng
  | 'moneyPerPlayer' // nhận/trả amount với mỗi người chơi khác
  | 'moveTo'         // đi tới ô target (qua GO nhận $200 trừ khi cấm)
  | 'moveBy'         // di chuyển amount ô (âm = lùi)
  | 'goToJail'       // vào tù, không nhận $200
  | 'getOutOfJail'   // nhận 1 thẻ ra tù
  | 'repairs'        // trả amount/nhà + perHotel/khách sạn
  | 'advanceToGo'    // tiến tới GO, nhận $200
  | 'nearest';       // tới ga/tiện ích gần nhất

export interface CardEffect {
  kind: CardEffectKind;
  amount?: number;
  perHotel?: number;
  target?: number;                    // tile id cho moveTo
  nearest?: 'railroad' | 'utility';
  grantGo?: boolean;                  // moveTo có cho qua-GO không (mặc định true)
}

export interface Card {
  id: string;
  text: string;
  effect: CardEffect;
}

// ---- Cấu hình phòng ----
export type GameMode = 'classic' | 'fast' | 'chaos';
export interface HouseRules {
  freeParkingJackpot: boolean;
  doubleGo: boolean;
  turnTimerSec: number | null; // null = tắt
  allowJailDoublesContinue: boolean; // true = ra tù bằng đôi vẫn được tung lại (house rule, mặc định false = luật chuẩn)
  sellDeedOutright: boolean;         // true = bán đứt sổ đỏ (80%, không chuộc) thay cho cầm cố
}
export interface RoomSettings {
  startingMoney: number;
  gameMode: GameMode;
  houseRules: HouseRules;
  boardSkin: string;  // 'neon' | 'classic' | 'tet'
  diceSkin: string;   // 'neon' | 'jade' | 'wood'
}

export const DEFAULT_ROOM_SETTINGS: RoomSettings = {
  startingMoney: 2000,
  gameMode: 'classic',
  houseRules: {
    freeParkingJackpot: false,
    doubleGo: false,
    turnTimerSec: null,
    allowJailDoublesContinue: false,
    sellDeedOutright: false,
  },
  boardSkin: 'neon',
  diceSkin: 'neon',
};

export type ModalType =
  | 'buy_property'
  | 'pay_rent'
  | 'pay_tax'
  | 'chance'
  | 'community_chest'
  | 'jail'
  | 'bankruptcy'
  | 'upgrade_hotel'
  | 'build_houses'
  | 'go_landing'
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

  // ---- mở rộng ----
  settings: RoomSettings;
  freeParkingPot: number;
  rolledDoubles: boolean;   // lần tung hiện tại có phải đôi
  doublesCount: number;     // chuỗi đôi trong lượt hiện tại
  turnDeadline: number | null; // epoch ms nếu bật timer
}

export interface ChatMessage {
  sender: string;
  message: string;
  timestamp: string;
}

export interface Room {
  roomCode: string;
  players: Player[];
  hostId: string;
  gameStarted: boolean;
  gameState: GameState | null;
  settings: RoomSettings;
}
