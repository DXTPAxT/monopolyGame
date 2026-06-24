import { Home, Landmark, ShieldAlert, AlertCircle, HelpCircle, Gift } from 'lucide-react';
import type { TileMetadata, TileState, Player } from '../types/game';
import type { CSSProperties } from 'react';
import { tokenEmoji } from '../data/skins';
import { getBoardTheme, type BoardTheme } from '../data/boardThemes';

interface CellProps {
  tile: TileMetadata;
  tileState: TileState;
  playersOnTile: Player[];
  activePlayerId: string;
  onBuildHouse: (tileId: number) => void;
  ownerColor?: string;
  isHighlighted?: boolean;
  isMonopoly?: boolean;
  isSelectingFreeUpgrade?: boolean;
  onSelectFreeUpgrade?: (tileId: number) => void;
  currentRent?: number | string;
  theme?: BoardTheme;
}

// Khối nhà nhỏ 3D (CSS) — màu xanh, có mặt nóc sáng để tạo cảm giác nổi
const HouseBlock = () => (
  <span
    className="inline-block w-2 h-2 md:w-2.5 md:h-2.5 rounded-[2px] bg-gradient-to-b from-emerald-300 to-emerald-600 border border-emerald-900/70 shadow-[0_2px_2px_rgba(0,0,0,0.55)] animate-[bounce_0.4s_ease-out]"
    style={{ boxShadow: '0 2px 2px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.5)' }}
  />
);

// Khối khách sạn 3D (CSS) — màu đỏ, to hơn
const HotelBlock = () => (
  <span
    className="inline-block w-3.5 h-2.5 md:w-4 md:h-3 rounded-[2px] bg-gradient-to-b from-rose-400 to-rose-600 border border-rose-900/70 animate-[bounce_0.4s_ease-out]"
    style={{ boxShadow: '0 2px 3px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.45)' }}
  />
);

// Hàm tính tọa độ grid cho ô cờ (0-39) tương ứng với Grid 11x11
function getGridPosition(id: number): CSSProperties {
  if (id >= 0 && id <= 10) {
    // Cạnh dưới (Phải qua Trái): 0 (11,11) -> 10 (11,1)
    return {
      gridRowStart: 11,
      gridColumnStart: 11 - id,
    };
  } else if (id >= 11 && id <= 20) {
    // Cạnh trái (Dưới lên Trên): 11 (10,1) -> 20 (1,1)
    return {
      gridRowStart: 21 - id,
      gridColumnStart: 1,
    };
  } else if (id >= 21 && id <= 30) {
    // Cạnh trên (Trái qua Phải): 21 (1,2) -> 30 (1,11)
    return {
      gridRowStart: 1,
      gridColumnStart: id - 19,
    };
  } else {
    // Cạnh phải (Trên xuống Dưới): 31 (2,11) -> 39 (10,11)
    return {
      gridRowStart: id - 29,
      gridColumnStart: 11,
    };
  }
}

