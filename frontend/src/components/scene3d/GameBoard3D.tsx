import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { Token3D } from './Token3D';
import type { GameState, Player, TileMetadata } from '../../types/game';
import { getBoardTheme } from '../../data/boardThemes';

// ─── Props ──────────────────────────────────────────────────────────────────
interface GameBoard3DProps {
  gameState: GameState;
  playerId: string;
  activePlayer?: Player;
  buildHouse: (tileId: number) => void;
  visualPositions: Record<string, number>;
  boardData: TileMetadata[];
  isHighlighted: (tileId: number) => boolean;
  isGroupMonopoly: (group: string, ownerId?: string) => boolean;
  getPlayersOnTile: (tileId: number) => Player[];
  getOwnerColor: (ownerId?: string) => string | undefined;
  getCurrentRent: (tile: TileMetadata) => number | string | undefined;
  // HUD props passed through from Board.tsx
  dice: [number, number];
  diceRolled: boolean;
  isMyTurn: boolean;
  localDiceRolling: boolean;
  diceRevealActive: boolean;
  isAnimationDone: boolean;
  winnerId?: string;
  hudContent: React.ReactNode;
}

// ─── Theme Hex Color Mapping ────────────────────────────────────────────────
const THEME_HEX: Record<string, { cell: string; frame: string; center: string }> = {
  neon:    { cell: '#131b2e', frame: '#020617', center: '#0a0f1e' },
  classic: { cell: '#0a2a1a', frame: '#064e3b', center: '#052e16' },
  tet:     { cell: '#2a0a0a', frame: '#7f1d1d', center: '#450a0a' },
};

// ─── Group Color Mapping (3D hex values) ────────────────────────────────────
const GROUP_COLORS: Record<string, string> = {
  brown:      '#92400e',
  light_blue: '#22d3ee',
  pink:       '#ec4899',
  orange:     '#f97316',
  red:        '#ef4444',
  yellow:     '#eab308',
  green:      '#22c55e',
  dark_blue:  '#2563eb',
  railroad:   '#475569',
  utility:    '#14b8a6',
  special:    '#334155',
};

// ─── 3D Grid Coordinate Math ────────────────────────────────────────────────
const TILE_SPACING = 1.06;
const BOARD_HALF = 5.3;

const get3DCoordinate = (id: number): [number, number, number] => {
  if (id >= 0 && id <= 10) {
    return [BOARD_HALF - id * TILE_SPACING, 0, BOARD_HALF];
  } else if (id >= 11 && id <= 20) {
    return [-BOARD_HALF, 0, BOARD_HALF - (id - 10) * TILE_SPACING];
  } else if (id >= 21 && id <= 30) {
    return [-BOARD_HALF + (id - 20) * TILE_SPACING, 0, -BOARD_HALF];
  } else {
    return [BOARD_HALF, 0, -BOARD_HALF + (id - 30) * TILE_SPACING];
  }
};

// ─── Tile dimensions ────────────────────────────────────────────────────────
const getTileDimensions = (id: number): { w: number; l: number } => {
  const isCorner = id % 10 === 0;
  if (isCorner) return { w: 1.48, l: 1.48 };
  if ((id > 10 && id < 20) || (id > 30 && id < 40)) return { w: 1.48, l: 1.02 };
  return { w: 1.02, l: 1.48 };
};

// ─── Offset for multiple players on same tile ──────────────────────────────
const getTokenOffset = (playerIndex: number, totalPlayers: number): [number, number, number] => {
  if (totalPlayers <= 1) return [0, 0.04, 0];
  const offsets: [number, number, number][] = [
    [-0.22, 0.04, -0.22], [0.22, 0.04, 0.22],
    [-0.22, 0.04, 0.22],  [0.22, 0.04, -0.22],
    [0, 0.04, -0.3],      [0, 0.04, 0.3],
  ];
  return offsets[playerIndex % offsets.length];
};

