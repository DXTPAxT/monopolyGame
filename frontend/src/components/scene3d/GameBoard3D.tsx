import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { Token3D } from './Token3D';
import { DieMesh, getSkinColors } from './Dice3D';
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
  hudContent: React.ReactNode | null;
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
// Mathematically perfect grid layout:
// Corner tile: 1.5 x 1.5 units
// Regular tile: 0.9 wide, 1.5 long
// Board outer boundary: [-5.55, 5.55] (total size = 11.1)
// Corner center: 5.55 - 1.5/2 = 4.8

const get3DCoordinate = (id: number): [number, number, number] => {
  // Bottom edge (0 to 10)
  if (id >= 0 && id <= 10) {
    let x = 4.8;
    if (id > 0 && id < 10) {
      x = 3.6 - (id - 1) * 0.9;
    } else if (id === 10) {
      x = -4.8;
    }
    return [x, 0, 4.8];
  }
  // Left edge (10 to 20)
  else if (id >= 11 && id <= 20) {
    let z = 4.8;
    if (id > 10 && id < 20) {
      z = 3.6 - (id - 11) * 0.9;
    } else if (id === 20) {
      z = -4.8;
    }
    return [-4.8, 0, z];
  }
  // Top edge (20 to 30)
  else if (id >= 21 && id <= 30) {
    let x = -4.8;
    if (id > 20 && id < 30) {
      x = -3.6 + (id - 21) * 0.9;
    } else if (id === 30) {
      x = 4.8;
    }
    return [x, 0, -4.8];
  }
  // Right edge (30 to 0)
  else {
    let z = -4.8;
    if (id > 30 && id < 40) {
      z = -3.6 + (id - 31) * 0.9;
    }
    return [4.8, 0, z];
  }
};

// ─── Tile dimensions ────────────────────────────────────────────────────────
const getTileDimensions = (id: number): { w: number; l: number } => {
  const isCorner = id % 10 === 0;
  if (isCorner) return { w: 1.5, l: 1.5 };
  
  const isHorizontalSide = (id > 0 && id < 10) || (id > 20 && id < 30);
  if (isHorizontalSide) {
    return { w: 0.9, l: 1.5 }; // bottom/top
  } else {
    return { w: 1.5, l: 0.9 }; // left/right
  }
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
// Resolution: 300 px per world unit for extremely sharp text
const PX_SCALE = 300;

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
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, PX_W, PX_H);

  // ─── Thin border between tiles ───
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 3;
  ctx.strokeRect(1, 1, PX_W - 2, PX_H - 2);

  // ─── Group color strip (22% of tile height for properties to give text more space) ───
  if (isProperty && !isCorner) {
    const stripH = Math.round(PX_H * 0.22);
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
    ctx.lineWidth = 20;
    ctx.strokeRect(10, 10, PX_W - 20, PX_H - 20);
  }

  // ─── Tile Name (DOUBLE font sizes for readability) ───
  const fontSize = isCorner ? 68 : 56;
  ctx.font = `bold ${fontSize}px "Inter", "Segoe UI", Arial, sans-serif`;
  ctx.fillStyle = '#f1f5f9';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Text position: below the color strip for properties, centered otherwise
  const textStartY = isProperty && !isCorner ? PX_H * 0.52 : PX_H * 0.42;

  // Word wrap
  const words = tile.name.split(' ');
  const maxW = PX_W - 20;
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

  const lineHeight = fontSize + 8;
  const startY = textStartY - ((lines.length - 1) * lineHeight) / 2;
  for (let i = 0; i < lines.length; i++) {
    // Text shadow for contrast
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillText(lines[i], PX_W / 2 + 2, startY + i * lineHeight + 2);
    ctx.fillStyle = '#f1f5f9';
    ctx.fillText(lines[i], PX_W / 2, startY + i * lineHeight);
  }

  // ─── Price (bottom area, bigger) ───
  if (tile.price && tile.type !== 'tax') {
    ctx.font = `bold 42px "Inter", "Segoe UI", Arial, sans-serif`;
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`$${tile.price}`, PX_W / 2, PX_H * 0.86);
  }

  // ─── Special tile icons ───
  if (tile.type === 'go') {
    ctx.font = 'bold 92px Arial';
    ctx.fillStyle = '#4ade80';
    ctx.fillText('→ GO', PX_W / 2, PX_H * 0.75);
  } else if (tile.type === 'tax') {
    ctx.font = 'bold 56px Arial';
    ctx.fillStyle = '#fb7185';
    ctx.fillText(`💰 $${tile.price}`, PX_W / 2, PX_H * 0.75);
  } else if (tile.type === 'chance') {
    ctx.font = 'bold 96px Arial';
    ctx.fillStyle = '#fbbf24';
    ctx.fillText('❓', PX_W / 2, PX_H * 0.72);
  } else if (tile.type === 'community_chest') {
    ctx.font = 'bold 86px Arial';
    ctx.fillStyle = '#34d399';
    ctx.fillText('🎁', PX_W / 2, PX_H * 0.72);
  } else if (tile.id === 10) {
    ctx.font = 'bold 56px Arial';
    ctx.fillStyle = '#fb7185';
    ctx.fillText('🔒 NHÀ TÙ', PX_W / 2, PX_H * 0.72);
  } else if (tile.id === 20) {
    ctx.font = 'bold 56px Arial';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('🅿️ NGHỈ', PX_W / 2, PX_H * 0.72);
  } else if (tile.id === 30) {
    ctx.font = 'bold 56px Arial';
    ctx.fillStyle = '#fb7185';
    ctx.fillText('🚔 VÀO TÙ!', PX_W / 2, PX_H * 0.72);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = 4;
  return tex;
}

