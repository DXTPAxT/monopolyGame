import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { CenterStageControls } from './CenterStageControls';
import { BuildModal } from './modals/BuildModal';
import { GameBoard3D } from './scene3d/GameBoard3D';

const Dice3D = lazy(() => import('./scene3d/Dice3D').then((m) => ({ default: m.Dice3D })));
import type { GameState, Player, TileMetadata } from '../types/game';
import boardDataRaw from '../data/board.json';
import { playClickSound } from '../utils/sound';
import { Coins, Lock, Skull, ShieldAlert, HelpCircle, Gift, ArrowRight, FileText } from 'lucide-react';

const boardData = boardDataRaw as TileMetadata[];

interface BoardProps {
  gameState: GameState;
  playerId: string;
  hostId: string;
  rollDice: () => void;
  buyProperty: () => void;
  buildHouse: (tileId: number) => void;
  endTurn: () => void;
  declareBankruptcy: () => void;
  restartGame: () => void;
  declineBuy: () => void;
  jailAction: (method: 'pay' | 'use_card') => void;
  settleFunds: () => void;
  finishBuild: () => void;
}

export function Board({
  gameState,
  playerId,
  hostId,
  rollDice,
  buyProperty,
  buildHouse,
  endTurn,
  declareBankruptcy,
  restartGame,
  declineBuy,
  jailAction,
  settleFunds,
  finishBuild,
}: BoardProps) {
  const { tiles, players, activePlayerIndex, dice, diceRolled, currentActionRequired, pendingPayment, winnerId } = gameState;

  // State vị trí hiển thị của quân cờ (visual position) để chạy animation di chuyển
  const [visualPositions, setVisualPositions] = useState<Record<string, number>>({});

  const containerRef = useRef<HTMLDivElement>(null);

  // Timer animation xúc xắc giữ trong ref (KHÔNG để trong cleanup của effect):
  // gameState.dice là array mới mỗi lần server cập nhật, nếu effect re-run giữa
  // chừng thì cleanup sẽ huỷ timer → walkBlocked kẹt true → modal/nút không hiện.
  const rollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // States quản lý Spotlight Xúc xắc & Trì hoãn di chuyển quân cờ
  const [prevDice, setPrevDice] = useState<[number, number]>(dice);
  const [prevActivePlayer, setPrevActivePlayer] = useState<number>(activePlayerIndex);
  const [localDiceRolling, setLocalDiceRolling] = useState(false);
  const [diceRevealActive, setDiceRevealActive] = useState(false);
  const [walkBlocked, setWalkBlocked] = useState(false);

  // Ô đất đích phát sáng
  const [highlightedTileId, setHighlightedTileId] = useState<number | null>(null);

  // Trình tự lắc xúc xắc (Spotlight + Reveal math) trước khi di chuyển quân cờ
  useEffect(() => {
    if (activePlayerIndex !== prevActivePlayer) {
      setPrevActivePlayer(activePlayerIndex);
      setPrevDice(dice);
      setLocalDiceRolling(false);
      setDiceRevealActive(false);
      setWalkBlocked(false);
      return;
    }

    if (diceRolled && (dice[0] !== prevDice[0] || dice[1] !== prevDice[1])) {
      setPrevDice(dice);
      setLocalDiceRolling(true);
      setWalkBlocked(true);

      // Bắt đầu animation MỚI → huỷ timer của lượt trước (nếu còn).
      if (rollTimerRef.current) clearTimeout(rollTimerRef.current);
      if (revealTimerRef.current) clearTimeout(revealTimerRef.current);

      // 800ms xoay xúc xắc cực độ
      rollTimerRef.current = setTimeout(() => {
        setLocalDiceRolling(false);
        setDiceRevealActive(true);

        // 1200ms hiển thị kết quả (e.g. 6 + 2 = 8)
        revealTimerRef.current = setTimeout(() => {
          setDiceRevealActive(false);
          setWalkBlocked(false); // bắt đầu di chuyển
        }, 1200);
      }, 800);
    }
    // KHÔNG return cleanup huỷ timer ở đây: effect re-run do dice đổi reference
    // (server cập nhật state) không được phép cắt ngang animation đang chạy.
  }, [dice, diceRolled, activePlayerIndex]);

  // Chỉ dọn timer khi component unmount.
  useEffect(() => {
    return () => {
      if (rollTimerRef.current) clearTimeout(rollTimerRef.current);
      if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
    };
  }, []);

  // Chạy di chuyển từng ô một (Step-by-step) sau khi hết chặn (walkBlocked = false)
  useEffect(() => {
    if (walkBlocked || localDiceRolling || diceRevealActive) return;

    // Khởi tạo vị trí nếu chưa có
    const initialPos: Record<string, number> = { ...visualPositions };
    let hasNew = false;
    players.forEach((p) => {
      if (initialPos[p.id] === undefined) {
        initialPos[p.id] = p.position;
        hasNew = true;
      }
    });
    if (hasNew) {
      setVisualPositions(initialPos);
      return;
    }

    // Tìm người chơi cần di chuyển cell-by-cell
    const playersToAnimate = players.filter((p) => {
      const currentVisual = visualPositions[p.id];
      return currentVisual !== undefined && currentVisual !== p.position && !p.isBankrupt;
    });

    if (playersToAnimate.length === 0) return;

    const targetPlayer = playersToAnimate[0];
    const currentVisual = visualPositions[targetPlayer.id];
    const targetPos = targetPlayer.position;

    // Khoảng cách di chuyển vòng tròn
    const dist = (targetPos - currentVisual + 40) % 40;

    if (dist > 12) {
      // Dịch chuyển tức thời (Ví dụ: Vào tù / Thẻ dịch chuyển)
      setVisualPositions((prev) => ({
        ...prev,
        [targetPlayer.id]: targetPos,
      }));
      
      setHighlightedTileId(targetPos);
      const hTimer = setTimeout(() => setHighlightedTileId(null), 500);
      return () => clearTimeout(hTimer);
    } else {
      // Di chuyển từng ô một
      const nextVisual = (currentVisual + 1) % 40;
      const timer = setTimeout(() => {
        setVisualPositions((prev) => ({
          ...prev,
          [targetPlayer.id]: nextVisual,
        }));
        playClickSound(); // Âm thanh từng bước đi

        if (nextVisual === targetPos) {
          // Khi đáp xuống ô đích cuối cùng, kích hoạt Double-Pulse highlight (500ms)
          setHighlightedTileId(targetPos);
          setTimeout(() => {
            setHighlightedTileId(null);
          }, 500);
        }
      }, 200); // 200ms per step
      return () => clearTimeout(timer);
    }
  }, [players, visualPositions, walkBlocked, localDiceRolling, diceRevealActive]);

  // Lấy danh sách người chơi hiển thị trên từng ô cờ
  const getPlayersOnTile = (tileId: number): Player[] => {
    return players.filter((p) => {
      const pos = visualPositions[p.id] !== undefined ? visualPositions[p.id] : p.position;
      return pos === tileId && !p.isBankrupt;
    });
  };

  const activePlayer = players[activePlayerIndex];
  const isMyTurn = activePlayer?.id === playerId;

  // Tất cả hoạt ảnh xong (xúc xắc + đi bộ) → mới hiện modal / controls
  const isAnimationDone =
    !walkBlocked &&
    !localDiceRolling &&
    !diceRevealActive &&
    players.every(
      (p) =>
        p.isBankrupt ||
        visualPositions[p.id] === undefined ||
        visualPositions[p.id] === p.position,
    );

  // Kiểm tra nhóm độc quyền (Monopoly) của một ô đất để vẽ hiệu ứng viền phát sáng
  const isGroupMonopoly = (group: string, ownerId: string | null): boolean => {
    if (!ownerId || group === 'railroad' || group === 'utility') return false;
    const groupTiles = boardData.filter(t => t.group === group);
    if (groupTiles.length === 0) return false;
    return groupTiles.every(gt => {
      const ts = tiles.find(t => t.id === gt.id);
      return ts && ts.ownerId === ownerId;
    });
  };

  // RENDER DYNAMIC EMERGENCE CARDS FOR USER ACTIONS (Monopoly GO style bottom slide-up panels)
  const renderCenterStageModal = () => {
    if (!gameState.activeModal) return null;

    const modalType = gameState.activeModal;
    const payload = gameState.modalPayload;


    // Bằng khoán đất
    const renderTitleDeed = (tileId: number) => {
      const tile = boardData[tileId];
      const groupColors: Record<string, string> = {
        brown: 'from-amber-800 to-amber-900 border-amber-950',
        light_blue: 'from-cyan-500 to-cyan-600 border-cyan-700',
        pink: 'from-pink-500 to-pink-600 border-pink-700',
        orange: 'from-orange-500 to-orange-600 border-orange-700',
        red: 'from-red-500 to-red-650 border-red-700',
        yellow: 'from-yellow-400 to-yellow-500 border-yellow-600',
        green: 'from-emerald-500 to-emerald-600 border-emerald-700',
        dark_blue: 'from-blue-600 to-blue-700 border-blue-800',
        railroad: 'from-slate-700 to-slate-800 border-slate-900',
        utility: 'from-teal-600 to-teal-700 border-teal-800',
      };
      const headerGradient = groupColors[tile.group] || 'from-slate-700 to-slate-800';

      return (
        <div className="w-full max-w-[310px] bg-slate-950 border-2 border-slate-800 rounded-2xl overflow-hidden shadow-2xl text-left font-sans mx-auto shrink-0 select-none">
          <div className={`bg-gradient-to-r ${headerGradient} py-3 px-4 text-center text-white border-b-2 border-slate-950`}>
            <span className="text-[11px] uppercase font-black tracking-widest text-white/80 flex items-center justify-center gap-1.5">
              <FileText size={12} /> Bằng Khoán Đất
            </span>
            <h4 className="text-base font-black uppercase tracking-wide text-white mt-1">{tile.name}</h4>
          </div>
          <div className="p-4 space-y-2.5 text-[13px] text-slate-300">
            {tile.price && (
              <div className="flex justify-between border-b border-slate-900 pb-1.5 font-bold text-slate-200">
                <span>Giá mua:</span>
                <span className="text-emerald-400 font-mono">${tile.price}</span>
              </div>
            )}
            {tile.rent && (
              <div className="space-y-1">
                <div className="flex justify-between text-slate-200 font-semibold mb-1">
                  <span>Tiền thuê đất:</span>
                  <span className="font-mono text-slate-100">${tile.rent[0]}</span>
                </div>
                {tile.type === 'property' && (
                  <div className="space-y-1 text-[11.5px] text-slate-400 mt-0.5 pl-1.5">
                    <div className="flex justify-between">
                      <span>• Với 1 Nhà:</span>
                      <span className="font-mono">${tile.rent[1]}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>• Với 2 Nhà:</span>
                      <span className="font-mono">${tile.rent[2]}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>• Với 3 Nhà:</span>
                      <span className="font-mono">${tile.rent[3]}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>• Với 4 Nhà:</span>
                      <span className="font-mono">${tile.rent[4]}</span>
                    </div>
                    <div className="flex justify-between font-bold text-red-400">
                      <span>• Khách sạn:</span>
                      <span className="font-mono">${tile.rent[5]}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
            {tile.housePrice && (
              <div className="flex justify-between border-t border-slate-900 pt-2 text-[11px] text-slate-500 font-bold">
                <span>Giá xây nhà:</span>
                <span className="font-mono">${tile.housePrice}/căn</span>
              </div>
            )}
          </div>
        </div>
      );
    };

    // XÂY NHÀ: chỉ active player mới thấy BuildModal
    if (modalType === 'build_houses' && isMyTurn) {
      const buildTileId = gameState.modalPayload?.tileId;
      if (buildTileId !== undefined) {
        return (
          <BuildModal
            tileId={buildTileId}
            gameState={gameState}
            onBuild={buildHouse}
            onDone={finishBuild}
          />
        );
      }
    }

    // RENDER CHO NGƯỜI CHƠI KHÁC (SPECTATOR VIEW)
    if (!isMyTurn) {
      let spectatorMsg = '';
      let specClass = 'text-slate-400';
      if (modalType === 'buy_property') {
        spectatorMsg = `Đang chờ ${activePlayer?.name} quyết định mua ${boardData[payload?.tileId || 0]?.name}...`;
      } else if (modalType === 'pay_rent') {
        const ownerName = players.find(p => p.id === payload?.ownerId)?.name || 'đối thủ';
        spectatorMsg = `${activePlayer?.name} đang thanh toán $${payload?.amount} tiền thuê cho ${ownerName}.`;
        specClass = 'text-rose-400 font-medium';
      } else if (modalType === 'pay_tax') {
        spectatorMsg = `${activePlayer?.name} đang thanh toán $${payload?.amount} tiền thuế.`;
        specClass = 'text-orange-400';
      } else if (modalType === 'jail') {
        spectatorMsg = `${activePlayer?.name} đang ở trong Nhà Tù.`;
        specClass = 'text-red-450';
      } else if (modalType === 'chance') {
        spectatorMsg = `${activePlayer?.name} rút thẻ Cơ Hội: "${payload?.cardText}"`;
        specClass = 'text-amber-450 font-semibold';
      } else if (modalType === 'community_chest') {
        spectatorMsg = `${activePlayer?.name} rút thẻ Quỹ Cộng Đồng: "${payload?.cardText}"`;
        specClass = 'text-emerald-450 font-semibold';
      } else if (modalType === 'bankruptcy') {
        spectatorMsg = `🚨 [PHÁ SẢN] ${activePlayer?.name} đang xử lý khủng hoảng nợ nần!`;
        specClass = 'text-red-500 font-black';
      }

      return (
        <div className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-3 shadow-xl flex items-center justify-center gap-2.5 animate-fadeIn">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping shrink-0" />
          <p className={`text-[10px] tracking-wide uppercase font-bold text-center ${specClass}`}>
            {spectatorMsg}
          </p>
        </div>
      );
    }

    // RENDER CHO NGƯỜI CHƠI ĐANG ĐẾN LƯỢT (PREMIUM HORIZONTAL ACTION PANEL)
    switch (modalType) {
      case 'buy_property':
        const tilePrice = boardData[payload?.tileId || 0]?.price || 0;
        const hasEnoughMoney = activePlayer && activePlayer.money >= tilePrice;
        return (
          <div className="w-full bg-slate-900/98 border border-emerald-500/30 rounded-2xl p-3.5 shadow-2xl flex flex-col gap-3 animate-fadeIn">
            {/* Title row */}
            <div className="flex items-center gap-2 select-none">
              <div className="w-7 h-7 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                <Coins className="text-emerald-400" size={14} />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Mua Tài Sản?</h3>
                <p className="text-[9.5px] text-slate-450 leading-snug mt-0">
                  Quyết định mua hoặc bỏ qua mảnh đất này để tiếp tục ván đấu.
                </p>
              </div>
            </div>

            {/* Deed card — centered, bigger */}
            <div className="flex justify-center">
              {payload?.tileId !== undefined && renderTitleDeed(payload.tileId)}
            </div>

            {/* Cảnh báo thiếu tiền */}
            {!hasEnoughMoney && (
              <div className="text-xs font-bold text-red-400 flex items-center justify-center gap-1 bg-red-950/20 border border-red-500/15 py-1.5 px-3 rounded-xl animate-pulse">
                <ShieldAlert size={14} className="shrink-0" />
                <span>Không đủ tiền mua! (Thiếu ${tilePrice - (activePlayer?.money || 0)})</span>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={buyProperty}
                disabled={!hasEnoughMoney}
                className={`flex-1 py-2 text-[11px] rounded-xl transition-all uppercase tracking-wider border font-bold ${
                  hasEnoughMoney
                    ? "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white border-emerald-300/30 shadow-[0_0_12px_rgba(16,185,129,0.3)] hover:shadow-[0_0_18px_rgba(16,185,129,0.5)] active:scale-[0.98]"
                    : "bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed opacity-50"
                }`}
              >
                Mua (${boardData[payload?.tileId || 0]?.price})
              </button>
              <button
                onClick={declineBuy}
                className="flex-1 py-2 bg-transparent hover:bg-slate-800 border border-slate-700 hover:border-slate-600 text-slate-400 hover:text-slate-300 font-bold text-[11px] rounded-xl transition-all uppercase tracking-wider"
              >
                Bỏ qua
              </button>
            </div>
          </div>
        );

      case 'pay_rent':
        return (
          <div className="w-full bg-slate-900/95 border border-rose-500/25 rounded-2xl p-3 shadow-2xl flex flex-col md:flex-row gap-4 items-center justify-between animate-fadeIn relative">
            <div className="flex-grow text-center md:text-left select-none">
              <div className="w-8 h-8 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-1.5 mx-auto md:mx-0 shrink-0">
                <Coins className="text-rose-450" size={16} />
              </div>
              <h3 className="text-xs font-black text-rose-400 uppercase tracking-wider">Trả Tiền Thuê</h3>
              <p className="text-[9.5px] text-slate-400 mt-1 max-w-[200px] leading-normal">
                Bạn dừng chân tại đất của <span className="font-bold text-slate-200">{players.find(p => p.id === payload?.ownerId)?.name}</span>.
              </p>
            </div>
            
            <div className="w-full md:w-[140px] py-2.5 px-3 bg-slate-950 border border-slate-850 rounded-xl my-1 md:my-0 text-[9.5px] space-y-0.5 text-left shrink-0">
              <div className="flex justify-between text-slate-500 font-medium">
                <span>Mảnh đất:</span>
                <span className="font-bold text-slate-300 truncate max-w-[80px]">{boardData[payload?.tileId || 0]?.name}</span>
              </div>
              <div className="flex justify-between border-t border-slate-900 pt-1 font-black text-rose-450 text-[11px]">
                <span>Tổng thuê:</span>
                <span className="font-mono">${payload?.amount}</span>
              </div>
            </div>

            <button
              onClick={endTurn}
              className="w-full md:w-[120px] py-2.5 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-450 hover:to-pink-500 text-white font-black text-[10px] rounded-xl shadow-md transition-all active:scale-[0.98] uppercase tracking-wider shrink-0 flex items-center justify-center gap-1 border border-rose-400/20"
            >
              Xác Nhận <ArrowRight size={12} />
            </button>
          </div>
        );

      case 'pay_tax':
        return (
          <div className="w-full bg-slate-900/95 border border-orange-500/25 rounded-2xl p-3 shadow-2xl flex flex-col md:flex-row gap-4 items-center justify-between animate-fadeIn relative">
            <div className="flex-grow text-center md:text-left select-none">
              <div className="w-8 h-8 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mb-1.5 mx-auto md:mx-0 shrink-0">
                <ShieldAlert className="text-orange-450" size={16} />
              </div>
              <h3 className="text-xs font-black text-orange-400 uppercase tracking-wider">Khấu Trừ Thuế</h3>
              <p className="text-[9.5px] text-slate-400 mt-1 max-w-[200px] leading-normal">
                Nộp thuế theo luật định để cân bằng tài chính quốc gia.
              </p>
            </div>
            
            <div className="w-full md:w-[130px] py-2.5 px-3 bg-slate-950 border border-slate-850 rounded-xl my-1.5 md:my-0 text-left shrink-0 select-none">
              <div className="flex justify-between font-black text-orange-400 text-xs">
                <span>Số thuế:</span>
                <span className="font-mono">${payload?.amount}</span>
              </div>
            </div>

            <button
              onClick={endTurn}
              className="w-full md:w-[120px] py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-450 hover:to-amber-450 text-white font-black text-[10px] rounded-xl shadow-md transition-all active:scale-[0.98] uppercase tracking-wider shrink-0 border border-orange-400/20"
            >
              Nộp Thuế
            </button>
          </div>
        );

      case 'jail':
        return (
          <div className="w-full bg-slate-900/95 border border-red-500/25 rounded-2xl p-3 shadow-2xl flex flex-col md:flex-row gap-4 items-center justify-between animate-fadeIn relative">
            <div className="flex-grow text-center md:text-left select-none">
              <div className="w-8 h-8 rounded-full bg-red-650/10 border border-red-650/20 flex items-center justify-center mb-1.5 mx-auto md:mx-0 shrink-0">
                <Lock className="text-red-500 animate-pulse" size={16} />
              </div>
              <h3 className="text-xs font-black text-red-550 uppercase tracking-wider">Vào Nhà Tù</h3>
              <p className="text-[9.5px] text-slate-400 mt-1 leading-normal">
                Bị tạm giam do dừng vào ô cảnh sát hoặc rút phải thẻ phạt.
              </p>
            </div>
            
            <p className="text-[8.5px] text-slate-500 leading-normal max-w-[130px] my-1.5 md:my-0 text-center md:text-left shrink-0 select-none">
              Thoát án ở lượt sau nếu đổ xúc xắc đôi hoặc nộp $50.
            </p>

            <button
              onClick={endTurn}
              className="w-full md:w-[120px] py-2.5 bg-slate-800 hover:bg-slate-750 border border-slate-700/60 text-white font-black text-[10px] rounded-xl transition-all uppercase tracking-wider shrink-0"
            >
              Chấp Nhận
            </button>
          </div>
        );

      case 'chance':
      case 'community_chest':
        const isChance = modalType === 'chance';
        return (
          <div className={`w-full bg-slate-900/95 border rounded-2xl p-3 shadow-2xl flex flex-col md:flex-row gap-4 items-center justify-between animate-fadeIn relative ${
            isChance ? 'border-amber-400/25' : 'border-emerald-500/25'
          }`}>
            <div className="flex-grow text-center md:text-left select-none">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1.5 mx-auto md:mx-0 shrink-0 ${
                isChance ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-emerald-500/10 border border-emerald-500/20'
              }`}>
                {isChance ? <HelpCircle className="text-amber-400" size={16} /> : <Gift className="text-emerald-450" size={16} />}
              </div>
              <h3 className={`text-xs font-black uppercase tracking-wider ${isChance ? 'text-amber-400' : 'text-emerald-450'}`}>
                {isChance ? 'Thẻ Cơ Hội' : 'Quỹ Cộng Đồng'}
              </h3>
            </div>
            
            <div className="w-full md:w-[170px] p-2.5 bg-slate-950 border border-slate-850 rounded-xl my-1.5 md:my-0 text-[9.5px] font-bold leading-normal text-slate-200 text-center shrink-0">
              "{payload?.cardText}"
            </div>

            <button
              onClick={endTurn}
              className="w-full md:w-[120px] py-2.5 bg-gradient-to-r from-indigo-500 to-indigo-650 hover:from-indigo-450 hover:to-indigo-550 text-white font-black text-[10px] rounded-xl shadow-md transition-all uppercase tracking-wider shrink-0 flex items-center justify-center gap-1 border border-indigo-400/20"
            >
              Tiếp Tục <ArrowRight size={12} />
            </button>
          </div>
        );

      case 'bankruptcy':
        return (
          <div className="w-full bg-slate-900/95 border border-red-500/25 rounded-2xl p-3 shadow-2xl flex flex-col md:flex-row gap-4 items-center justify-between animate-fadeIn relative">
            <div className="flex-grow text-center md:text-left select-none">
              <div className="w-8 h-8 rounded-full bg-red-900/10 border border-red-900/20 flex items-center justify-center mb-1.5 mx-auto md:mx-0 shrink-0">
                <Skull className="text-red-500 animate-bounce" size={16} />
              </div>
              <h3 className="text-xs font-black text-red-550 uppercase tracking-wider">Khủng Hoảng Nợ</h3>
              <p className="text-[9px] text-slate-400 mt-1 max-w-[180px] leading-normal">
                Không đủ tiền mặt để thực hiện nghĩa vụ tài chính!
              </p>
            </div>
            
            <div className="w-full md:w-[130px] py-2 px-2.5 bg-slate-950 border border-slate-850 rounded-xl my-1.5 md:my-0 text-[8.5px] font-mono text-red-350 text-left shrink-0 select-none">
              <div className="flex justify-between">
                <span>Nợ phạt:</span>
                <span>${payload?.amount}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Tiền mặt:</span>
                <span>${activePlayer?.money}</span>
              </div>
            </div>

            <button
              onClick={declareBankruptcy}
              className="w-full md:w-[120px] py-2.5 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-550 hover:to-rose-600 text-white font-black text-[10px] rounded-xl shadow-md transition-all uppercase tracking-wider shrink-0 border border-red-400/20"
            >
              Phá Sản
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  // HUD content rendered inside 3D scene
  const hudContent = (
    <div className={`bg-slate-950/85 backdrop-blur-md border border-slate-800/60 rounded-2xl shadow-2xl p-3.5 flex flex-col items-center gap-2`}>
      {/* TOP: Logo & Room & Turn */}
      <div className="flex flex-col items-center gap-1.5 w-full">
        <div className="flex items-center justify-center gap-2">
          <h2 className="text-sm font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-br from-indigo-400 to-cyan-400 uppercase">
            Cờ Tỷ Phú
          </h2>
          <span className="text-[7.5px] text-slate-500 font-bold uppercase tracking-wider bg-slate-900/60 px-1.5 py-0.5 rounded-md border border-slate-800">
            Phòng: {gameState.roomCode}
          </span>
        </div>
        {activePlayer && !winnerId && (
          <div className="px-4 py-1.5 bg-slate-900/90 border border-slate-800 rounded-full shadow flex items-center gap-1.5 text-[8.5px] font-black tracking-wider uppercase">
            <span className="w-1.5 h-1.5 rounded-full animate-ping shrink-0" style={{ backgroundColor: activePlayer.color }} />
            <span className="text-slate-400">LƯỢT:</span>
            <span style={{ color: activePlayer.color }}>{activePlayer.name}</span>
          </div>
        )}
      </div>

      {/* MIDDLE: Dice */}
      <div className="flex flex-col items-center justify-center w-full py-1 min-h-[100px]">
        <div className="w-48 h-28 relative">
          <Suspense fallback={<div className="w-full h-full flex items-center justify-center text-[11px] text-slate-500">🎲 …</div>}>
            <Dice3D dice={dice} rolling={localDiceRolling} skin={gameState.settings?.diceSkin} />
          </Suspense>
        </div>
        {diceRevealActive ? (
          <div className="text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-indigo-400 font-mono mt-1 animate-pulse">
            {dice[0]} + {dice[1]} = {dice[0] + dice[1]}
          </div>
        ) : !diceRolled && isMyTurn ? (
          <span className="text-[11px] text-indigo-300 font-bold uppercase tracking-wider mt-1 animate-pulse">Lượt của bạn — Đổ xúc xắc!</span>
        ) : (
          <span className="text-[11px] text-slate-500 font-mono mt-1">Xúc xắc: {dice[0]} + {dice[1]}</span>
        )}
      </div>

      {/* BOTTOM: Controls & Logs */}
      <div className="w-full flex flex-col items-center gap-1.5">
        {isAnimationDone && !gameState.activeModal && (
          <div className="w-full max-w-[220px] flex justify-center">
            <CenterStageControls
              isMyTurn={isMyTurn}
              currentActionRequired={currentActionRequired}
              diceRolled={diceRolled}
              pendingPayment={pendingPayment}
              winnerId={winnerId}
              isHost={playerId === hostId}
              inJail={!!activePlayer?.inJail}
              hasJailCard={(activePlayer?.getOutOfJailCards || 0) > 0}
              rollDice={rollDice}
              buyProperty={buyProperty}
              endTurn={endTurn}
              declareBankruptcy={declareBankruptcy}
              restartGame={restartGame}
              jailAction={jailAction}
              settleFunds={settleFunds}
            />
          </div>
        )}
        <div className="w-full flex flex-col gap-1 max-w-[220px] select-none mt-1">
          {gameState.logs.slice(-2).map((log, idx) => (
            <div key={idx} className="bg-slate-950/70 border border-slate-900/60 px-2 py-0.5 rounded-lg text-[7.5px] font-medium text-slate-400 truncate text-center leading-normal shadow-sm">
              &gt; {log}
            </div>
          ))}
          {gameState.logs.length === 0 && (
            <div className="text-center text-[7.5px] text-slate-650 font-bold uppercase py-0.5">Trận đấu bắt đầu</div>
          )}
        </div>
      </div>

      {/* Modal overlay */}
      {gameState.activeModal && isAnimationDone && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-40 rounded-2xl flex flex-col items-center justify-center p-3 pointer-events-auto">
          <div className="w-full max-w-[260px]">
            {renderCenterStageModal()}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div ref={containerRef} className="w-full h-full overflow-hidden relative select-none">
      <GameBoard3D
        gameState={gameState}
        playerId={playerId}
        activePlayer={activePlayer}
        buildHouse={buildHouse}
        visualPositions={visualPositions}
        boardData={boardData}
        isHighlighted={(id) => highlightedTileId === id}
        isGroupMonopoly={(group, ownerId) => isGroupMonopoly(group, ownerId)}
        getPlayersOnTile={getPlayersOnTile}
        getOwnerColor={(ownerId) => {
          const owner = players.find((p) => p.id === ownerId);
          return owner?.color;
        }}
        getCurrentRent={(tile) => {
          const tileState = tiles.find((t) => t.id === tile.id);
          if (!tileState || !tileState.ownerId) return undefined;
          if (tile.type === 'property' && tile.rent) {
            if (tileState.hotel) return tile.rent[5];
            else if (tileState.houses > 0) return tile.rent[tileState.houses];
            else {
              const isMono = isGroupMonopoly(tile.group, tileState.ownerId);
              return isMono ? tile.rent[0] * 2 : tile.rent[0];
            }
          } else if (tile.type === 'railroad') {
            const count = tiles.filter(t => t.ownerId === tileState.ownerId && boardData.find(b => b.id === t.id)?.type === 'railroad').length;
            return [25, 50, 100, 200][count - 1] || 25;
          } else if (tile.type === 'utility') {
            const count = tiles.filter(t => t.ownerId === tileState.ownerId && boardData.find(b => b.id === t.id)?.type === 'utility').length;
            return count >= 2 ? '10x' : '4x';
          }
          return undefined;
        }}
        dice={dice}
        diceRolled={diceRolled}
        isMyTurn={isMyTurn}
        localDiceRolling={localDiceRolling}
        diceRevealActive={diceRevealActive}
        isAnimationDone={isAnimationDone}
        winnerId={winnerId}
        hudContent={hudContent}
      />
    </div>
  );
}
