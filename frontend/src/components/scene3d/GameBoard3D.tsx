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

// ─── Theme Colors (BRIGHTER for readability) ────────────────────────────────
const THEME_HEX: Record<string, { cell: string; frame: string; center: string }> = {
  neon:    { cell: '#1e293b', frame: '#0f172a', center: '#0f172a' },
  classic: { cell: '#134e30', frame: '#064e3b', center: '#052e16' },
  tet:     { cell: '#3b1010', frame: '#7f1d1d', center: '#450a0a' },
};

// ─── Group Color Mapping (vivid, bright for 3D) ─────────────────────────────
const GROUP_COLORS: Record<string, string> = {
  brown:      '#a16207',
  light_blue: '#22d3ee',
  pink:       '#f472b6',
  orange:     '#fb923c',
  red:        '#f87171',
  yellow:     '#facc15',
  green:      '#4ade80',
  dark_blue:  '#3b82f6',
  railroad:   '#64748b',
  utility:    '#2dd4bf',
  special:    '#475569',
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
  if (totalPlayers <= 1) return [0, 0.06, 0];
  const offsets: [number, number, number][] = [
    [-0.22, 0.06, -0.22], [0.22, 0.06, 0.22],
    [-0.22, 0.06, 0.22],  [0.22, 0.06, -0.22],
    [0, 0.06, -0.3],      [0, 0.06, 0.3],
  ];
  return offsets[playerIndex % offsets.length];
};

// ─── HIGH-RES CanvasTexture for Tile Label ──────────────────────────────────
// Resolution: 256 px per world unit for sharp text
const PX_SCALE = 256;

