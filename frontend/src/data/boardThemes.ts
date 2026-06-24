// Theme bàn cờ — đổi đồng bộ nền ngoài, khung bàn, khu trung tâm, và nền/viền/chữ
// của TỪNG ô cờ. Dải màu nhóm đất (brown/blue/pink…) GIỮ NGUYÊN vì là tín hiệu chức năng.
export interface BoardTheme {
  id: string;
  /** Gradient nền radial phía sau bàn (stops của Tailwind, dùng ở App.tsx) */
  appBg: string;
  /** Khung lưới bàn cờ (bg + border) */
  frame: string;
  /** Khu trung tâm "sân khấu" (bg + border) */
  center: string;
  /** Nền ô cờ thường (property/blank chưa tint đặc biệt) */
  cellBg: string;
  /** Viền ô cờ thường */
  cellBorder: string;
  /** Màu chữ tên ô */
  cellText: string;
}

export const BOARD_THEMES: Record<string, BoardTheme> = {
  // Neon Casino — tối, ánh xanh cyan/indigo (mặc định gốc)
  neon: {
    id: 'neon',
    appBg: 'from-indigo-950/20 via-slate-900/40 to-slate-950',
    frame: 'bg-slate-950 border-slate-800/40',
    center: 'bg-slate-950/50 border-slate-900/50',
    cellBg: 'bg-slate-900',
    cellBorder: 'border-slate-800/80',
    cellText: 'text-slate-200',
  },
  // Cổ điển — mặt nỉ xanh sòng bài, chữ kem
  classic: {
    id: 'classic',
    appBg: 'from-emerald-800/30 via-emerald-950/50 to-slate-950',
    frame: 'bg-emerald-950 border-emerald-700/40',
    center: 'bg-emerald-950/70 border-emerald-800/50',
    cellBg: 'bg-emerald-950/85',
    cellBorder: 'border-emerald-800/50',
    cellText: 'text-emerald-50',
  },
  // Tết Việt Nam — đỏ thắm, viền vàng kim, chữ vàng nhạt
  tet: {
    id: 'tet',
    appBg: 'from-red-800/30 via-red-950/50 to-slate-950',
    frame: 'bg-red-950 border-amber-600/40',
    center: 'bg-red-950/70 border-amber-700/40',
    cellBg: 'bg-red-950/85',
    cellBorder: 'border-amber-800/40',
    cellText: 'text-amber-50',
  },
};

export const DEFAULT_BOARD_THEME = 'neon';

export function getBoardTheme(id?: string): BoardTheme {
  return BOARD_THEMES[id || ''] || BOARD_THEMES[DEFAULT_BOARD_THEME];
}
