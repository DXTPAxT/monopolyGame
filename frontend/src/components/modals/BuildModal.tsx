import { Hammer, Check } from 'lucide-react';
import type { GameState, TileMetadata } from '../../types/game';
import boardDataRaw from '../../data/board.json';

const boardData = boardDataRaw as TileMetadata[];

interface BuildModalProps {
  tileId: number;
  gameState: GameState;
  onBuild: (tileId: number) => void;
  onDone: () => void;
}

export function BuildModal({ tileId, gameState, onBuild, onDone }: BuildModalProps) {
  const meta = boardData.find((t) => t.id === tileId);
  const tileState = gameState.tiles.find((t) => t.id === tileId);
  const activePlayer = gameState.players[gameState.activePlayerIndex];

  if (!meta || !tileState || !activePlayer) return null;

  const housePrice = meta.housePrice ?? 0;
  const isHotel = tileState.hotel;
  const houses = tileState.houses;
  const ownerVisits = tileState.ownerVisits;

  // Xác định cấp hiện tại
  const buildingLabel = isHotel
    ? 'Khách Sạn'
    : houses > 0
    ? `${houses} Nhà`
    : 'Đất trống';

  // Mức trần lần đáp này
  const ceilingLabel =
    ownerVisits >= 2
      ? 'Có thể lên Khách Sạn'
      : 'Tối đa 4 nhà (lần đầu)';

  // Nút Xây bị vô hiệu hóa khi:
  // 1. Đã có khách sạn (đạt tối đa)
  // 2. Đang có 4 nhà và ownerVisits < 2 (chưa mở khóa khách sạn)
  // 3. Không đủ tiền
  const wouldBuildHotel = houses === 4 && !isHotel;
  const buildDisabled =
    isHotel ||
    (wouldBuildHotel && ownerVisits < 2) ||
    activePlayer.money < housePrice;

  // Hiển thị lý do vô hiệu hóa
  let disabledReason = '';
  if (isHotel) {
    disabledReason = 'Đã đạt mức tối đa (Khách Sạn)';
  } else if (wouldBuildHotel && ownerVisits < 2) {
    disabledReason = 'Cần đáp lần 2 mới lên Khách Sạn được';
  } else if (activePlayer.money < housePrice) {
    disabledReason = `Không đủ tiền (thiếu $${housePrice - activePlayer.money})`;
  }

  const GROUP_COLOR: Record<string, string> = {
    brown: 'from-amber-800 to-amber-900',
    light_blue: 'from-sky-400 to-sky-500',
    pink: 'from-pink-400 to-pink-500',
    orange: 'from-orange-500 to-orange-600',
    red: 'from-red-500 to-red-600',
    yellow: 'from-yellow-400 to-yellow-500',
    green: 'from-emerald-500 to-emerald-600',
    dark_blue: 'from-blue-700 to-blue-800',
  };
  const headerGradient = GROUP_COLOR[meta.group] ?? 'from-slate-700 to-slate-800';

  return (
    <div className="w-full max-w-[420px] mx-auto bg-slate-900 border border-emerald-700/40 rounded-2xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className={`bg-gradient-to-r ${headerGradient} px-5 py-4 flex items-center gap-3 border-b border-slate-900/60`}>
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/10 border border-white/20 shrink-0">
          <Hammer className="w-5 h-5 text-white" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-white/70 uppercase tracking-widest leading-none mb-0.5">
            Xây dựng
          </p>
          <h2 className="text-sm font-bold text-white truncate">{meta.name}</h2>
        </div>
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Thông tin trạng thái */}
        <div className="bg-slate-800/60 rounded-xl p-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] text-slate-400 font-medium mb-0.5">Cấp hiện tại</p>
            <p className="text-base font-bold text-white">{buildingLabel}</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-slate-400 font-medium mb-0.5">Lần đáp này</p>
            <p className="text-xs font-bold text-emerald-400">{ceilingLabel}</p>
          </div>
        </div>

        {/* Tiền mặt */}
        <div className="text-right">
          <span className="text-[11px] text-slate-500">Tiền của bạn: </span>
          <span className="text-[11px] font-bold text-slate-300">${activePlayer.money.toLocaleString()}</span>
        </div>

        {/* Lý do vô hiệu hóa */}
        {buildDisabled && disabledReason && (
          <p className="text-[11px] text-amber-400 font-medium bg-amber-950/30 border border-amber-800/30 rounded-lg px-3 py-2">
            {disabledReason}
          </p>
        )}

        {/* Nút hành động */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={onDone}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-600 hover:border-slate-500 hover:bg-slate-700 text-xs font-bold text-slate-300 hover:text-slate-100 transition-colors"
          >
            <Check className="w-3.5 h-3.5" aria-hidden="true" />
            Xong
          </button>
          <button
            onClick={() => onBuild(tileId)}
            disabled={buildDisabled}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-xs font-bold text-white transition-colors"
          >
            <Hammer className="w-3.5 h-3.5" aria-hidden="true" />
            Xây (+${housePrice.toLocaleString()})
          </button>
        </div>

        {/* Giá nhà gợi ý */}
        <p className="text-[11px] text-slate-600 text-center">
          Giá mỗi cấp: ${housePrice.toLocaleString()} &nbsp;·&nbsp; Lần đáp thứ {ownerVisits}
        </p>
      </div>
    </div>
  );
}