// ─── Component: Moving Token with Custom Hop Animation per Skin ─────────────
function AnimatedToken({
  skinId, color, currentTileId, playerIndex, totalPlayers,
}: {
  skinId: string; color: string; currentTileId: number;
  playerIndex: number; totalPlayers: number;
}) {
  const ref = useRef<THREE.Group>(null!);
  const lastTileId = useRef<number>(currentTileId);
  const animStartPos = useRef<THREE.Vector3>(new THREE.Vector3());
  const progress = useRef<number>(1); // 1 = animation complete

  const targetPosition = useMemo(() => {
    const coord = get3DCoordinate(currentTileId);
    const offset = getTokenOffset(playerIndex, totalPlayers);
    return new THREE.Vector3(coord[0] + offset[0], coord[1] + offset[1], coord[2] + offset[2]);
  }, [currentTileId, playerIndex, totalPlayers]);

  useEffect(() => {
    if (currentTileId !== lastTileId.current) {
      if (ref.current) {
        animStartPos.current.copy(ref.current.position);
      } else {
        animStartPos.current.copy(targetPosition);
      }
      
      const diff = Math.abs(currentTileId - lastTileId.current);
      const isTeleport = diff > 1 && diff < 39;
      
      lastTileId.current = currentTileId;
      progress.current = isTeleport ? 0.8 : 0;
    }
  }, [currentTileId, targetPosition]);

  useFrame((state, delta) => {
    if (!ref.current) return;
    
    const time = state.clock.getElapsedTime();
    const isMoving = progress.current < 1;

    // Reset default scale and rotations
    const baseScale = 1.8;
    ref.current.scale.set(baseScale, baseScale, baseScale);
    ref.current.rotation.set(0, 0, 0);

    if (isMoving) {
      progress.current = Math.min(1, progress.current + delta * 5.0); // Slightly slower movement for more readable and premium animation
      const t = progress.current;
      const easeT = t * t * (3 - 2 * t); // smoothstep
      
      ref.current.position.x = THREE.MathUtils.lerp(animStartPos.current.x, targetPosition.x, easeT);
      ref.current.position.z = THREE.MathUtils.lerp(animStartPos.current.z, targetPosition.z, easeT);
      
      const baseHeight = THREE.MathUtils.lerp(animStartPos.current.y, targetPosition.y, easeT);
      
      switch (skinId) {
        case 'rocket': {
          // Sub-orbital Flight Path:
          // 1. Takeoff (t < 0.3): launches vertically up to +1.8 height
          // 2. Cruise (0.3 <= t <= 0.7): glides horizontally to destination and tilts forward
          // 3. Landing (t > 0.7): descends vertically down to destination
          if (t < 0.3) {
            const launchT = t / 0.3;
            ref.current.position.x = animStartPos.current.x;
            ref.current.position.z = animStartPos.current.z;
            ref.current.position.y = animStartPos.current.y + launchT * 1.8;
            ref.current.rotation.x = 0; // vertical
            ref.current.rotation.y = time * 15; // spin thrusters
          } else if (t <= 0.7) {
            const cruiseT = (t - 0.3) / 0.4;
            const easeCruise = cruiseT * cruiseT * (3 - 2 * cruiseT);
            ref.current.position.x = THREE.MathUtils.lerp(animStartPos.current.x, targetPosition.x, easeCruise);
            ref.current.position.z = THREE.MathUtils.lerp(animStartPos.current.z, targetPosition.z, easeCruise);
            const cruiseBaseY = THREE.MathUtils.lerp(animStartPos.current.y, targetPosition.y, easeCruise);
            ref.current.position.y = cruiseBaseY + 1.8 + Math.sin(cruiseT * Math.PI) * 0.25;
            ref.current.rotation.x = -0.75; // tilt forward in flight direction
            ref.current.rotation.y = time * 6;
          } else {
            const landT = (t - 0.7) / 0.3;
            ref.current.position.x = targetPosition.x;
            ref.current.position.z = targetPosition.z;
            ref.current.position.y = targetPosition.y + (1.0 - landT) * 1.8;
            ref.current.rotation.x = 0; // vertical landing
            ref.current.rotation.y = time * 15;
          }
          break;
        }
        case 'car': {
          // Speed Roll: runs flat, high vibration suspension, tilts back on accel, pitches forward on brake
          const hopY = Math.abs(Math.sin(t * Math.PI * 4)) * 0.02;
          ref.current.position.y = baseHeight + hopY;
          ref.current.rotation.x = t < 0.35 ? 0.12 : t > 0.65 ? -0.16 : 0;
          ref.current.rotation.y = Math.sin(t * Math.PI * 2) * 0.15; // drifts left/right
          break;
        }
        case 'motorbike': {
          // Wheelie Jump: heavy front pitch up on leap, slams down on arrival
          const hopY = Math.sin(t * Math.PI) * 0.25;
          ref.current.position.y = baseHeight + hopY;
          ref.current.rotation.x = t < 0.55 ? 0.35 : -0.15;
          ref.current.rotation.z = Math.sin(t * Math.PI) * 0.12; // lean side to side
          break;
        }
        case 'dragon': {
          // Serpentine Fly: double wave height fluctuation, rolls side to side and sways head
          const hopY = Math.sin(t * Math.PI) * 0.7 + Math.sin(t * Math.PI * 3) * 0.25;
          ref.current.position.y = baseHeight + hopY;
          ref.current.rotation.y = Math.sin(t * Math.PI * 2) * 0.45; // head sway
          ref.current.rotation.z = Math.cos(t * Math.PI * 2) * 0.25; // roll bank
          break;
        }
        case 'tiger': {
          // Tiger Pounce: massive pounce arc, pitches up on take-off, down on land
          const hopY = Math.sin(t * Math.PI) * 1.25;
          ref.current.position.y = baseHeight + hopY;
          ref.current.rotation.x = THREE.MathUtils.lerp(-0.45, 0.55, t);
          ref.current.rotation.z = Math.sin(t * Math.PI * 2) * 0.15; // tail sway
          break;
        }
        case 'hat': {
          // Wind Drift: flies high, spins rapidly, drifts like falling leaf
          const hopY = Math.sin(t * Math.PI) * 0.85;
          ref.current.position.y = baseHeight + hopY;
          ref.current.rotation.y = t * Math.PI * 4; // spin
          ref.current.rotation.z = Math.sin(t * Math.PI * 3) * 0.3; // leaf wobble
          ref.current.rotation.x = Math.cos(t * Math.PI * 3) * 0.2;
          break;
        }
        case 'pho': {
          // Jelly Wobble: standard hop, stretch Y when jumping, squash Y when landing
          const hopY = Math.sin(t * Math.PI) * 0.7;
          ref.current.position.y = baseHeight + hopY;
          const scaleY = t < 0.55 
            ? THREE.MathUtils.lerp(1.0, 1.35, t * 2) 
            : THREE.MathUtils.lerp(1.35, 0.75, (t - 0.55) * 2);
          const scaleXZ = t < 0.55
            ? THREE.MathUtils.lerp(1.0, 0.8, t * 2)
            : THREE.MathUtils.lerp(0.8, 1.2, (t - 0.55) * 2);
          ref.current.scale.set(baseScale * scaleXZ, baseScale * scaleY, baseScale * scaleXZ);
          ref.current.rotation.z = Math.sin(t * Math.PI * 2) * 0.2;
          break;
        }
        case 'coconut': {
          // Trundling Roll: double bounce along ground, rolls continuously on X and wiggles Z
          const hopY = Math.abs(Math.sin(t * Math.PI * 2)) * 0.45;
          ref.current.position.y = baseHeight + hopY;
          ref.current.rotation.x = t * Math.PI * 4; // heavy roll
          ref.current.rotation.z = Math.sin(t * Math.PI) * 0.35; // wobble roll
          break;
        }
        default: {
          // Classic Pawn Hop: springy parabolic hop, stretches & squashes
          const hopY = Math.sin(t * Math.PI) * 0.9;
          ref.current.position.y = baseHeight + hopY;
          const scaleY = 1.0 + Math.sin(t * Math.PI) * 0.2 - (t > 0.8 ? (1.0 - t) * 0.8 : 0);
          ref.current.scale.set(baseScale / Math.sqrt(scaleY), baseScale * scaleY, baseScale / Math.sqrt(scaleY));
          ref.current.rotation.z = Math.sin(t * Math.PI * 2) * 0.2;
          break;
        }
      }
    } else {
      ref.current.position.lerp(targetPosition, Math.min(1, delta * 15));
      
      // ─── Idle animations ───
      switch (skinId) {
        case 'rocket': {
          // Hovering: bobs Y, slow yaw, tiny drone-stabilizer tilt
          ref.current.position.y = targetPosition.y + Math.sin(time * 3.0) * 0.06;
          ref.current.rotation.y = time * 0.5;
          ref.current.rotation.x = Math.sin(time * 1.5) * 0.04;
          ref.current.rotation.z = Math.cos(time * 1.5) * 0.04;
          break;
        }
        case 'car': {
          // Engine Idle: high speed vibration, slow back-and-forth tilt
          ref.current.position.y = targetPosition.y + Math.sin(time * 45.0) * 0.003;
          ref.current.rotation.z = Math.sin(time * 1.5) * 0.012;
          break;
        }
        case 'motorbike': {
          // Engine Revving: high speed vibrate, occasional front-wheel tilt (wheelie tease)
          ref.current.position.y = targetPosition.y + Math.sin(time * 40.0) * 0.0035;
          const tease = Math.max(0, Math.sin(time * 2.5) - 0.7) * 0.2;
          ref.current.rotation.x = tease;
          break;
        }
        case 'dragon': {
          // Majestic Float: graceful bobbing Y, tail sway, pitch sway
          ref.current.position.y = targetPosition.y + Math.sin(time * 1.5) * 0.08;
          ref.current.rotation.y = Math.sin(time * 1.0) * 0.18;
          ref.current.rotation.x = Math.sin(time * 0.8) * 0.06;
          break;
        }
        case 'tiger': {
          // Alert Stalk: breathing bob, alert left-right gaze, playful tail shake
          ref.current.position.y = targetPosition.y + Math.sin(time * 2.0) * 0.015;
          ref.current.rotation.y = Math.sin(time * 1.0) * 0.28;
          if (time % 5.0 < 1.5) {
            ref.current.rotation.z = Math.sin(time * 15.0) * 0.06; // tail shake
          }
          break;
        }
        case 'hat': {
          // Gentle Breeze: slow Y bob, sway/tilt in breeze
          ref.current.position.y = targetPosition.y + Math.sin(time * 1.2) * 0.015;
          ref.current.rotation.z = Math.sin(time * 1.2) * 0.08;
          ref.current.rotation.x = Math.cos(time * 1.0) * 0.06;
          break;
        }
        case 'pho': {
          // Steaming Soup: soft warm vibration, soft yaw/roll sway
          ref.current.position.y = targetPosition.y + Math.sin(time * 2.2) * 0.006;
          ref.current.rotation.z = Math.sin(time * 1.8) * 0.04;
          ref.current.rotation.y = Math.cos(time * 1.8) * 0.04;
          break;
        }
        case 'coconut': {
          // Resting Roll: slight settling wobble
          ref.current.rotation.z = Math.sin(time * 1.0) * 0.035;
          ref.current.rotation.x = Math.cos(time * 1.2) * 0.035;
          break;
        }
        default: {
          // Steady Pawn: default breathing bob
          ref.current.position.y = targetPosition.y + Math.sin(time * 1.6) * 0.01;
          break;
        }
      }
    }
  });

  return (
    <group ref={ref} scale={[1.8, 1.8, 1.8]}>
      <Token3D skinId={skinId} color={color} />
      <pointLight color={color} intensity={2.2} distance={1.2} decay={1.5} position={[0, 0.25, 0]} />
    </group>
  );
}

