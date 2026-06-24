import { useState, useEffect } from 'react';
import { Coins, Flame, Crown } from 'lucide-react';
import type { Player, TileState, TileMetadata } from '../types/game';
import boardDataRaw from '../data/board.json';

const boardData = boardDataRaw as TileMetadata[];

interface PlayerListProps {
  players: Player[];
  activePlayerIndex: number;
  tiles: TileState[];
  playerId: string;
}

export function PlayerList({ players, activePlayerIndex, tiles, playerId }: PlayerListProps) {
  // State so sánh số dư, số đất và nhóm độc quyền để kích hoạt hiệu ứng nổi bật (Floating Feedback)
  const [prevMoney, setPrevMoney] = useState<Record<string, number>>({});
  const [prevOwnedCount, setPrevOwnedCount] = useState<Record<string, number>>({});
  const [prevMonopolies, setPrevMonopolies] = useState<Record<string, string[]>>({});
  const [floatingTexts, setFloatingTexts] = useState<Record<string, { text: string; isPositive: boolean; key: number }[]>>({});

  const triggerFloating = (pId: string, text: string, isPositive: boolean) => {
    const key = Math.random() + Date.now();
    setFloatingTexts((prev) => ({
      ...prev,
      [pId]: [...(prev[pId] || []), { text, isPositive, key }]
    }));
  };

  const removeFloating = (pId: string, key: number) => {
    setFloatingTexts((prev) => ({
      ...prev,
      [pId]: (prev[pId] || []).filter((item) => item.key !== key)
    }));
  };

  useEffect(() => {
    const nextPrevMoney: Record<string, number> = {};
    const nextPrevOwnedCount: Record<string, number> = {};
    const nextPrevMonopolies: Record<string, string[]> = {};

    players.forEach((p) => {
      nextPrevMoney[p.id] = p.money;

      // Đếm số lượng đất sở hữu
      const owned = tiles.filter(t => t.ownerId === p.id);
      nextPrevOwnedCount[p.id] = owned.length;

      // Lấy danh sách nhóm màu
      const ownedProps = owned.map(t => boardData.find(b => b.id === t.id)).filter((b): b is TileMetadata => !!b);
      const playerMonopolies: string[] = [];
      const ownedGroups = Array.from(new Set(ownedProps.map(op => op.group)));
      ownedGroups.forEach(group => {
        const groupTiles = boardData.filter(b => b.group === group);
        const ownsAll = groupTiles.every(gt => tiles.find(t => t.id === gt.id)?.ownerId === p.id);
        if (ownsAll) {
          playerMonopolies.push(group);
        }
      });
      nextPrevMonopolies[p.id] = playerMonopolies;

      // --- So sánh trạng thái để kích hoạt thông báo bay lên (Floating Notification) ---
      const oldMoney = prevMoney[p.id];
      if (oldMoney !== undefined && oldMoney !== p.money) {
        const diff = p.money - oldMoney;
        let text = diff > 0 ? `+$${diff}` : `-$${Math.abs(diff)}`;

        if (p.position === 0 && diff === 200) {
          text += ' Bắt đầu';
        } else if (diff < 0) {
          const oldOwned = prevOwnedCount[p.id] || 0;
          if (owned.length > oldOwned) {
            text += ' Mua đất';
          }
        }
        triggerFloating(p.id, text, diff > 0);
      }

      // Thông báo mua được đất
      const oldOwned = prevOwnedCount[p.id];
      if (oldOwned !== undefined && owned.length > oldOwned) {
        triggerFloating(p.id, '🏠 Đã mua đất', true);
      }

      // Thông báo hoàn thành độc quyền màu
      const oldMonos = prevMonopolies[p.id] || [];
      const newMonos = playerMonopolies;
      const newlyCompleted = newMonos.filter(m => !oldMonos.includes(m));
      if (newlyCompleted.length > 0) {
        triggerFloating(p.id, '🎉 Độc quyền màu!', true);
      }
    });

    setPrevMoney(nextPrevMoney);
    setPrevOwnedCount(nextPrevOwnedCount);
    setPrevMonopolies(nextPrevMonopolies);
  }, [players, tiles]);

  // Hàm lấy các ô đất người chơi sở hữu
  const getOwnedProperties = (pId: string) => {
    return tiles
      .filter((t) => t.ownerId === pId)
      .map((t) => boardData.find((b) => b.id === t.id))
      .filter((b): b is TileMetadata => !!b);
  };

  // Tính tổng tài sản (Cash + Property cost + House cost)
  const getNetWorth = (player: Player) => {
    if (player.isBankrupt) return 0;
    const cash = player.money;
    const owned = tiles.filter(t => t.ownerId === player.id);
    let propertyValue = 0;
    owned.forEach(t => {
      const meta = boardData.find(b => b.id === t.id);
      if (meta) {
        propertyValue += meta.price || 0;
        propertyValue += (meta.housePrice || 50) * t.houses;
      }
    });
    return cash + propertyValue;
  };

  const groupColors: Record<string, string> = {
    brown: 'bg-amber-800',
    light_blue: 'bg-sky-400',
    pink: 'bg-pink-400',
    orange: 'bg-orange-500',
    red: 'bg-red-500',
    yellow: 'bg-yellow-400',
    green: 'bg-emerald-500',
    dark_blue: 'bg-blue-800',
    railroad: 'bg-slate-600',
    utility: 'bg-teal-500',
  };

  const playersWithWorth = players.map((p) => ({
    ...p,
    netWorth: getNetWorth(p),
    originalIndex: players.findIndex(orig => orig.id === p.id),
  }));

  // Sắp xếp giảm dần theo tài sản (người phá sản luôn xuống đáy)
  const sortedPlayers = [...playersWithWorth].sort((a, b) => {
    if (a.isBankrupt && !b.isBankrupt) return 1;
    if (!a.isBankrupt && b.isBankrupt) return -1;
    return b.netWorth - a.netWorth;
  });

  return (
    <div className="flex flex-col gap-2.5 w-full h-full select-none">
      <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5 shrink-0">
        <Coins size={14} className="text-amber-400" /> Bảng xếp hạng tỷ phú
      </h3>

      <div className="flex-grow overflow-y-auto space-y-2.5 pr-1">
        {sortedPlayers.map((player, sortedIdx) => {
          const isActive = player.originalIndex === activePlayerIndex;
          const isMe = player.id === playerId;
          const ownedProps = getOwnedProperties(player.id);
          const rank = sortedIdx + 1;

          // Xác định Huy hiệu trạng thái
          let statusBadge = null;
          if (player.isBankrupt) {
            statusBadge = (
              <span className="text-[8px] font-extrabold uppercase px-1.5 py-0.5 bg-red-950/80 text-red-400 border border-red-500/20 rounded">
                ☠️ Phá sản
              </span>
            );
          } else if (player.inJail) {
            statusBadge = (
              <span className="text-[8px] font-extrabold uppercase px-1.5 py-0.5 bg-slate-950 text-slate-400 border border-slate-750 rounded">
                🔒 Ở tù ({player.jailTurns} L)
              </span>
            );
          } else if (isActive) {
            statusBadge = (
              <span className="text-[8.5px] font-black uppercase px-1.5 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/25 rounded flex items-center gap-0.5 shrink-0 animate-pulse">
                <Flame size={9} /> Lượt đi
              </span>
            );
          } else if (rank === 1 && sortedPlayers.filter(p => !p.isBankrupt).length > 1) {
            statusBadge = (
              <span className="text-[8px] font-extrabold uppercase px-1.5 py-0.5 bg-yellow-500/10 text-yellow-400 border border-yellow-500/25 rounded flex items-center gap-0.5">
                <Crown size={8} /> Vua BĐS
              </span>
            );
          }

          // Lấy danh sách nhóm màu độc quyền
          const uniqueOwnedGroups = Array.from(new Set(ownedProps.map(p => p.group)));

          return (
            <div
              key={player.id}
              className={`relative flex items-center gap-3 bg-slate-900/35 border rounded-2xl p-2.5 transition-all duration-300 ${
                player.isBankrupt
                  ? 'opacity-35 border-slate-950 scale-95 grayscale shadow-none'
                  : isActive
                  ? 'bg-indigo-950/15 border-indigo-500 scale-[1.01] ring-1 ring-indigo-500/25 animate-turn-glow shadow-[0_0_18px_rgba(99,102,241,0.25)]'
                  : 'border-slate-850 hover:border-slate-800'
              }`}
            >
              {/* Floating Event Notification Text overlays */}
              {floatingTexts[player.id]?.map((item) => (
                <div
                  key={item.key}
                  className={`absolute left-10 pointer-events-none z-50 font-black text-[10px] tracking-wide uppercase px-2 py-0.5 rounded shadow-lg animate-float-up ${
                    item.isPositive
                      ? 'bg-emerald-950/90 border border-emerald-500/30 text-emerald-400'
                      : 'bg-red-950/90 border border-red-500/30 text-red-400'
                  }`}
                  onAnimationEnd={() => removeFloating(player.id, item.key)}
                >
                  {item.text}
                </div>
              ))}

              {/* Rank Circle Badge */}
              <span className={`text-[8.5px] font-black font-mono w-4.5 h-4.5 rounded-md flex items-center justify-center border shrink-0 ${
                player.isBankrupt
                  ? 'bg-slate-950 text-slate-700 border-slate-900'
                  : rank === 1
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.15)]'
                  : rank === 2
                  ? 'bg-slate-400/10 border-slate-400/30 text-slate-350'
                  : 'bg-slate-950 text-slate-500 border-slate-850'
              }`}>
                {rank}
              </span>

              {/* Avatar với vòng ring + glow phát sáng theo lượt */}
              <div className={`relative p-0.5 rounded-full transition-all duration-300 ${
                isActive && !player.isBankrupt
                  ? 'ring-2 ring-indigo-400 ring-offset-1 ring-offset-slate-900 animate-pulse'
                  : ''
              }`}>
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white shadow-md shrink-0 relative"
                  style={{
                    backgroundColor: player.color,
                    boxShadow: player.isBankrupt ? 'none' : `0 2px 6px ${player.color}40`
                  }}
                >
                  {player.name.charAt(0).toUpperCase()}
                  {isActive && !player.isBankrupt && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-indigo-400 border border-slate-950 rounded-full animate-ping" />
                  )}
                </div>
              </div>

              {/* Thông tin chi tiết */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={`font-black text-xs truncate ${isActive ? 'text-white' : 'text-slate-300'}`}>
                      {player.name}
                    </span>
                    {isMe && (
                      <span className="text-[7.5px] font-black text-indigo-400 tracking-wider bg-indigo-950/40 px-1 border border-indigo-900/20 rounded uppercase shrink-0">
                        Bạn
                      </span>
                    )}
                  </div>
                  {statusBadge}
                </div>

                {!player.isBankrupt ? (
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-xs font-black text-amber-400 font-mono tracking-tight">
                      ${player.money.toLocaleString()}
                    </span>
                    <span className="text-[8.5px] text-slate-500 font-bold">
                      TS: ${player.netWorth.toLocaleString()}
                    </span>
                  </div>
                ) : (
                  <span className="text-[9px] text-red-500 font-bold uppercase mt-0.5 block">Phá sản</span>
                )}

                {/* Nhóm màu sở hữu hiển thị dưới dạng chấm tròn nhỏ */}
                {!player.isBankrupt && uniqueOwnedGroups.length > 0 && (
                  <div className="flex gap-0.5 mt-1 overflow-x-auto scrollbar-none max-w-[120px]">
                    {uniqueOwnedGroups.map((group) => (
                      <span
                        key={group}
                        className={`w-1.5 h-1.5 rounded-full shrink-0 border border-slate-950 ${groupColors[group] || 'bg-slate-500'}`}
                        title={group}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Số lượng đất góc bên phải */}
              {!player.isBankrupt && (
                <div className="flex flex-col items-center justify-center bg-slate-950/40 border border-slate-850 px-2 py-1 rounded-xl shrink-0">
                  <span className="text-[7px] text-slate-500 font-black uppercase tracking-tight">Số đất</span>
                  <span className="text-xs font-black text-emerald-450 font-mono leading-none mt-0.5">
                    {ownedProps.length}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
