import { Crown, RotateCcw, Trophy } from 'lucide-react';
import type { GameState } from '../../types/game';
import { netWorth } from '../../hooks/useGameSelectors';
import { formatMoney } from '../../utils/format';

interface WinnerModalProps {
  gameState: GameState;
  isHost: boolean;
  restartGame: () => void;
}

export function WinnerModal({ gameState, isHost, restartGame }: WinnerModalProps) {
  if (!gameState.winnerId) return null;
  const winner = gameState.players.find((p) => p.id === gameState.winnerId);

  const ranking = [...gameState.players]
    .map((p) => ({ p, worth: p.isBankrupt ? 0 : netWorth(gameState, p.id) }))
    .sort((a, b) => {
      if (a.p.isBankrupt && !b.p.isBankrupt) return 1;
      if (!a.p.isBankrupt && b.p.isBankrupt) return -1;
      return b.worth - a.worth;
    });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-fadeIn">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="winner-modal-title"
        className="w-[92vw] max-w-md bg-gradient-to-b from-slate-900 to-slate-950 border border-amber-500/30 rounded-3xl p-4 md:p-7 shadow-2xl text-center max-h-[85vh] overflow-y-auto"
      >
        <div className="flex justify-center mb-3">
          <Trophy size={56} className="text-amber-400 drop-shadow-[0_0_18px_rgba(251,191,36,0.6)] animate-bounce-slow" aria-hidden="true" />
        </div>
        <h2 id="winner-modal-title" className="text-sm font-bold uppercase tracking-widest text-slate-400">Chiến thắng chung cuộc</h2>
        <p className="text-3xl font-black bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent mt-1 mb-5">
          {winner?.name || '—'}
        </p>

        <div className="space-y-2 text-left mb-6">
          {ranking.map((r, i) => (
            <div
              key={r.p.id}
              className={`flex items-center justify-between rounded-xl px-3 py-2 border ${
                i === 0 ? 'bg-amber-500/10 border-amber-500/30' : 'bg-slate-900/60 border-slate-800'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-black font-mono text-slate-500 w-5">{i + 1}</span>
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: r.p.color }} />
                <span className={`text-sm font-bold truncate ${i === 0 ? 'text-amber-300' : 'text-slate-300'}`}>
                  {r.p.name}
                </span>
                {i === 0 && <Crown size={14} className="text-amber-400 shrink-0" aria-hidden="true" />}
                {r.p.isBankrupt && <span className="text-[11px] text-red-400 font-bold">phá sản</span>}
              </div>
              <span className="text-sm font-mono font-bold text-emerald-400">{formatMoney(r.worth)}</span>
            </div>
          ))}
        </div>

        {isHost ? (
          <button
            onClick={restartGame}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-white font-black py-3 rounded-2xl text-sm uppercase tracking-wider transition active:scale-[0.98] shadow-lg min-h-[48px]"
          >
            <RotateCcw size={16} aria-hidden="true" /> Chơi lại trận mới
          </button>
        ) : (
          <p className="text-sm text-slate-500 font-medium">Đang chờ chủ phòng bắt đầu ván mới…</p>
        )}
      </div>
    </div>
  );
}