function makeTileTexture(
  tile: TileMetadata,
  w: number,
  h: number,
  groupColor: string,
  _cellColor: string,
  ownerColor?: string,
): THREE.CanvasTexture {
  const PX_W = Math.round(w * PX_SCALE);
  const PX_H = Math.round(h * PX_SCALE);
  const c = document.createElement('canvas');
  c.width = PX_W;
  c.height = PX_H;
  const ctx = c.getContext('2d')!;

  const isCorner = tile.id % 10 === 0;
  const isProperty = tile.type === 'property';

  // ─── Background: Lighter base so text is readable ───
  // Use a subtle dark-slate base, NOT pitch black
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, PX_W, PX_H);

  // ─── Thin border between tiles ───
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, PX_W - 2, PX_H - 2);

  // ─── Group color strip (30% of tile height for properties) ───
  if (isProperty && !isCorner) {
    const stripH = Math.round(PX_H * 0.30);
    ctx.fillStyle = groupColor;
    ctx.fillRect(0, 0, PX_W, stripH);
    // Subtle inner shadow on strip bottom
    const grad = ctx.createLinearGradient(0, stripH - 8, 0, stripH);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.3)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, stripH - 8, PX_W, 8);
  }

  // ─── Owner indicator (thick bright border) ───
  if (ownerColor) {
    ctx.strokeStyle = ownerColor;
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, PX_W - 6, PX_H - 6);
  }

  // ─── Tile Name (LARGER font for readability) ───
  const fontSize = isCorner ? 26 : 22;
  ctx.font = `bold ${fontSize}px "Inter", "Segoe UI", Arial, sans-serif`;
  ctx.fillStyle = '#f1f5f9';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Text position: below the color strip for properties, centered otherwise
  const textStartY = isProperty && !isCorner ? PX_H * 0.52 : PX_H * 0.38;

  // Word wrap
  const words = tile.name.split(' ');
  const maxW = PX_W - 16;
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

  const lineHeight = fontSize + 6;
  const startY = textStartY - ((lines.length - 1) * lineHeight) / 2;
  for (let i = 0; i < lines.length; i++) {
    // Text shadow for contrast
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillText(lines[i], PX_W / 2 + 1, startY + i * lineHeight + 1);
    ctx.fillStyle = '#f1f5f9';
    ctx.fillText(lines[i], PX_W / 2, startY + i * lineHeight);
  }

  // ─── Price (bottom area, bigger) ───
  if (tile.price && tile.type !== 'tax') {
    ctx.font = `bold 20px "Inter", "Segoe UI", Arial, sans-serif`;
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`$${tile.price}`, PX_W / 2, PX_H * 0.85);
  }

  // ─── Special tile icons ───
  if (tile.type === 'go') {
    ctx.font = 'bold 36px Arial';
    ctx.fillStyle = '#4ade80';
    ctx.fillText('→ GO', PX_W / 2, PX_H * 0.7);
  } else if (tile.type === 'tax') {
    ctx.font = 'bold 22px Arial';
    ctx.fillStyle = '#fb7185';
    ctx.fillText(`💰 $${tile.price}`, PX_W / 2, PX_H * 0.72);
  } else if (tile.type === 'chance') {
    ctx.font = 'bold 36px Arial';
    ctx.fillStyle = '#fbbf24';
    ctx.fillText('❓', PX_W / 2, PX_H * 0.65);
  } else if (tile.type === 'community_chest') {
    ctx.font = 'bold 30px Arial';
    ctx.fillStyle = '#34d399';
    ctx.fillText('🎁', PX_W / 2, PX_H * 0.65);
  } else if (tile.id === 10) {
    ctx.font = 'bold 24px Arial';
    ctx.fillStyle = '#fb7185';
    ctx.fillText('🔒 NHÀ TÙ', PX_W / 2, PX_H * 0.65);
  } else if (tile.id === 20) {
    ctx.font = 'bold 22px Arial';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('🅿️ NGHỈ', PX_W / 2, PX_H * 0.65);
  } else if (tile.id === 30) {
    ctx.font = 'bold 22px Arial';
    ctx.fillStyle = '#fb7185';
    ctx.fillText('🚔 VÀO TÙ!', PX_W / 2, PX_H * 0.65);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = 4;
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
    <group ref={ref} position={targetPosition} scale={[1.8, 1.8, 1.8]}>
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

  // Use group color tint for the body sides to give visual distinction
  const isProperty = tile.type === 'property' && tile.id % 10 !== 0;
  const sideColor = isProperty ? groupColor : cellColor;

  return (
    <group position={[cx, 0, cz]}>
      {/* Tile body (thicker for more 3D feel) */}
      <mesh position={[0, 0.03, 0]} receiveShadow castShadow>
        <boxGeometry args={[w, 0.06, l]} />
        <meshStandardMaterial
          color={sideColor}
          roughness={0.45}
          metalness={0.05}
          opacity={isProperty ? 0.6 : 0.4}
          transparent
        />
      </mesh>
      {/* Tile top face with CanvasTexture label */}
      <mesh position={[0, 0.061, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[w - 0.02, l - 0.02]} />
        <meshBasicMaterial map={topTexture} />
      </mesh>
      {/* Highlight glow ring */}
      {isHighlighted && (
        <mesh position={[0, 0.065, 0]}>
          <boxGeometry args={[w + 0.06, 0.008, l + 0.06]} />
          <meshBasicMaterial color="#818cf8" transparent opacity={0.55} />
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
        camera={{ position: [0, 10, 12], fov: 50 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        style={{ width: '100%', height: '100%', outline: 'none' }}
      >
        {/* ─── BRIGHT Lighting ─── */}
        <ambientLight intensity={1.2} />
        <directionalLight
          castShadow
          position={[6, 16, 8]}
          intensity={2.0}
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-far={30}
          shadow-camera-left={-10}
          shadow-camera-right={10}
          shadow-camera-top={10}
          shadow-camera-bottom={-10}
        />
        {/* Fill lights from multiple angles */}
        <directionalLight position={[-6, 8, -4]} intensity={0.6} />
        <pointLight position={[0, 8, 0]} intensity={0.8} color="#c4b5fd" />
        <pointLight position={[-7, 4, 7]} intensity={0.4} color="#22d3ee" />
        <pointLight position={[7, 4, -7]} intensity={0.4} color="#a78bfa" />
        <pointLight position={[7, 4, 7]} intensity={0.3} color="#fbbf24" />

        {/* ─── Camera Controls ─── */}
        <OrbitControls
          enableDamping
          dampingFactor={0.06}
          minDistance={6}
          maxDistance={20}
          maxPolarAngle={Math.PI / 2.5}
          target={[0, 0, 0]}
        />

        {/* ─── 1. Board Base (frame) ─── */}
        <mesh position={[0, -0.02, 0]} receiveShadow>
          <boxGeometry args={[13, 0.04, 13]} />
          <meshStandardMaterial color={themeColors.frame} roughness={0.35} metalness={0.2} />
        </mesh>

        {/* ─── 2. Center floor (slightly elevated) ─── */}
        <mesh position={[0, 0.005, 0]} receiveShadow>
          <boxGeometry args={[9.6, 0.01, 9.6]} />
          <meshStandardMaterial color={themeColors.center} roughness={0.5} metalness={0.05} />
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

        {/* ─── 5. Center HUD — FLAT on board surface ─── */}
        <Html
          center
          transform
          position={[0, 0.08, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={0.5}
          pointerEvents="auto"
          style={{ pointerEvents: 'auto' }}
        >
          <div className="w-[540px] pointer-events-auto">
            {hudContent}
          </div>
        </Html>

      </Canvas>
    </div>
  );
}
