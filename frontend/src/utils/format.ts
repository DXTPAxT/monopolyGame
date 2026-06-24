export function formatMoney(n: number): string {
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

// Nhãn cấp công trình theo bậc (cosmetic)
export function buildingLabel(houses: number, hotel: boolean): string {
  if (hotel) return '🏨 Khách sạn';
  const icons = ['Đất trống', '🏠 1 nhà', '🏘️ 2 nhà', '🏘️ 3 nhà', '🏢 4 nhà'];
  return icons[houses] || `${houses} nhà`;
}
