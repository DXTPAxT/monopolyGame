import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { Token3D } from './Token3D';
import { Cell } from '../Cell';
import type { GameState, Player, TileMetadata } from '../../types/game';
import { getBoardTheme } from '../../data/boardThemes';

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
}

// ─── Theme Hex Color Mapping ────────────────────────────────────────────────
const THEME_HEX: Record<string, { cell: string; frame: string; gridLines: string }> = {
  neon: { cell: '#0f172a', frame: '#020617', gridLines: '#1e293b' },
  classic: { cell: '#022c22', frame: '#064e3b', gridLines: '#047857' },
  tet: { cell: '#450a0a', frame: '#7f1d1d', gridLines: '#d97706' },
};

// ─── 3D Grid Coordinate Math ────────────────────────────────────────────────
const get3DCoordinate = (id: number): [number, number, number] => {
  const size = 5.3;
  const spacing = 1.06;

  if (id >= 0 && id <= 10) {
    // Cạnh dưới (South): 0 bên phải, 10 bên trái
    return [size - id * spacing, 0, size];
  } else if (id >= 11 && id <= 20) {
    // Cạnh trái (West): 10 bên dưới, 20 bên trên
    return [-size, 0, size - (id - 10) * spacing];
  } else if (id >= 21 && id <= 30) {
    // Cạnh trên (North): 20 bên trái, 30 bên phải
    return [-size + (id - 20) * spacing, 0, -size];
  } else {
    // Cạnh phải (East): 30 bên trên, 40 bên dưới (39 là kế bên 0)
    return [size, 0, -size + (id - 30) * spacing];
  }
};

// ─── Offset for multiple players on same tile ──────────────────────────────
const getTokenOffset = (playerIndex: number, totalPlayers: number): [number, number, number] => {
  if (totalPlayers <= 1) return [0, 0.04, 0];
  
  const offsets: [number, number, number][] = [
    [-0.24, 0.04, -0.24],
    [0.24, 0.04, 0.24],
    [-0.24, 0.04, 0.24],
    [0.24, 0.04, -0.24],
    [0, 0.04, -0.3],
    [0, 0.04, 0.3],
  ];
  return offsets[playerIndex % offsets.length] || [0, 0.04, 0];
};

const getRotationY = (id: number): number => {
  if (id >= 0 && id <= 10) return 0;
  if (id >= 11 && id <= 20) return Math.PI / 2;
  if (id >= 21 && id <= 30) return Math.PI;
  return -Math.PI / 2;
};

// ─── Component: Moving Token with Lerp Animation ───────────────────────────
function AnimatedToken({
  skinId,
  color,
  currentTileId,
  playerIndex,
  totalPlayers,
}: {
  skinId: string;
  color: string;
  currentTileId: number;
  playerIndex: number;
  totalPlayers: number;
}) {
  const ref = useRef<THREE.Group>(null!);

  const targetPosition = useMemo(() => {
    const coord = get3DCoordinate(currentTileId);
    const offset = getTokenOffset(playerIndex, totalPlayers);
    return new THREE.Vector3(coord[0] + offset[0], coord[1] + offset[1], coord[2] + offset[2]);
  }, [currentTileId, playerIndex, totalPlayers]);

  useFrame((_state, delta) => {
    if (ref.current) {
      ref.current.position.lerp(targetPosition, Math.min(1, delta * 8.5));
    }
  });

  return (
    <group ref={ref} position={targetPosition}>
      <Token3D skinId={skinId} color={color} />
    </group>
  );
}