// ─── CanvasTexture for Tile Label ───────────────────────────────────────────
function makeTileTexture(
  tile: TileMetadata,
  w: number,
  h: number,
  groupColor: string,
  cellColor: string,
  ownerColor?: string,
): THREE.CanvasTexture {
  const PX_W = Math.round(w * 128);
  const PX_H = Math.round(h * 128);
  const c = document.createElement('canvas');
  c.width = PX_W;
  c.height = PX_H;
  const ctx = c.getContext('2d')!;

  // Background
  ctx.fillStyle = cellColor;
  ctx.fillRect(0, 0, PX_W, PX_H);

  // Group color strip (top 16% of tile)
  const isCorner = tile.id % 10 === 0;
  if (tile.type === 'property' && !isCorner) {
    const stripH = Math.round(PX_H * 0.18);
    ctx.fillStyle = groupColor;
    ctx.fillRect(0, 0, PX_W, stripH);
  }

  // Owner indicator border
  if (ownerColor) {
    ctx.strokeStyle = ownerColor;
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, PX_W - 4, PX_H - 4);
  }

  // Tile name text
  const fontSize = isCorner ? 13 : 11;
  ctx.font = `bold ${fontSize}px "Inter", "Segoe UI", Arial, sans-serif`;
  ctx.fillStyle = '#e2e8f0';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const textY = tile.type === 'property' && !isCorner
    ? PX_H * 0.45
    : PX_H * 0.35;

  // Word wrap for long names
  const words = tile.name.split(' ');
  const maxW = PX_W - 8;
  const lines: string[] = [];
  let currentLine = '';
  for (const word of words) {
    const testLine = currentLine ? currentLine + ' ' + word : word;
    if (ctx.measureText(testLine).width > maxW && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);

  const lineHeight = fontSize + 3;
  const startY = textY - ((lines.length - 1) * lineHeight) / 2;
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], PX_W / 2, startY + i * lineHeight);
  }

  // Price text (bottom)
  if (tile.price && tile.type !== 'tax') {
    ctx.font = `bold 10px "Inter", "Segoe UI", Arial, sans-serif`;
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`$${tile.price}`, PX_W / 2, PX_H * 0.82);
  }

  // Special tile icons (text-based)
  if (tile.type === 'go') {
    ctx.font = 'bold 18px Arial';
    ctx.fillStyle = '#22c55e';
    ctx.fillText('→ GO', PX_W / 2, PX_H * 0.7);
  } else if (tile.type === 'tax') {
    ctx.font = 'bold 10px Arial';
    ctx.fillStyle = '#f87171';
    ctx.fillText(`$${tile.price}`, PX_W / 2, PX_H * 0.7);
  } else if (tile.type === 'chance') {
    ctx.font = 'bold 16px Arial';
    ctx.fillStyle = '#fbbf24';
    ctx.fillText('?', PX_W / 2, PX_H * 0.65);
  } else if (tile.type === 'community_chest') {
    ctx.font = 'bold 14px Arial';
    ctx.fillStyle = '#34d399';
    ctx.fillText('🎁', PX_W / 2, PX_H * 0.65);
  } else if (tile.id === 10) {
    ctx.font = 'bold 12px Arial';
    ctx.fillStyle = '#f87171';
    ctx.fillText('NHÀ TÙ', PX_W / 2, PX_H * 0.65);
  } else if (tile.id === 20) {
    ctx.font = 'bold 10px Arial';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('NGHỈ CHÂN', PX_W / 2, PX_H * 0.65);
  } else if (tile.id === 30) {
    ctx.font = 'bold 10px Arial';
    ctx.fillStyle = '#f87171';
    ctx.fillText('VÀO TÙ!', PX_W / 2, PX_H * 0.65);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

// ─── Component: Moving Token with Lerp Animation ───────────────────────────
function AnimatedToken({
  skinId, color, currentTileId, playerIndex, totalPlayers,
}: {
  skinId: string; color: string; currentTileId: number;
  playerIndex: number; totalPlayers: number;
}) {
  const ref = useRef<THREE.Group>(null!);

  const targetPosition = useMemo(() => {
    const coord = get3DCoordinate(currentTileId);
    const offset = getTokenOffset(playerIndex, totalPlayers);
    return new THREE.Vector3(coord[0] + offset[0], coord[1] + offset[1], coord[2] + offset[2]);
  }, [currentTileId, playerIndex, totalPlayers]);

  useFrame((_s, delta) => {
    if (ref.current) {
      ref.current.position.lerp(targetPosition, Math.min(1, delta * 8.5));
    }
  });

  return (
    <group ref={ref} position={targetPosition} scale={[1.6, 1.6, 1.6]}>
      <Token3D skinId={skinId} color={color} />
    </group>
  );
}

// ─── Component: Single 3D Tile ─────────────────────────────────────────────
function Tile3D({
  tile, ownerColor, groupColor, cellColor, isHighlighted,
}: {
  tile: TileMetadata; ownerColor?: string; groupColor: string;
  cellColor: string; isHighlighted: boolean;
}) {
  const [cx, , cz] = get3DCoordinate(tile.id);
  const { w, l } = getTileDimensions(tile.id);

  const topTexture = useMemo(
    () => makeTileTexture(tile, w, l, groupColor, cellColor, ownerColor),
    [tile, w, l, groupColor, cellColor, ownerColor],
  );

  return (
    <group position={[cx, 0, cz]}>
      {/* Tile body */}
      <mesh position={[0, 0.025, 0]} receiveShadow castShadow>
        <boxGeometry args={[w, 0.05, l]} />
        <meshStandardMaterial
          color={groupColor !== '#334155' ? groupColor : cellColor}
          roughness={0.5}
          metalness={0.1}
          opacity={0.35}
          transparent
        />
      </mesh>
      {/* Tile top face with CanvasTexture label */}
      <mesh position={[0, 0.051, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[w - 0.02, l - 0.02]} />
        <meshBasicMaterial map={topTexture} transparent />
      </mesh>
      {/* Highlight glow */}
      {isHighlighted && (
        <mesh position={[0, 0.06, 0]}>
          <boxGeometry args={[w + 0.04, 0.005, l + 0.04]} />
          <meshBasicMaterial color="#818cf8" transparent opacity={0.5} />
        </mesh>
      )}
    </group>
  );
}

// ─── Main Component 3D Board Canvas ─────────────────────────────────────────
export function GameBoard3D({
  gameState,
  playerId: _playerId,
  activePlayer: _activePlayer,
  buildHouse: _buildHouse,
  visualPositions,
  boardData,
  isHighlighted,
  isGroupMonopoly: _isGroupMonopoly,
  getPlayersOnTile: _getPlayersOnTile,
  getOwnerColor,
  getCurrentRent: _getCurrentRent,
  hudContent,
}: GameBoard3DProps) {
  const boardTheme = getBoardTheme(gameState.settings?.boardSkin);
  const themeColors = THEME_HEX[boardTheme.id] || THEME_HEX.neon;

  return (
    <div className="w-full h-full relative select-none">
      <Canvas
        shadows
        camera={{ position: [0, 8, 11], fov: 55 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        style={{ width: '100%', height: '100%', outline: 'none' }}
      >
        {/* ─── Lighting ─── */}
        <ambientLight intensity={0.8} />
        <directionalLight
          castShadow
          position={[8, 14, 6]}
          intensity={1.6}
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-far={30}
          shadow-camera-left={-10}
          shadow-camera-right={10}
          shadow-camera-top={10}
          shadow-camera-bottom={-10}
        />
        <pointLight position={[0, 6, 0]} intensity={0.6} color="#818cf8" />
        <pointLight position={[-6, 3, 6]} intensity={0.3} color="#22d3ee" />
        <pointLight position={[6, 3, -6]} intensity={0.3} color="#a78bfa" />

        {/* ─── Camera Controls ─── */}
        <OrbitControls
          enableDamping
          dampingFactor={0.06}
          minDistance={5}
          maxDistance={18}
          maxPolarAngle={Math.PI / 2.3}
          target={[0, 0, 0]}
        />

        {/* ─── 1. Board Base ─── */}
        <mesh position={[0, -0.03, 0]} receiveShadow>
          <boxGeometry args={[12.8, 0.06, 12.8]} />
          <meshStandardMaterial color={themeColors.frame} roughness={0.4} metalness={0.15} />
        </mesh>

        {/* ─── 2. Center floor ─── */}
        <mesh position={[0, 0.001, 0]} receiveShadow>
          <boxGeometry args={[9.54, 0.002, 9.54]} />
          <meshStandardMaterial color={themeColors.center} roughness={0.6} />
        </mesh>

        {/* ─── 3. Render 40 Tiles ─── */}
        {boardData.map((tile) => {
          const tileState = gameState.tiles[tile.id];
          const ownerColor = getOwnerColor(tileState?.ownerId);
          const groupColor = GROUP_COLORS[tile.group] || GROUP_COLORS.special;

          return (
            <Tile3D
              key={tile.id}
              tile={tile}
              ownerColor={ownerColor}
              groupColor={groupColor}
              cellColor={themeColors.cell}
              isHighlighted={isHighlighted(tile.id)}
            />
          );
        })}

        {/* ─── 4. Render 3D Tokens ─── */}
        {gameState.players.map((p, idx) => {
          const currentTileId = visualPositions[p.id] ?? p.position;
          return (
            <AnimatedToken
              key={p.id}
              skinId={p.tokenSkin}
              color={p.color}
              currentTileId={currentTileId}
              playerIndex={idx}
              totalPlayers={gameState.players.length}
            />
          );
        })}

        {/* ─── 5. Center HUD (Html in 3D space, stuck to board center) ─── */}
        <Html
          center
          transform
          position={[0, 0.1, 0]}
          rotation={[-Math.PI / 4, 0, 0]}
          distanceFactor={8}
          pointerEvents="auto"
          style={{ pointerEvents: 'auto' }}
        >
          <div className="w-[280px] pointer-events-auto">
            {hudContent}
          </div>
        </Html>

      </Canvas>
    </div>
  );
}
