/**
 * Dice3D.tsx — Real 3D dice using react-three-fiber
 * Exports both the standalone component (with Canvas) AND the raw Die mesh.
 */
import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ─── Pip layout per face (standard die: opposite faces sum to 7) ────────────
const PIP_POSITIONS: Record<number, [number, number][]> = {
  1: [[0.5, 0.5]],
  2: [[0.25, 0.25], [0.75, 0.75]],
  3: [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]],
  4: [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]],
  5: [[0.25, 0.25], [0.75, 0.25], [0.5, 0.5], [0.25, 0.75], [0.75, 0.75]],
  6: [
    [0.25, 0.2], [0.75, 0.2],
    [0.25, 0.5], [0.75, 0.5],
    [0.25, 0.8], [0.75, 0.8],
  ],
};

type SkinName = 'neon' | 'jade' | 'wood';

export interface SkinColors {
  face: string;
  pip: string;
  emissive: string;
  emissiveIntensity: number;
  roughness: number;
  metalness: number;
}

export const SKINS: Record<SkinName, SkinColors> = {
  neon:  { face: '#0a0f1e', pip: '#a5f3ff', emissive: '#00e5ff', emissiveIntensity: 0.06, roughness: 0.2, metalness: 0.6 },
  jade:  { face: '#0e8a5f', pip: '#eafff4', emissive: '#19c47f', emissiveIntensity: 0.12, roughness: 0.25, metalness: 0.35 },
  wood:  { face: '#7a4a22', pip: '#f5e6cf', emissive: '#3a1f0a', emissiveIntensity: 0.04, roughness: 0.9, metalness: 0.0 },
};

export function getSkinColors(skin?: string): SkinColors {
  const key: SkinName = skin === 'jade' ? 'jade' : skin === 'wood' ? 'wood' : 'neon';
  return SKINS[key];
}

// Build a CanvasTexture for a single face showing `value` pips
function makeFaceTexture(value: number, colors: SkinColors): THREE.CanvasTexture {
  const SIZE = 256;
  const c = document.createElement('canvas');
  c.width = SIZE;
  c.height = SIZE;
  const ctx = c.getContext('2d')!;

  // Background rounded rect
  const R = 32;
  ctx.fillStyle = colors.face;
  ctx.beginPath();
  ctx.moveTo(R, 0);
  ctx.lineTo(SIZE - R, 0);
  ctx.quadraticCurveTo(SIZE, 0, SIZE, R);
  ctx.lineTo(SIZE, SIZE - R);
  ctx.quadraticCurveTo(SIZE, SIZE, SIZE - R, SIZE);
  ctx.lineTo(R, SIZE);
  ctx.quadraticCurveTo(0, SIZE, 0, SIZE - R);
  ctx.lineTo(0, R);
  ctx.quadraticCurveTo(0, 0, R, 0);
  ctx.closePath();
  ctx.fill();

  // Pips
  const pipR = SIZE * 0.085;
  ctx.fillStyle = colors.pip;
  for (const [nx, ny] of PIP_POSITIONS[value]) {
    ctx.beginPath();
    ctx.arc(nx * SIZE, ny * SIZE, pipR, 0, Math.PI * 2);
    ctx.fill();
  }

  return new THREE.CanvasTexture(c);
}

// Rotations that place each value (1–6) on the +Y (top) face.
const VALUE_TO_EULER: Record<number, THREE.Euler> = {
  1: new THREE.Euler(0, 0,  Math.PI / 2),
  2: new THREE.Euler(0, 0, 0),
  3: new THREE.Euler(-Math.PI / 2, 0, 0),
  4: new THREE.Euler( Math.PI / 2, 0, 0),
  5: new THREE.Euler(0, 0, Math.PI),
  6: new THREE.Euler(0, 0, -Math.PI / 2),
};

// ─── Exported Die mesh (usable inside ANY Canvas) ───────────────────────────
export interface DieMeshProps {
  value: number;
  rolling: boolean;
  position: [number, number, number];
  colors: SkinColors;
  size?: number;
}