// ─── 3D House Model (Matches Owner Color) ──────────────────────────────────
function House3D({ position, ownerColor }: { position: [number, number, number]; ownerColor?: string }) {
  const roofColor = useMemo(() => {
    const c = new THREE.Color(ownerColor || '#10b981');
    c.multiplyScalar(0.7); // Darken by 30% for contrast
    return c;
  }, [ownerColor]);

  return (
    <group position={position}>
      {/* House Body (Player color) - Upscaled by 45% */}
      <mesh position={[0, 0.07, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.16, 0.14, 0.16]} />
        <meshStandardMaterial color={ownerColor || '#10b981'} roughness={0.3} metalness={0.1} />
      </mesh>
      {/* House Roof (Darker player color) - Upscaled */}
      <mesh position={[0, 0.17, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[0.13, 0.1, 4]} />
        <meshStandardMaterial color={roofColor} roughness={0.4} />
      </mesh>
    </group>
  );
}

// ─── 3D Hotel Model (Matches Owner Color) ──────────────────────────────────
function Hotel3D({ position, ownerColor }: { position: [number, number, number]; ownerColor?: string }) {
  const roofColor = useMemo(() => {
    const c = new THREE.Color(ownerColor || '#ef4444');
    c.multiplyScalar(0.6); // Darken by 40% for contrast
    return c;
  }, [ownerColor]);

  return (
    <group position={position}>
      {/* Hotel Body (Player color) - Upscaled by 36% */}
      <mesh position={[0, 0.095, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.3, 0.19, 0.24]} />
        <meshStandardMaterial color={ownerColor || '#ef4444'} roughness={0.3} metalness={0.1} />
      </mesh>
      {/* Hotel Roof (pyramid) - Upscaled */}
      <mesh position={[0, 0.23, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[0.23, 0.11, 4]} />
        <meshStandardMaterial color={roofColor} roughness={0.4} />
      </mesh>
    </group>
  );
}

// ─── Distribute Houses/Hotels along the Property Color Strip ────────────────
function TileHouses({
  tileId, houses, hotel, ownerColor,
}: {
  tileId: number; houses: number; hotel: boolean; ownerColor?: string;
}) {
  if (!hotel && houses === 0) return null;

  const isBottom = tileId > 0 && tileId < 10;
  const isLeft = tileId > 10 && tileId < 20;
  const isTop = tileId > 20 && tileId < 30;
  const isRight = tileId > 30 && tileId < 40;

  let stripOffset: [number, number] = [0, 0];
  const offsetDistance = 0.42;

  if (isBottom) stripOffset = [0, -offsetDistance];
  else if (isTop) stripOffset = [0, offsetDistance];
  else if (isLeft) stripOffset = [offsetDistance, 0];
  else if (isRight) stripOffset = [-offsetDistance, 0];

  if (hotel) {
    return <Hotel3D position={[stripOffset[0], 0.06, stripOffset[1]]} ownerColor={ownerColor} />;
  }

  const housePositions: [number, number, number][] = [];
  const isHorizontalSide = isBottom || isTop;
  const maxSpan = 0.55;

  for (let i = 0; i < houses; i++) {
    let t = 0;
    if (houses > 1) {
      t = (i / (houses - 1)) - 0.5;
    }
    const step = t * maxSpan;

    if (isHorizontalSide) {
      housePositions.push([step, 0.06, stripOffset[1]]);
    } else {
      housePositions.push([stripOffset[0], 0.06, step]);
    }
  }

  return (
    <>
      {housePositions.map((pos, idx) => (
        <House3D key={idx} position={pos} ownerColor={ownerColor} />
      ))}
    </>
  );
}

// ─── Component: Single 3D Tile ─────────────────────────────────────────────
function Tile3D({
  tile, ownerColor, groupColor, cellColor, isHighlighted, houses, hotel,
}: {
  tile: TileMetadata; ownerColor?: string; groupColor: string;
  cellColor: string; isHighlighted: boolean; houses: number; hotel: boolean;
}) {
  const [cx, , cz] = get3DCoordinate(tile.id);
  const { w, l } = getTileDimensions(tile.id);

  const topTexture = useMemo(
    () => makeTileTexture(tile, w, l, groupColor, cellColor, ownerColor),
    [tile, w, l, groupColor, cellColor, ownerColor],
  );

  const isProperty = tile.type === 'property' && tile.id % 10 !== 0;
  const sideColor = isProperty ? groupColor : cellColor;

  return (
    <group position={[cx, 0, cz]}>
      {/* Tile body */}
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
      {/* Tile top face */}
      <mesh position={[0, 0.061, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[w - 0.02, l - 0.02]} />
        <meshBasicMaterial map={topTexture} />
      </mesh>
      {/* Houses & Hotels */}
      {isProperty && (
        <TileHouses tileId={tile.id} houses={houses} hotel={hotel} ownerColor={ownerColor} />
      )}
      {/* 3D Neon Bezel Outline for ownership */}
      {ownerColor && (
        <group>
          {/* Top/Bottom edges */}
          <mesh position={[0, 0.065, l / 2 - 0.0175]} castShadow receiveShadow>
            <boxGeometry args={[w, 0.015, 0.035]} />
            <meshStandardMaterial color={ownerColor} emissive={ownerColor} emissiveIntensity={1.0} roughness={0.2} metalness={0.8} />
          </mesh>
          <mesh position={[0, 0.065, -l / 2 + 0.0175]} castShadow receiveShadow>
            <boxGeometry args={[w, 0.015, 0.035]} />
            <meshStandardMaterial color={ownerColor} emissive={ownerColor} emissiveIntensity={1.0} roughness={0.2} metalness={0.8} />
          </mesh>
          {/* Left/Right edges */}
          <mesh position={[-w / 2 + 0.0175, 0.065, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.035, 0.015, l - 0.07]} />
            <meshStandardMaterial color={ownerColor} emissive={ownerColor} emissiveIntensity={1.0} roughness={0.2} metalness={0.8} />
          </mesh>
          <mesh position={[w / 2 - 0.0175, 0.065, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.035, 0.015, l - 0.07]} />
            <meshStandardMaterial color={ownerColor} emissive={ownerColor} emissiveIntensity={1.0} roughness={0.2} metalness={0.8} />
          </mesh>
        </group>
      )}
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

// ─── Camera thích ứng: khung dọc thì lùi xa + nghiêng để bàn 11 đơn vị vừa bề ngang ───
function ResponsiveCamera() {
  const { camera, size } = useThree();

  useEffect(() => {
    const portrait = size.height > size.width;
    // aspect = rộng / cao; càng nhỏ (màn càng dọc) càng phải lùi camera.
    const aspect = size.width / size.height;
    const persp = camera as THREE.PerspectiveCamera;

    if (portrait) {
      // Dọc: nâng cao & lùi xa; màn càng hẹp lùi càng nhiều. Nghiêng gần top-down.
      const dist = aspect < 0.55 ? 20 : 17; // rất hẹp (điện thoại) vs hẹp vừa
      persp.position.set(0, dist * 0.92, dist * 0.55);
      persp.fov = 55;
    } else {
      // Ngang/desktop: GIỮ NGUYÊN như hiện tại.
      persp.position.set(0, 10, 12);
      persp.fov = 50;
    }
    persp.updateProjectionMatrix();
  }, [camera, size.width, size.height]);

  return null;
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
  dice,
  localDiceRolling,
  hudContent,
}: GameBoard3DProps) {
  const boardTheme = getBoardTheme(gameState.settings?.boardSkin);
  const themeColors = THEME_HEX[boardTheme.id] || THEME_HEX.neon;

  const diceColors = useMemo(() => getSkinColors(gameState.settings?.diceSkin), [gameState.settings?.diceSkin]);

  return (
    <div className="w-full h-full relative select-none">
      <Canvas
        shadows
        camera={{ position: [0, 10, 12], fov: 50 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        style={{ width: '100%', height: '100%', outline: 'none' }}
      >
        <ResponsiveCamera />
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
          maxDistance={28}
          maxPolarAngle={Math.PI / 2.5}
          target={[0, 0, 0]}
        />

        {/* ─── 1. Board Base (frame) ─── */}
        <mesh position={[0, -0.02, 0]} receiveShadow>
          <boxGeometry args={[11.3, 0.04, 11.3]} />
          <meshStandardMaterial color={themeColors.frame} roughness={0.35} metalness={0.2} />
        </mesh>

        {/* ─── 2. Center floor (slightly elevated) ─── */}
        <mesh position={[0, 0.005, 0]} receiveShadow>
          <boxGeometry args={[8.1, 0.01, 8.1]} />
          <meshStandardMaterial color={themeColors.center} roughness={0.5} metalness={0.05} />
        </mesh>

        {/* ─── 3. Render 40 Tiles ─── */}
        {boardData.map((tile) => {
          const tileState = Array.isArray(gameState.tiles)
            ? gameState.tiles.find((t) => t.id === tile.id)
            : gameState.tiles[tile.id];
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
              houses={tileState?.houses || 0}
              hotel={!!tileState?.hotel}
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

        {/* ─── 4.5. Render 3D Rolling Dice directly on the Board ─── */}
        {(localDiceRolling || gameState.diceRolled) && (
          <group position={[0, 0, 0]}>
            <DieMesh
              value={dice[0]}
              rolling={localDiceRolling}
              position={[-3.1, 0.35, 1.8]}
              colors={diceColors}
              size={0.6}
            />
            <DieMesh
              value={dice[1]}
              rolling={localDiceRolling}
              position={[3.1, 0.35, -1.8]}
              colors={diceColors}
              size={0.6}
            />
          </group>
        )}

        {/* ─── 5. Center HUD — FLAT on board surface (chỉ desktop) ─── */}
        {hudContent && (
          <Html
            center
            transform
            position={[0, 0.08, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            scale={0.56}
            pointerEvents="auto"
            style={{ pointerEvents: 'auto' }}
          >
            <div className="w-[320px] pointer-events-auto">
              {hudContent}
            </div>
          </Html>
        )}

      </Canvas>
    </div>
  );
}