export function Cell({ tile, tileState, playersOnTile, activePlayerId, onBuildHouse, ownerColor, isHighlighted, isMonopoly, currentRent, theme }: CellProps) {
  const gridStyle = getGridPosition(tile.id);
  const isCorner = tile.id % 10 === 0;
  const t = theme ?? getBoardTheme();

  // Lấy màu nhóm cho dải đầu ô cờ - Tăng độ bão hòa màu sắc Monopoly cực độ
  const groupColors: Record<string, string> = {
    brown: 'bg-amber-700 border-amber-800',
    light_blue: 'bg-cyan-400 border-cyan-500',
    pink: 'bg-pink-500 border-pink-650',
    orange: 'bg-orange-500 border-orange-600',
    red: 'bg-red-500 border-red-650',
    yellow: 'bg-yellow-400 border-yellow-500',
    green: 'bg-emerald-500 border-emerald-600',
    dark_blue: 'bg-blue-600 border-blue-750',
  };

  const colorBarClass = groupColors[tile.group] || '';

  // Xác định icon cho các ô đặc biệt
  const renderIcon = () => {
    switch (tile.type) {
      case 'tax':
        return <ShieldAlert size={14} className="text-red-400 font-bold" />;
      case 'chance':
        return <HelpCircle size={16} className="text-amber-400 font-bold" />;
      case 'community_chest':
        return <Gift size={16} className="text-emerald-450 font-bold" />;
      case 'railroad':
        return <Landmark size={14} className="text-slate-400 font-bold" />;
      case 'utility':
        return <AlertCircle size={14} className="text-teal-400" />;
      default:
        return null;
    }
  };

  // Xác định định dạng hiển thị cho các ô góc
  const getCornerLayout = () => {
    if (tile.id === 0) return 'text-emerald-400 font-black border-2 border-emerald-500/25';
    if (tile.id === 10) return 'text-slate-400 font-bold border border-slate-700';
    if (tile.id === 20) return 'text-slate-400 font-bold border border-slate-700';
    if (tile.id === 30) return 'text-red-400 font-extrabold border-2 border-red-500/25';
    return '';
  };

  // Render dải màu Ownership Strip ở viền trong (Primary Signal - Dải màu lớn nổi bật)
  const renderInnerOwnershipStrip = () => {
    if (!ownerColor) return null;
    if (tile.id >= 0 && tile.id <= 10) {
      // Cạnh dưới -> viền trong nằm ở TOP
      return <div className="absolute top-0 left-0 right-0 z-20" style={{ backgroundColor: ownerColor, height: '4px' }} />;
    } else if (tile.id >= 11 && tile.id <= 20) {
      // Cạnh trái -> viền trong nằm ở RIGHT
      return <div className="absolute top-0 bottom-0 right-0 z-20" style={{ backgroundColor: ownerColor, width: '4px' }} />;
    } else if (tile.id >= 21 && tile.id <= 30) {
      // Cạnh trên -> viền trong nằm ở BOTTOM
      return <div className="absolute bottom-0 left-0 right-0 z-20" style={{ backgroundColor: ownerColor, height: '4px' }} />;
    } else {
      // Cạnh phải -> viền trong nằm ở LEFT
      return <div className="absolute top-0 bottom-0 left-0 z-20" style={{ backgroundColor: ownerColor, width: '4px' }} />;
    }
  };

  // Xác định cạnh chứa ô cờ để xoay hướng colorBar, houses và pawns
  let edge: 'bottom' | 'left' | 'top' | 'right' | 'corner' = 'corner';
  if (!isCorner) {
    if (tile.id > 0 && tile.id < 10) edge = 'bottom';
    else if (tile.id > 10 && tile.id < 20) edge = 'left';
    else if (tile.id > 20 && tile.id < 30) edge = 'top';
    else if (tile.id > 30 && tile.id < 40) edge = 'right';
  }

  const isHorizontalCell = edge === 'left' || edge === 'right';
  const showColorBar = tile.type === 'property' && !isCorner;

  // Render Nhà / Khách Sạn theo mô hình mới (1-4 nhà hoặc 1 khách sạn) — khối 3D CSS
  const renderHouses = () => {
    if (!ownerColor || (tileState.houses === 0 && !tileState.hotel)) return null;
    let positionClass = '';

    if (edge === 'bottom') {
      positionClass = 'top-1 left-1/2 -translate-x-1/2 flex-row';
    } else if (edge === 'top') {
      positionClass = 'bottom-1 left-1/2 -translate-x-1/2 flex-row';
    } else if (edge === 'left') {
      positionClass = 'right-1 top-1/2 -translate-y-1/2 flex-col';
    } else if (edge === 'right') {
      positionClass = 'left-1 top-1/2 -translate-y-1/2 flex-col';
    } else {
      return null;
    }

    return (
      <div className={`absolute z-10 pointer-events-none stand-up-detail flex items-center gap-0.5 ${positionClass}`}>
        {tileState.hotel ? (
          <HotelBlock />
        ) : (
          Array.from({ length: tileState.houses }).map((_, i) => <HouseBlock key={i} />)
        )}
      </div>
    );
  };

  // Cờ sở hữu (Secondary Signal) đặt đối xứng phù hợp
  const renderOwnerFlag = () => {
    let positionClass = '';
    if (edge === 'bottom') {
      positionClass = 'absolute bottom-1 right-1';
    } else if (edge === 'top') {
      positionClass = 'absolute top-1 left-1';
    } else if (edge === 'left') {
      positionClass = 'absolute top-1 left-1';
    } else if (edge === 'right') {
      positionClass = 'absolute bottom-1 right-1';
    } else {
      positionClass = 'absolute bottom-1 right-1';
    }

    return (
      <div className={`${positionClass} z-10 flex items-center pointer-events-none stand-up-detail`}>
        <span className="w-[1px] h-2 bg-slate-500" />
        <span className="w-2 h-1.5 -ml-[1px] -mt-0.5 rounded-sm shadow-[0_1px_1.5px_rgba(0,0,0,0.5)]" style={{ backgroundColor: ownerColor }} />
      </div>
    );
  };

  // Render quân cờ đứng ở các ô (sắp xếp hợp lý tránh che khuất thông tin)
  const renderPawns = () => {
    let positionClass = '';

    if (edge === 'bottom') {
      // Đặt ở góc dưới tránh color bar ở trên
      positionClass = 'absolute inset-x-0 bottom-1 flex-row';
    } else if (edge === 'top') {
      // Đặt ở góc trên tránh color bar ở dưới
      positionClass = 'absolute inset-x-0 top-1 flex-row';
    } else if (edge === 'left') {
      // Đặt ở góc trái tránh color bar ở bên phải
      positionClass = 'absolute inset-y-0 left-1 flex-col';
    } else if (edge === 'right') {
      // Đặt ở góc phải tránh color bar ở bên trái
      positionClass = 'absolute inset-y-0 right-1 flex-col';
    } else {
      positionClass = 'absolute inset-0 flex-row';
    }

    return (
      <div className={`absolute flex items-center justify-center flex-wrap gap-0.5 z-30 pointer-events-none ${positionClass}`}>
        {playersOnTile.map((player) => {
          const isLanded = player.position === tile.id;
          return (
            <div
              key={player.id}
              className={`w-7 h-7 md:w-8 md:h-8 rounded-full border-2 flex items-center justify-center text-base md:text-lg transition-all stand-up-pawn pointer-events-auto ${
                isLanded ? 'animate-pawn-land' : 'animate-pawn-walk'
              }`}
              style={{
                background: `radial-gradient(circle at 50% 30%, ${player.color}, ${player.color}bb)`,
                borderColor: '#0f172a',
                boxShadow: `0 3px 4px rgba(0,0,0,0.55), 0 0 5px ${player.color}90, inset 0 1px 0 rgba(255,255,255,0.45)`,
              }}
              title={player.name}
            >
              <span style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.65))' }}>
                {tokenEmoji(player.tokenSkin)}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  let cellBgClass = `${t.cellBg} ${t.cellBorder}`;
  if (tile.type === 'chance') {
    cellBgClass = 'bg-amber-950/15 border-amber-500/20';
  } else if (tile.type === 'community_chest') {
    cellBgClass = 'bg-emerald-950/15 border-emerald-500/20';
  } else if (tile.type === 'tax') {
    cellBgClass = 'bg-red-950/10 border-red-500/15';
  } else if (tile.type === 'railroad') {
    cellBgClass = 'bg-slate-900/50 border-slate-800/60';
  } else if (tile.type === 'utility') {
    cellBgClass = 'bg-teal-950/10 border-teal-500/15';
  } else if (tile.id === 30) { // Go to jail
    cellBgClass = 'bg-rose-950/10 border-rose-500/15';
  } else if (tile.id === 10) { // Jail
    cellBgClass = 'bg-slate-900/60 border-slate-800/80';
  }

  const cellClass = `relative ${cellBgClass} border flex overflow-hidden select-none group/cell transition-all duration-300 ${
    isCorner ? 'p-1.5 justify-center items-center ' + getCornerLayout() : 'p-0.5'
  } ${
    isHorizontalCell ? 'flex-row' : 'flex-col'
  } ${isHighlighted ? 'animate-tile-pulse' : ''} ${isMonopoly ? 'animate-monopoly-glow' : ''}`;

  return (
    <div
      className={cellClass}
      style={{
        ...gridStyle,
        borderColor: ownerColor || undefined,
        borderWidth: ownerColor ? '1.25px' : undefined,
        ...((isMonopoly && ownerColor) ? { '--glow-color': `${ownerColor}b0` } as any : {})
      }}
    >
      {/* Viền màu sở hữu trong (Primary Signal) */}
      {renderInnerOwnershipStrip()}

      {/* Render Color Bar nếu ở CẠNH DƯỚI (Top bar) hoặc CẠNH PHẢI (Left bar) */}
      {showColorBar && (edge === 'bottom' || edge === 'right') && (
        <div className={edge === 'bottom' ? `h-2 w-full rounded-sm mb-0.5 shrink-0 ${colorBarClass}` : `w-2 h-full rounded-sm mr-0.5 shrink-0 ${colorBarClass}`} />
      )}

      {/* Main Content Area */}
      <div className="flex-grow flex flex-col justify-between w-full h-full relative">
        {/* A. Tên ô cờ */}
        <div className={`text-[11px] md:text-[12.5px] font-extrabold text-center leading-tight ${isCorner ? 'text-[12.5px] md:text-[14px] font-black' : t.cellText} stand-up-detail`}>
          {tile.name}
        </div>

        {/* B. Icon ở giữa (nếu có) */}
        <div className="flex flex-col items-center justify-center flex-grow gap-0.5">
          {renderIcon()}

          {/* Ô GO hiện tiền thưởng khi đi qua */}
          {tile.id === 0 && (
            <span className="text-[9px] md:text-[10px] font-black text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-800/40 tracking-tight font-sans leading-none shadow-md">
              Nhận $200
            </span>
          )}

          {/* Giá hiện ngay dưới icon cho các ô đặc biệt (railroad/utility/tax) — ẩn giá khi chưa có người sở hữu, hiện tiền thuê khi đã được mua */}
          {tile.type !== 'property' && !isCorner && tileState.ownerId && currentRent !== undefined && (
            <span className="text-[8.5px] font-black text-rose-400 bg-rose-950/60 px-1 rounded border border-rose-900/40 tracking-tight font-sans leading-none shadow-sm">
              Thuê: ${currentRent}
            </span>
          )}

          {/* Nút bấm xây nhà nhanh */}
          {tile.type === 'property' && tileState.ownerId === activePlayerId && !tileState.hotel && !tileState.mortgaged && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onBuildHouse(tile.id);
              }}
              className="hidden group-hover/cell:flex items-center gap-0.5 bg-indigo-600 hover:bg-indigo-500 text-[10px] font-bold px-1.5 py-0.5 rounded text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-25 shadow-lg active:scale-95 transition-all"
              title="Xây nhà / khách sạn"
            >
              <Home size={10} /> +$
            </button>
          )}
        </div>

        {/* C. Giá tiền ở dưới — chỉ dành cho ô đất property (ẩn giá khi chưa có người sở hữu, hiện tiền thuê khi đã được mua) */}
        {!isCorner && tile.type === 'property' && tileState.ownerId && currentRent !== undefined && (
          <div className="flex items-center justify-center w-full mt-0.5">
            <span className="text-[9.5px] md:text-[10.5px] font-black text-rose-400 bg-rose-950/60 px-1.5 py-0.5 rounded border border-rose-900/40 tracking-tight font-sans stand-up-detail shadow-md">
              Thuê: ${currentRent}
            </span>
          </div>
        )}
      </div>

      {/* Render Color Bar nếu ở CẠNH TRÊN (Bottom bar) hoặc CẠNH TRÁI (Right bar) */}
      {showColorBar && (edge === 'top' || edge === 'left') && (
        <div className={edge === 'top' ? `h-2 w-full rounded-sm mt-0.5 shrink-0 ${colorBarClass}` : `w-2 h-full rounded-sm ml-0.5 shrink-0 ${colorBarClass}`} />
      )}

      {/* Nhà / Khách Sạn */}
      {!isCorner && (tileState.houses > 0 || tileState.hotel) && renderHouses()}

      {/* Cờ sở hữu phụ */}
      {ownerColor && !isCorner && renderOwnerFlag()}

      {/* Danh sách người chơi trên ô */}
      {playersOnTile.length > 0 && renderPawns()}

    </div>
  );
}