export function DieMesh({ value, rolling, position, colors, size = 1 }: DieMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const spinRef = useRef({ speed: new THREE.Vector3(3, 5, 2) });
  const targetQuat = useRef(new THREE.Quaternion());
  const isSettling = useRef(false);
  const bounceRef = useRef(0);

  // Build 6 face textures
  const materials = useMemo(() => {
    const faceValues = [1, 6, 2, 5, 3, 4];
    return faceValues.map((v) => {
      const tex = makeFaceTexture(v, colors);
      return new THREE.MeshStandardMaterial({
        map: tex,
        emissive: new THREE.Color(colors.emissive),
        emissiveIntensity: colors.emissiveIntensity,
        roughness: colors.roughness,
        metalness: colors.metalness,
      });
    });
  }, [colors]);

  useEffect(() => {
    return () => {
      for (const mat of materials) {
        mat.map?.dispose();
        mat.dispose();
      }
    };
  }, [materials]);

  useEffect(() => {
    if (!rolling) {
      const euler = VALUE_TO_EULER[value] ?? VALUE_TO_EULER[1];
      targetQuat.current.setFromEuler(euler);
      isSettling.current = true;
      bounceRef.current = 1.5; // Start bounce from height
    } else {
      bounceRef.current = 0;
    }
  }, [rolling, value]);

  useFrame((_state, delta) => {
    if (!meshRef.current) return;

    if (rolling) {
      isSettling.current = false;
      // Tumble fast + bounce up and down
      meshRef.current.rotation.x += spinRef.current.speed.x * delta * 4;
      meshRef.current.rotation.y += spinRef.current.speed.y * delta * 4;
      meshRef.current.rotation.z += spinRef.current.speed.z * delta * 3;
      // Oscillate Y for a bouncy roll
      const t = performance.now() * 0.008;
      meshRef.current.position.y = position[1] + Math.abs(Math.sin(t)) * 0.8;
    } else if (isSettling.current) {
      // Slerp rotation to target
      meshRef.current.quaternion.slerp(targetQuat.current, Math.min(1, delta * 6));
      // Bounce down to resting position
      if (bounceRef.current > 0.01) {
        bounceRef.current *= 0.92;
        meshRef.current.position.y = position[1] + bounceRef.current;
      } else {
        meshRef.current.position.y = position[1];
        bounceRef.current = 0;
      }
      const angle = meshRef.current.quaternion.angleTo(targetQuat.current);
      if (angle < 0.001 && bounceRef.current < 0.01) {
        meshRef.current.quaternion.copy(targetQuat.current);
        meshRef.current.position.y = position[1];
        isSettling.current = false;
      }
    }
  });

  return (
    <mesh ref={meshRef} position={position} castShadow>
      <boxGeometry args={[size, size, size]} />
      {materials.map((mat, i) => (
        <primitive key={i} object={mat} attach={`material-${i}`} />
      ))}
    </mesh>
  );
}

// ─── Standalone component (with its own Canvas) for use outside R3F ─────────
interface Dice3DProps {
  dice: [number, number];
  rolling: boolean;
  skin?: string;
}

export function Dice3D({ dice, rolling, skin = 'neon' }: Dice3DProps) {
  const colors = getSkinColors(skin);

  return (
    <Canvas
      frameloop="demand"
      dpr={[1, 2]}
      shadows={false}
      camera={{ position: [0, 3, 4], fov: 50 }}
      gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
      style={{ width: '100%', height: '100%', background: 'transparent' }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[4, 6, 4]} intensity={1.2} />

      <DieMesh value={dice[0]} rolling={rolling} position={[-0.85, 0, 0]} colors={colors} />
      <DieMesh value={dice[1]} rolling={rolling} position={[ 0.85, 0, 0]} colors={colors} />
    </Canvas>
  );
}
