import { useEffect } from 'react';
import { Coins, Lock, Skull, ShieldAlert, HelpCircle, Gift, X, ArrowRight, FileText } from 'lucide-react';
import type { GameState, TileMetadata } from '../types/game';
import boardDataRaw from '../data/board.json';

const boardData = boardDataRaw as TileMetadata[];

interface InteractiveModalProps {
  gameState: GameState;
  playerId: string;
  onBuy: () => void;
  onPass: () => void;
  onBankruptcy: () => void;
  onDismiss: () => void;
  onEndTurn: () => void;
  onConfirm: () => void;
}

// Hàm tính tiền thuê cho hiển thị bảng khoán
function getRentValue(tile: TileMetadata, houses: number): number {
  if (!tile.rent) return 0;
  return tile.rent[houses] || tile.rent[0];
}

export function InteractiveModal({
  gameState,
  playerId,
  onBuy,
  onPass,
  onBankruptcy,
  onDismiss,
  onEndTurn: _onEndTurn,
  onConfirm,
}: InteractiveModalProps) {
  const { currentActionRequired, pendingPayment, players, tiles, activePlayerIndex, activeCard } = gameState;
  
  const activePlayer = players[activePlayerIndex];
  const isMyTurn = activePlayer?.id === playerId;

  if (!isMyTurn) return null;

  const currentTile = boardData[activePlayer.position];
  const currentTileState = tiles.find((t) => t.id === currentTile.id) || {
    id: currentTile.id,
    ownerId: null,
    houses: 0,
    hotel: false,
    mortgaged: false,
    ownerVisits: 0,
  };

  const owner = currentTileState.ownerId ? players.find((p) => p.id === currentTileState.ownerId) : null;

  // Xác định xem modal hiện tại là loại nào
  let modalType: 'buy_or_pass' | 'bankruptcy' | 'rent_info' | 'tax_info' | 'card_info' | 'jail_info' | 'safe_info' = 'safe_info';
  let isDismissible = true;

  if (currentActionRequired === 'buy_or_pass') {
    modalType = 'buy_or_pass';
    isDismissible = false; // Bắt buộc chọn Mua hoặc Bỏ qua
  } else if (currentActionRequired === 'bankruptcy_decision') {
    modalType = 'bankruptcy';
    isDismissible = false; // Bắt buộc Tuyên bố phá sản
  } else if (activeCard) {
    modalType = 'card_info';
    isDismissible = true;
  } else if (currentTile.type === 'tax') {
    modalType = 'tax_info';
    isDismissible = true;
  } else if (owner && owner.id !== activePlayer.id) {
    modalType = 'rent_info';
    isDismissible = true;
  } else if (activePlayer.inJail || currentActionRequired === 'go_to_jail') {
    modalType = 'jail_info';
    isDismissible = false; // bắt buộc bấm Xác nhận để vào tù
  } else {
    modalType = 'safe_info';
    isDismissible = true;
  }

  // Tiền thuê cụ thể cho ô này nếu có owner
  const currentRent = owner ? getRentValue(currentTile, currentTileState.houses) : 0;

  // Escape key closes dismissible modals
  useEffect(() => {
    if (!isDismissible) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isDismissible, onDismiss]);

  // Render thẻ bằng khoán đất chi tiết (Title Deed Card)
  const renderTitleDeed = () => {
    const groupColors: Record<string, string> = {
      brown: 'from-amber-800 to-amber-900 border-amber-950',
      light_blue: 'from-sky-400 to-sky-500 border-sky-600',
      pink: 'from-pink-400 to-pink-500 border-pink-600',
      orange: 'from-orange-500 to-orange-600 border-orange-700',
      red: 'from-red-500 to-red-600 border-red-700',
      yellow: 'from-yellow-400 to-yellow-500 border-yellow-600',
      green: 'from-emerald-500 to-emerald-600 border-emerald-700',
      dark_blue: 'from-blue-800 to-blue-900 border-blue-950',
      railroad: 'from-slate-700 to-slate-800 border-slate-900',
      utility: 'from-teal-600 to-teal-700 border-teal-800',
    };

    const headerGradient = groupColors[currentTile.group] || 'from-slate-700 to-slate-800 border-slate-900';

    return (
      <div className="w-full max-w-[310px] bg-slate-950 border-2 border-slate-800 rounded-2xl overflow-hidden shadow-2xl text-left font-sans mx-auto my-3 select-none">
        <div className={`bg-gradient-to-r ${headerGradient} py-3 px-4 text-center text-white border-b-2 border-slate-950`}>
          <span className="text-[11px] uppercase font-black tracking-widest text-white/70 flex items-center justify-center gap-1.5">
            <FileText size={12} aria-hidden="true" /> Bằng Khoán Đất
          </span>
          <h4 className="text-base font-black uppercase mt-1 tracking-wide text-white">{currentTile.name}</h4>
        </div>
        
        <div className="p-4 space-y-2.5 text-[13px] text-slate-300">
          {currentTile.price && (
            <div className="flex justify-between border-b border-slate-900 pb-1.5 font-bold text-slate-200">
              <span>Giá mua:</span>
              <span className="text-emerald-400 font-mono">${currentTile.price}</span>
            </div>
          )}
          
          {currentTile.rent && (
            <div className="space-y-1">
              <div className="flex justify-between text-slate-200 font-semibold mb-1">
                <span>Tiền thuê đất:</span>
                <span className="font-mono">${currentTile.rent[0]}</span>
              </div>
              {currentTile.type === 'property' && (
                <div className="space-y-1 text-[11.5px] text-slate-400 mt-0.5 pl-1.5">
                  <div className="flex justify-between">
                    <span>• Với 1 Nhà:</span>
                    <span className="font-mono">${currentTile.rent[1]}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>• Với 2 Nhà:</span>
                    <span className="font-mono">${currentTile.rent[2]}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>• Với 3 Nhà:</span>
                    <span className="font-mono">${currentTile.rent[3]}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>• Với 4 Nhà:</span>
                    <span className="font-mono">${currentTile.rent[4]}</span>
                  </div>
                  <div className="flex justify-between font-bold text-red-400">
                    <span>• Khách sạn:</span>
                    <span className="font-mono">${currentTile.rent[5]}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {currentTile.housePrice && (
            <div className="flex justify-between border-t border-slate-900 pt-2 text-[11px] text-slate-500 font-bold">
              <span>Giá xây nhà:</span>
              <span className="font-mono">${currentTile.housePrice} / căn</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="interactive-modal-title"
        className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-[0_0_50px_rgba(99,102,241,0.15)] max-w-sm w-full flex flex-col items-center text-center backdrop-blur-xl relative animate-[fadeIn_0.2s_ease-out]"
      >

        {/* Nút đóng cho các modal có thể dismiss */}
        {isDismissible && (
          <button
            onClick={onDismiss}
            aria-label="Đóng thông báo"
            className="absolute top-4 right-4 text-slate-500 hover:text-slate-200 transition-colors p-1.5 rounded-lg hover:bg-slate-800"
            title="Đóng thông báo"
          >
            <X size={16} aria-hidden="true" />
          </button>
        )}

        {/* 1. Mua đất (buy_or_pass) */}
        {modalType === 'buy_or_pass' && (
          <div className="w-full flex flex-col items-center">
            <div className="w-7 h-7 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-1.5 shrink-0">
              <Coins className="text-emerald-400" size={14} aria-hidden="true" />
            </div>
            <h3 id="interactive-modal-title" className="text-xs font-bold text-white uppercase tracking-wider">Mua Tài Sản?</h3>
            <p className="text-[9.5px] text-slate-450 mt-0 max-w-[230px]">
              Bạn đã đi vào mảnh đất trống. Bạn muốn sở hữu để bắt đầu thu tiền thuê của đối thủ chứ?
            </p>
            
            {renderTitleDeed()}

            {/* Cảnh báo thiếu tiền */}
            {(() => {
              const tilePrice = currentTile.price || 0;
              const hasEnoughMoney = activePlayer && activePlayer.money >= tilePrice;
              return (
                <>
                  {!hasEnoughMoney && (
                    <div className="text-xs font-bold text-red-400 flex items-center justify-center gap-1 bg-red-950/20 border border-red-500/15 py-1.5 px-3 rounded-xl animate-pulse mt-2 w-full">
                      <ShieldAlert size={14} className="shrink-0" aria-hidden="true" />
                      <span>Không đủ tiền mua! (Thiếu ${tilePrice - (activePlayer?.money || 0)})</span>
                    </div>
                  )}

                  <div className="flex flex-col gap-2 w-full mt-2">
                    <button
                      onClick={onBuy}
                      disabled={!hasEnoughMoney}
                      className={`w-full py-2 px-4 font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 ${
                        hasEnoughMoney
                          ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-900/20 active:scale-[0.98] text-[11px] uppercase tracking-wider"
                          : "bg-slate-800 text-slate-500 border border-slate-700/30 cursor-not-allowed opacity-50 text-[11px] uppercase tracking-wider"
                      }`}
                    >
                      Mua mảnh đất này (${currentTile.price})
                    </button>
                    <button
                      onClick={onPass}
                      className="w-full py-1.5 px-4 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/40 text-slate-300 font-bold rounded-xl active:scale-[0.98] transition-all text-[11px] uppercase tracking-wider"
                    >
                      Bỏ qua
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* 2. Phá sản (bankruptcy) */}
        {modalType === 'bankruptcy' && pendingPayment && (
          <div className="w-full flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-3">
              <Skull className="text-red-400 animate-pulse" size={24} aria-hidden="true" />
            </div>
            <h3 id="interactive-modal-title" className="text-lg font-black text-red-400 uppercase tracking-wide">Khủng hoảng Tài Chính</h3>
            <p className="text-xs text-slate-350 mt-1.5 px-2">
              Bạn nợ <span className="font-extrabold text-red-300">${pendingPayment.amount.toLocaleString()}</span> cho{' '}
              <span className="font-bold text-slate-200">
                {pendingPayment.toPlayerId === 'bank' ? 'Ngân Hàng' : players.find((p) => p.id === pendingPayment.toPlayerId)?.name}
              </span>{' '}
              và không còn đủ tiền mặt để chi trả!
            </p>
            <div className="w-full py-4 px-3 bg-red-950/20 border border-red-500/15 rounded-2xl my-4 text-xs font-mono text-red-350 text-left">
              <div className="flex justify-between pb-1 border-b border-red-900/30">
                <span>Khoản nợ:</span>
                <span>${pendingPayment.amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between pt-1.5 font-bold">
                <span>Số tiền hiện có:</span>
                <span>${activePlayer.money.toLocaleString()}</span>
              </div>
            </div>
            <button
              onClick={onBankruptcy}
              className="w-full py-3.5 px-6 bg-red-650 hover:bg-red-550 text-white font-extrabold rounded-2xl shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <Skull size={18} aria-hidden="true" /> Tuyên Bố Phá Sản
            </button>
          </div>
        )}

        {/* 3. Thẻ rút Chance/Chest (card_info) */}
        {modalType === 'card_info' && activeCard && (
          <div className="w-full flex flex-col items-center">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${
              activeCard.type === 'chance' ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-emerald-500/10 border border-emerald-500/20'
            }`}>
              {activeCard.type === 'chance' ? (
                <HelpCircle className="text-amber-400" size={24} aria-hidden="true" />
              ) : (
                <Gift className="text-emerald-400" size={24} aria-hidden="true" />
              )}
            </div>
            <h3 id="interactive-modal-title" className={`text-lg font-black uppercase tracking-wide ${
              activeCard.type === 'chance' ? 'text-amber-400' : 'text-emerald-400'
            }`}>
              {activeCard.type === 'chance' ? 'Thẻ Cơ Hội' : 'Quỹ Cộng Đồng'}
            </h3>
            
            {/* Card Graphic */}
            <div className="w-full p-6 bg-gradient-to-b from-slate-950 to-slate-900 border border-slate-800 rounded-2xl my-4 text-xs font-bold leading-relaxed text-slate-200 text-center shadow-inner relative overflow-hidden min-h-[90px] flex items-center justify-center">
              <div className="absolute inset-0 bg-radial-glow from-slate-900/30 to-transparent pointer-events-none" />
              "{activeCard.text}"
            </div>

            <div className="flex flex-col gap-2 w-full">
              <button
                onClick={onConfirm}
                className="w-full py-3 px-6 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-2xl shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
              >
                Xác Nhận & Kết Thúc Lượt <ArrowRight size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
        )}

        {/* 4. Trả tiền thuê (rent_info) */}
        {modalType === 'rent_info' && owner && (
          <div className="w-full flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-3">
              <Coins className="text-rose-400" size={24} aria-hidden="true" />
            </div>
            <h3 id="interactive-modal-title" className="text-lg font-black text-rose-400 uppercase tracking-wide">Trả Tiền Thuê</h3>
            <p className="text-xs text-slate-400 mt-1">
              Bạn đã đi vào bất động sản của <span className="font-bold text-slate-200">{owner.name}</span>.
            </p>
            
            <div className="w-full py-3.5 px-4 bg-slate-950/80 border border-slate-850 rounded-2xl my-3 text-xs text-left font-sans space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>Ô cờ:</span>
                <span className="font-bold text-slate-200">{currentTile.name}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Chủ sở hữu:</span>
                <span className="font-bold" style={{ color: owner.color }}>{owner.name}</span>
              </div>
              <div className="flex justify-between border-t border-slate-900 pt-1.5 font-black text-rose-400 text-sm">
                <span>Đã trả tiền thuê:</span>
                <span className="font-mono">${currentRent}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2 w-full mt-2">
              <button
                onClick={onConfirm}
                className="w-full py-3.5 px-6 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-extrabold rounded-2xl shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
              >
                Xác Nhận & Kết Thúc Lượt <ArrowRight size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
        )}

        {/* 5. Nộp thuế (tax_info) */}
        {modalType === 'tax_info' && (
          <div className="w-full flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-3">
              <ShieldAlert className="text-amber-400" size={24} aria-hidden="true" />
            </div>
            <h3 id="interactive-modal-title" className="text-lg font-black text-amber-400 uppercase tracking-wide">Khấu Trừ Thuế</h3>
            <p className="text-xs text-slate-400 mt-1">
              Nhà nước đã thực hiện thu thuế tự động khi bạn đi vào ô thuế.
            </p>
            
            <div className="w-full py-3.5 px-4 bg-slate-950/80 border border-slate-850 rounded-2xl my-3 text-xs text-left font-sans space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>Sự kiện:</span>
                <span className="font-bold text-slate-200">{currentTile.name}</span>
              </div>
              <div className="flex justify-between border-t border-slate-900 pt-1.5 font-black text-amber-400 text-sm">
                <span>Đã nộp phạt thuế:</span>
                <span className="font-mono">${currentTile.price}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2 w-full mt-2">
              <button
                onClick={onConfirm}
                className="w-full py-3.5 px-6 bg-amber-600 hover:bg-amber-500 text-white font-extrabold rounded-2xl shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
              >
                Xác Nhận & Kết Thúc Lượt <ArrowRight size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
        )}

        {/* 6. Vào tù (jail_info) */}
        {modalType === 'jail_info' && (
          <div className="w-full flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-slate-500/10 border border-slate-500/20 flex items-center justify-center mb-3">
              <Lock className="text-slate-400 animate-pulse" size={24} aria-hidden="true" />
            </div>
            <h3 id="interactive-modal-title" className="text-lg font-black text-slate-350 uppercase tracking-wide">Bị Bắt Vào Tù</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-[250px]">
              Bạn đã vi phạm pháp luật hoặc rút phải lệnh bắt giam! Bạn bị tạm giam tại Nhà Tù.
            </p>
            
            <div className="w-full p-4 bg-slate-950/85 border border-slate-850 rounded-2xl my-4 text-left text-[10.5px] leading-relaxed text-slate-400">
              <div className="font-bold text-slate-300 mb-1">Quy định cải tạo:</div>
              • Phải dừng di chuyển thông thường.<br />
              • Thoát tù khi: Đổ được đôi xúc xắc ở lượt sau, hoặc nộp phạt $50 sau 3 lượt cải tạo.
            </div>

            <button
              onClick={onConfirm}
              className="w-full py-3.5 px-6 bg-slate-700 hover:bg-slate-650 text-white font-extrabold rounded-2xl shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
            >
              Chấp Nhận & Kết Thúc Lượt <ArrowRight size={16} aria-hidden="true" />
            </button>
          </div>
        )}

        {/* 7. Ô an toàn (safe_info) */}
        {modalType === 'safe_info' && (
          <div className="w-full flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-3">
              <Coins className="text-indigo-400" size={24} aria-hidden="true" />
            </div>
            <h3 id="interactive-modal-title" className="text-lg font-black text-indigo-400 uppercase tracking-wide">{currentTile.name}</h3>
            <p className="text-xs text-slate-400 mt-1">
              {currentTile.description || 'Bạn đang nghỉ chân tại ô cờ an toàn.'}
            </p>
            
            <div className="w-full py-3.5 px-4 bg-slate-950/80 border border-slate-850 rounded-2xl my-4 text-xs text-left font-sans space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>Vị trí đứng:</span>
                <span className="font-bold text-slate-200">{currentTile.name}</span>
              </div>
              <div className="flex justify-between border-t border-slate-900 pt-1.5 text-slate-400">
                <span>Trạng thái:</span>
                <span className="font-extrabold text-indigo-400">An toàn</span>
              </div>
            </div>

            <div className="flex flex-col gap-2 w-full">
              <button
                onClick={onConfirm}
                className="w-full py-3.5 px-6 bg-indigo-650 hover:bg-indigo-550 text-white font-extrabold rounded-2xl shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
              >
                Xác Nhận & Kết Thúc Lượt <ArrowRight size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
