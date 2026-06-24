// Cosmetic skins (chọn ở lobby). Token = quân cờ, board/dice theme.
export interface TokenSkin { id: string; emoji: string; name: string; }

export const TOKEN_SKINS: TokenSkin[] = [
  { id: 'motorbike', emoji: '🛵', name: 'Xe máy' },
  { id: 'car', emoji: '🚗', name: 'Ô tô' },
  { id: 'dragon', emoji: '🐉', name: 'Rồng' },
  { id: 'pho', emoji: '🍜', name: 'Tô phở' },
  { id: 'coconut', emoji: '🥥', name: 'Dừa' },
  { id: 'tiger', emoji: '🐯', name: 'Hổ' },
  { id: 'hat', emoji: '👒', name: 'Nón' },
  { id: 'rocket', emoji: '🚀', name: 'Phi thuyền' },
];

export const DEFAULT_TOKEN_SKIN = 'motorbike';

export function tokenEmoji(skinId: string): string {
  return TOKEN_SKINS.find((s) => s.id === skinId)?.emoji ?? '🎲';
}

export const BOARD_SKINS = [
  { id: 'neon', name: 'Neon Casino' },
  { id: 'classic', name: 'Cổ điển' },
  { id: 'tet', name: 'Tết Việt Nam' },
];

export const DICE_SKINS = [
  { id: 'neon', name: 'Neon' },
  { id: 'jade', name: 'Ngọc' },
  { id: 'wood', name: 'Gỗ' },
];
