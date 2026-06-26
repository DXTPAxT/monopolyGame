import { useState } from 'react';
import { Briefcase, Home, Banknote, Lock, Unlock, ChevronDown, BadgeDollarSign } from 'lucide-react';
import type { GameState } from '../../types/game';
import { netWorth, myProperties, currentRent } from '../../hooks/useGameSelectors';
import { formatMoney, buildingLabel } from '../../utils/format';

interface PortfolioPanelProps {
  gameState: GameState;
  playerId: string;
  isMyTurn: boolean;
  buildHouse?: (tileId: number) => void;
  sellHouse: (tileId: number) => void;
  mortgageTile: (tileId: number) => void;
  unmortgageTile: (tileId: number) => void;
  sellDeed: (tileId: number) => void;
  visualMoney?: number;
}

const GROUP_DOT: Record<string, string> = {
  brown: 'bg-amber-700', light_blue: 'bg-sky-400', pink: 'bg-pink-400',
  orange: 'bg-orange-500', red: 'bg-red-500', yellow: 'bg-yellow-400',
  green: 'bg-emerald-500', dark_blue: 'bg-blue-700', railroad: 'bg-slate-500', utility: 'bg-teal-500',
};

export function PortfolioPanel({
  gameState, playerId, isMyTurn, sellHouse, mortgageTile, unmortgageTile, sellDeed, visualMoney,
}: PortfolioPanelProps) {
  const [open, setOpen] = useState(true);
  const me = gameState.players.find((p) => p.id === playerId);
  if (!me) return null;

  const sellDeedMode = gameState.settings.houseRules.sellDeedOutright;

  const props = myProperties(gameState, playerId);
  const worth = netWorth(gameState, playerId);

  const displayMoney = visualMoney !== undefined ? visualMoney : me.money;
  const displayWorth = worth - me.money + displayMoney;

  return (
    <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-3 flex flex-col gap-2 shadow-lg">
      {/* Header: tiền mặt + tổng tài sản */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? 'Thu gọn tài sản của tôi' : 'Mở rộng tài sản của tôi'}
        className="flex items-center justify-between w-full text-left"
      >
        <span className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <Briefcase size={16} className="text-indigo-400" aria-hidden="true" /> Tài sản của tôi
        </span>
        <ChevronDown size={16} className={`text-slate-500 transition-transform ${open ? '' : '-rotate-90'}`} aria-hidden="true" />
      </button>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-slate-950/50 border border-slate-800 rounded-xl px-3 py-2">
          <div className="text-[11px] text-slate-500 font-semibold uppercase tracking-wide">Tiền mặt</div>
          <div className="text-base font-black text-amber-400 font-mono">{formatMoney(displayMoney)}</div>
        </div>
        <div className="bg-slate-950/50 border border-slate-800 rounded-xl px-3 py-2">
          <div className="text-[11px] text-slate-500 font-semibold uppercase tracking-wide">Tổng tài sản</div>
          <div className="text-base font-black text-emerald-400 font-mono">{formatMoney(displayWorth)}</div>
        </div>
      </div>

      {me.getOutOfJailCards > 0 && (
        <div className="text-xs text-amber-300 font-semibold bg-amber-950/30 border border-amber-800/40 rounded-lg px-2.5 py-1.5">
          <span aria-hidden="true">🎟️</span> Thẻ Ra Tù Miễn Phí: {me.getOutOfJailCards}
        </div>
      )}

      {open && (
        <div className="flex flex-col gap-1.5 max-h-[280px] overflow-y-auto pr-1">
          {props.length === 0 && (
            <div className="text-xs text-slate-500 text-center py-3 font-medium">Chưa sở hữu tài sản nào.</div>
          )}

          {props.map(({ meta, state }) => {
            const isProperty = meta.type === 'property';
            const sellable = isMyTurn && isProperty && (state.houses > 0 || state.hotel);
            const canMortgage = isMyTurn && !state.mortgaged && state.houses === 0 && !state.hotel;
            const canUnmortgage = isMyTurn && state.mortgaged;
            const rent = currentRent(gameState, meta.id);

            return (
              <div
                key={meta.id}
                className={`rounded-xl border p-2 ${state.mortgaged ? 'border-rose-900/50 bg-rose-950/20' : 'border-slate-800 bg-slate-950/40'}`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-sm shrink-0 ${GROUP_DOT[meta.group] || 'bg-slate-500'}`} />
                  <span className="text-xs font-bold text-slate-200 truncate flex-1">{meta.name}</span>
                  <span className="text-[11px] font-mono text-slate-400">Thuê {formatMoney(rent)}</span>
                </div>

                <div className="flex items-center justify-between mt-1 pl-4.5">
                  <span className="text-[11px] text-slate-400 font-medium">
                    {isProperty ? buildingLabel(state.houses, state.hotel) : meta.type === 'railroad' ? <><span aria-hidden="true">🚉</span> Nhà ga</> : <><span aria-hidden="true">💡</span> Tiện ích</>}
                    {state.mortgaged && <span className="text-rose-400 font-bold ml-1">• Đang cầm cố</span>}
                  </span>
                </div>

                {/* Nút quản lý */}
                {isMyTurn && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {sellable && (
                      <button onClick={() => sellHouse(meta.id)}
                        aria-label={`Bán nhà trên ${meta.name}`}
                        className="flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg bg-orange-600/20 text-orange-300 border border-orange-600/30 hover:bg-orange-600/30 transition">
                        <Home size={11} aria-hidden="true" /> Bán nhà
                      </button>
                    )}

                    {/* Chế độ bán đứt sổ đỏ (80%, không chuộc) thay cho cầm cố/chuộc */}
                    {sellDeedMode ? (
                      <button
                        onClick={() => {
                          if (window.confirm(`Bán đứt "${meta.name}"? Bạn sẽ nhận 80% giá trị và KHÔNG chuộc lại được.`)) {
                            sellDeed(meta.id);
                          }
                        }}
                        aria-label={`Bán đứt ${meta.name}`}
                        className="flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg bg-rose-600/20 text-rose-300 border border-rose-600/30 hover:bg-rose-600/30 transition">
                        <BadgeDollarSign size={11} aria-hidden="true" /> Bán đứt
                      </button>
                    ) : (
                      <>
                        {canMortgage && (
                          <button onClick={() => mortgageTile(meta.id)}
                            aria-label={`Cầm cố ${meta.name}`}
                            className="flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg bg-slate-700/40 text-slate-300 border border-slate-600/40 hover:bg-slate-700/60 transition">
                            <Lock size={11} aria-hidden="true" /> Cầm cố
                          </button>
                        )}
                        {canUnmortgage && (
                          <button onClick={() => unmortgageTile(meta.id)}
                            aria-label={`Chuộc lại ${meta.name}`}
                            className="flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg bg-sky-600/20 text-sky-300 border border-sky-600/30 hover:bg-sky-600/30 transition">
                            <Unlock size={11} aria-hidden="true" /> Chuộc
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!isMyTurn && props.length > 0 && (
        <div className="text-[11px] text-slate-500 text-center flex items-center justify-center gap-1 font-medium">
          <Banknote size={12} aria-hidden="true" /> Quản lý tài sản trong lượt của bạn
        </div>
      )}
    </div>
  );
}
