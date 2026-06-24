import { Dice5, ArrowRight, Skull, RotateCcw, KeyRound, Ticket, Banknote } from 'lucide-react';
import type { PendingPayment, ActionRequired } from '../types/game';

interface CenterStageControlsProps {
  isMyTurn: boolean;
  currentActionRequired: ActionRequired;
  diceRolled: boolean;
  pendingPayment: PendingPayment | null;
  winnerId: string | null;
  isHost: boolean;
  inJail: boolean;
  hasJailCard: boolean;
  rollDice: () => void;
  buyProperty: () => void;
  endTurn: () => void;
  declareBankruptcy: () => void;
  restartGame: () => void;
  jailAction: (method: 'pay' | 'use_card') => void;
  settleFunds: () => void;
}

export function CenterStageControls({
  isMyTurn,
  currentActionRequired,
  diceRolled,
  pendingPayment,
  winnerId,
  isHost,
  inJail,
  hasJailCard,
  rollDice,
  endTurn,
  declareBankruptcy,
  restartGame,
  jailAction,
  settleFunds,
}: CenterStageControlsProps) {
  
  // 1. Nếu có người thắng cuộc
  if (winnerId) {
    return (
      <div className="flex flex-col items-center gap-2 w-full max-w-[240px]">
        {isHost ? (
          <button
            onClick={restartGame}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-600 hover:from-yellow-450 hover:to-yellow-550 border border-yellow-400/30 text-white font-black py-3 px-8 rounded-full shadow-[0_5px_15px_rgba(245,158,11,0.35)] hover:shadow-[0_5px_22px_rgba(245,158,11,0.5)] transition-all active:scale-95 text-[10px] uppercase tracking-widest"
          >
            <RotateCcw size={14} className="animate-spin-slow" aria-hidden="true" /> Chơi Lại Trận Mới
          </button>
        ) : (
          <div className="w-full bg-slate-900/80 border border-slate-800/80 backdrop-blur-md py-3 px-6 rounded-full text-center text-slate-500 text-[10px] font-black uppercase tracking-widest shadow-lg">
            Đang chờ bắt đầu ván mới...
          </div>
        )}
      </div>
    );
  }

  // 2. Nếu không phải lượt của mình
  if (!isMyTurn) {
    return (
      <div className="w-full bg-slate-900/70 border border-slate-850 backdrop-blur-md px-6 py-3 rounded-full text-center text-slate-500 text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center justify-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-ping" />
        Đang chờ đối thủ...
      </div>
    );
  }

  // 3. Trong lượt của mình
  return (
    <div className="flex flex-col gap-2 w-full max-w-[240px]">
      {/* Lựa chọn ra tù (đầu lượt khi đang ở tù) */}
      {inJail && !diceRolled && (
        <div className="flex flex-col gap-1.5 w-full bg-slate-900/60 border border-slate-700/50 rounded-2xl p-2">
          <p className="text-[11px] text-slate-400 font-bold text-center">Bạn đang ở tù — chọn cách ra:</p>
          <div className="flex gap-1.5">
            <button
              onClick={() => jailAction('pay')}
              className="flex-1 flex items-center justify-center gap-1 bg-amber-600/20 text-amber-300 border border-amber-600/30 hover:bg-amber-600/30 font-bold py-2 rounded-xl text-xs transition"
            >
              <KeyRound size={13} aria-hidden="true" /> Trả $50
            </button>
            {hasJailCard && (
              <button
                onClick={() => jailAction('use_card')}
                className="flex-1 flex items-center justify-center gap-1 bg-emerald-600/20 text-emerald-300 border border-emerald-600/30 hover:bg-emerald-600/30 font-bold py-2 rounded-xl text-xs transition"
              >
                <Ticket size={13} aria-hidden="true" /> Dùng thẻ
              </button>
            )}
          </div>
          <p className="text-[10px] text-slate-500 text-center">…hoặc đổ xúc xắc thử ra đôi</p>
        </div>
      )}

      {/* Gom tiền trả nợ */}
      {currentActionRequired === 'must_raise_funds' && (
        <div className="flex flex-col gap-1.5 w-full bg-amber-950/30 border border-amber-700/40 rounded-2xl p-2.5">
          <p className="text-[11px] text-amber-300 font-bold text-center leading-snug">
            Thiếu tiền! Bán nhà / cầm cố đất ở panel "Tài sản của tôi" rồi bấm thanh toán.
          </p>
          <button
            onClick={settleFunds}
            className="w-full flex items-center justify-center gap-1.5 bg-emerald-600/30 text-emerald-200 border border-emerald-500/40 hover:bg-emerald-600/40 font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider transition"
          >
            <Banknote size={14} aria-hidden="true" /> Thanh toán nợ
          </button>
          <button
            onClick={declareBankruptcy}
            className="w-full flex items-center justify-center gap-1 text-rose-400 hover:text-rose-300 font-bold py-1 rounded-xl text-[11px] transition"
          >
            <Skull size={12} aria-hidden="true" /> Hoặc tuyên bố phá sản
          </button>
        </div>
      )}

      {/* A. Đổ xúc xắc */}
      {!diceRolled && (
        <button
          onClick={rollDice}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-450 hover:to-emerald-550 text-white font-black py-3.5 px-8 rounded-full shadow-[0_6px_18px_rgba(16,185,129,0.35)] hover:shadow-[0_6px_25px_rgba(16,185,129,0.5)] border border-emerald-400/30 transform active:scale-95 transition-all animate-bounce-slow text-[11px] uppercase tracking-widest"
        >
          <Dice5 size={16} className="animate-spin-slow" aria-hidden="true" /> ĐỔ XÚC XẮC
        </button>
      )}

      {/* B. Mua đất hoặc Bỏ qua (Đã được chuyển sang dạng thẻ bài, đề phòng trường hợp modal lỗi thì vẫn hiện nút phụ) */}
      {diceRolled && currentActionRequired === 'buy_or_pass' && (
        <button
          onClick={endTurn}
          className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700/60 text-slate-300 font-black py-2.5 px-6 rounded-full transition-all active:scale-95 text-[10px] uppercase tracking-wider"
        >
          Bỏ Qua
        </button>
      )}

      {/* C. Phá sản nợ nần */}
      {diceRolled && currentActionRequired === 'bankruptcy_decision' && pendingPayment && (
        <div className="flex flex-col gap-2 w-full bg-red-950/20 border border-red-500/20 p-2.5 rounded-2xl">
          <p className="text-[11px] text-red-300 font-extrabold text-center leading-snug">
            Nợ ${pendingPayment.amount.toLocaleString()} mà không đủ tiền mặt!
          </p>
          <button
            onClick={settleFunds}
            className="w-full flex items-center justify-center gap-1.5 bg-emerald-600/30 text-emerald-200 border border-emerald-500/40 hover:bg-emerald-600/40 font-bold py-2 rounded-xl text-xs uppercase tracking-wider transition"
          >
            <Banknote size={13} aria-hidden="true" /> Bán/cầm cố rồi trả nợ
          </button>
          <button
            onClick={declareBankruptcy}
            className="w-full flex items-center justify-center gap-1.5 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-550 hover:to-rose-600 text-white font-black py-2.5 px-5 rounded-full transition-all active:scale-95 shadow-[0_4px_15px_rgba(239,68,68,0.35)] text-[10px] uppercase tracking-widest"
          >
            <Skull size={14} aria-hidden="true" /> Tuyên Bố Phá Sản
          </button>
        </div>
      )}

      {/* D. Kết thúc lượt thông thường */}
      {diceRolled && currentActionRequired === 'none' && (
        <button
          onClick={endTurn}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 via-indigo-600 to-cyan-500 hover:from-indigo-450 hover:to-indigo-550 border border-indigo-400/30 text-white font-black py-3.5 px-8 rounded-full shadow-[0_6px_18px_rgba(99,102,241,0.35)] hover:shadow-[0_6px_25px_rgba(99,102,241,0.5)] transition-all active:scale-95 text-[11px] uppercase tracking-widest"
        >
          KẾT THÚC LƯỢT <ArrowRight size={16} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