// ─── Main Component 3D Board Canvas ─────────────────────────────────────────
export function GameBoard3D({
  gameState,
  playerId: _playerId,
  activePlayer,
  buildHouse,
  visualPositions,
  boardData,
  isHighlighted,
  isGroupMonopoly,
  getPlayersOnTile: _getPlayersOnTile,
  getOwnerColor,
  getCurrentRent,
}: GameBoard3DProps) {
  const boardTheme = getBoardTheme(gameState.settings?.boardSkin);
  const themeColors = THEME_HEX[boardTheme.id] || THEME_HEX.neon;

  return (
    <div className="w-full h-full relative select-none">
      <Canvas
        shadows
        camera={{ position: [0, 6.0, 9.8], fov: 60 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        style={{ width: '100%', height: '100%', outline: 'none' }}
      >
        {/* Lights & Shadows */}
        <ambientLight intensity={0.55} />
        <directionalLight
          castShadow
          position={[6, 11, 4]}
          intensity={1.25}
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-far={25}
          shadow-camera-left={-8}
          shadow-camera-right={8}
          shadow-camera-top={8}
          shadow-camera-bottom={-8}
        />
        <pointLight position={[0, 4, 0]} intensity={0.4} />

        {/* Orbit Camera Controls */}
        <OrbitControls
          enableDamping
          dampingFactor={0.06}
          minDistance={3.5}
          maxDistance={14}
          maxPolarAngle={Math.PI / 2.12} // prevent looking under the table
        />

        {/* 1. Base Board Block */}
        <mesh position={[0, -0.06, 0]} receiveShadow castShadow>
          <boxGeometry args={[12.5, 0.12, 12.5]} />
          <meshStandardMaterial color={themeColors.frame} roughness={0.55} metalness={0.1} />
        </mesh>

        {/* 2. Inner Board Floor */}
        <mesh position={[0, -0.005, 0]} receiveShadow>
          <boxGeometry args={[9.54, 0.01, 9.54]} />
          <meshStandardMaterial color={themeColors.frame} roughness={0.7} />
        </mesh>

        {/* 3. Render 40 Cells (Tiles) */}
        {boardData.map((tile) => {
          const tileState = gameState.tiles[tile.id];
          const ownerColor = getOwnerColor(tileState.ownerId);
          const isCorner = tile.id % 10 === 0;

          // Determine dimensions and coordinates
          const [cx, cy, cz] = get3DCoordinate(tile.id);
          let w = 1.02;
          let l = 1.48;

          if (isCorner) {
            w = 1.48;
            l = 1.48;
          } else if ((tile.id > 10 && tile.id < 20) || (tile.id > 30 && tile.id < 40)) {
            // West/East edges
            w = 1.48;
            l = 1.02;
          }

          // HTML Label scale & sizes
          const htmlWidth = isCorner ? 120 : (tile.id > 10 && tile.id < 20) || (tile.id > 30 && tile.id < 40) ? 120 : 80;
          const htmlHeight = isCorner ? 120 : (tile.id > 10 && tile.id < 20) || (tile.id > 30 && tile.id < 40) ? 80 : 120;

          return (
            <group key={tile.id} position={[cx, cy, cz]}>
              {/* 3D Box for Cell */}
              <mesh position={[0, 0.015, 0]} receiveShadow castShadow>
                <boxGeometry args={[w, 0.03, l]} />
                <meshStandardMaterial
                  color={ownerColor || themeColors.cell}
                  roughness={0.4}
                  metalness={0.05}
                />
              </mesh>

              {/* Flat HTML labels using react-three-drei transform */}
              <Html
                transform
                rotation={[-Math.PI / 2, 0, getRotationY(tile.id)]}
                position={[0, 0.031, 0]}
                scale={0.0125}
                distanceFactor={10}
                pointerEvents="auto"
              >
                <div
                  style={{
                    width: `${htmlWidth}px`,
                    height: `${htmlHeight}px`,
                  }}
                  className="relative w-full h-full"
                >
                  <Cell
                    tile={tile}
                    tileState={tileState}
                    playersOnTile={[]} // Rendered as 3D tokens instead
                    activePlayerId={activePlayer?.id || ''}
                    onBuildHouse={buildHouse}
                    ownerColor={ownerColor}
                    isHighlighted={isHighlighted(tile.id)}
                    isMonopoly={isGroupMonopoly(tile.group, tileState.ownerId)}
                    currentRent={getCurrentRent(tile)}
                    theme={boardTheme}
                    hidePawns={true}
                    disableGridPosition={true}
                  />
                </div>
              </Html>
            </group>
          );
        })}

        {/* 4. Render 3D Tokens for Players */}
        {gameState.players.map((p, idx) => {
          // Lấy vị trí visual (vị trí đang chạy animation di chuyển)
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
      </Canvas>
    </div>
  );
}
