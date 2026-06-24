export function generateRoomCode(length: number = 4): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function rollDice(): [number, number] {
  const d1 = Math.floor(Math.random() * 6) + 1;
  const d2 = Math.floor(Math.random() * 6) + 1;
  return [d1, d2];
}

const PLAYER_COLORS = [
  '#ef4444', // Đỏ (Red-500)
  '#3b82f6', // Xanh dương (Blue-500)
  '#10b981', // Xanh lá (Emerald-500)
  '#f59e0b', // Vàng cam (Amber-500)
  '#8b5cf6', // Tím (Violet-500)
  '#f97316'  // Cam (Orange-500)
];

export function getPlayerColor(index: number): string {
  return PLAYER_COLORS[index % PLAYER_COLORS.length];
}
