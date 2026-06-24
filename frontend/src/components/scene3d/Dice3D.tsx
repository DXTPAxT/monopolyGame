/**
 * Dice3D.tsx — Real 3D dice using react-three-fiber
 * Self-contained; expects a sized parent container.
 */
import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// ─── Pip layout per face (standard die: opposite faces sum to 7) ────────────
// Face order for THREE.js BoxGeometry materials:
//   0 = +X (right), 1 = -X (left), 2 = +Y (top), 3 = -Y (bottom),
//   4 = +Z (front), 5 = -Z (back)
// Standard die: 1=front, 2=top, 3=right, 4=left, 5=bottom, 6=back
// BUT we only care that when we rotate to show value V on +Y (top), it looks right.

// Pip positions for each face value (normalised 0-1 grid)
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

interface SkinColors {
  face: string;
  pip: string;
  emissive: string;
  emissiveIntensity: number;
  roughness: number;
  metalness: number;
}

const SKINS: Record<SkinName, SkinColors> = {
  // Neon: xúc xắc đen ánh kim, chấm cyan sáng. emissive PHẢI thấp vì nó phủ đều
  // lên cả mặt — để cao thì nền đen bị nhuộm cyan, gần màu chấm → khó nhìn.
  neon:  { face: '#0a0f1e', pip: '#a5f3ff', emissive: '#00e5ff', emissiveIntensity: 0.06, roughness: 0.2, metalness: 0.6 },
  // Ngọc: xanh ngọc bích đậm, chấm trắng mint, bề mặt đánh bóng
  jade:  { face: '#0e8a5f', pip: '#eafff4', emissive: '#19c47f', emissiveIntensity: 0.12, roughness: 0.25, metalness: 0.35 },
  // Gỗ: nâu gỗ ấm, chấm kem, bề mặt mộc mờ (không bóng, không kim loại)
  wood:  { face: '#7a4a22', pip: '#f5e6cf', emissive: '#3a1f0a', emissiveIntensity: 0.04, roughness: 0.9, metalness: 0.0 },
};

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
// BoxGeometry face order: +X=1, -X=6, +Y=2, -Y=5, +Z=3, -Z=4
// We need to rotate so the correct face points up (+Y).
// Starting from identity where +Y face = value 2:
//   value 2 → identity
//   value 5 → flip 180° around Z
//   value 3 → rotate -90° around X (front face comes up)
//   value 4 → rotate +90° around X (back face comes up)
//   value 1 → rotate +90° around Z (right face comes up)
//   value 6 → rotate -90° around Z (left face comes up)
const VALUE_TO_EULER: Record<number, THREE.Euler> = {
  1: new THREE.Euler(0, 0,  Math.PI / 2),
  2: new THREE.Euler(0, 0, 0),
  3: new THREE.Euler(-Math.PI / 2, 0, 0),
  4: new THREE.Euler( Math.PI / 2, 0, 0),
  5: new THREE.Euler(0, 0, Math.PI),
  6: new THREE.Euler(0, 0, -Math.PI / 2),
};

// ─── Single Die mesh ─────────────────────────────────────────────────────────
interface DieProps {
  value: number;
  rolling: boolean;
  position: [number, number, number];
  colors: SkinColors;
}

function Die({ value, rolling, position, colors }: DieProps) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const spinRef = useRef({ speed: new THREE.Vector3(3, 5, 2) });
  const targetQuat = useRef(new THREE.Quaternion());
  const isSettling = useRef(false);
  // In frameloop="demand" mode we must request frames manually while animating.
  const invalidate = useThree((s) => s.invalidate);

  // Build 6 face textures (one per face) once per skin change
  const materials = useMemo(() => {
    // BoxGeometry face material order: +X, -X, +Y, -Y, +Z, -Z
    // Map: face 0(+X)=1, face 1(-X)=6, face 2(+Y)=2, face 3(-Y)=5, face 4(+Z)=3, face 5(-Z)=4
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

  // Free GPU resources when the skin changes or the die unmounts (avoid leaks).
  useEffect(() => {
    return () => {
      for (const mat of materials) {
        mat.map?.dispose();
        mat.dispose();
      }
    };
  }, [materials]);

  // When rolling stops, compute target quaternion for the desired value.
  // Kick a frame so the demand loop animates the tumble / settle.
  useEffect(() => {
    if (!rolling) {
      const euler = VALUE_TO_EULER[value] ?? VALUE_TO_EULER[1];
      targetQuat.current.setFromEuler(euler);
      isSettling.current = true;
    }
    invalidate();
  }, [rolling, value, invalidate]);

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    if (rolling) {
      isSettling.current = false;
      // Tumble fast
      meshRef.current.rotation.x += spinRef.current.speed.x * delta;
      meshRef.current.rotation.y += spinRef.current.speed.y * delta;
      meshRef.current.rotation.z += spinRef.current.speed.z * delta;
      state.invalidate(); // keep the loop alive while rolling
    } else if (isSettling.current) {
      // Smooth slerp to target orientation
      meshRef.current.quaternion.slerp(targetQuat.current, Math.min(1, delta * 6));
      const angle = meshRef.current.quaternion.angleTo(targetQuat.current);
      if (angle < 0.001) {
        meshRef.current.quaternion.copy(targetQuat.current);
        isSettling.current = false;
      } else {
        state.invalidate(); // keep settling until aligned
      }
    }
  });

  return (
    <mesh ref={meshRef} position={position} castShadow={false}>
      <boxGeometry args={[1, 1, 1]} />
      {materials.map((mat, i) => (
        <primitive key={i} object={mat} attach={`material-${i}`} />
      ))}
    </mesh>
  );
}

// ─── Public component ────────────────────────────────────────────────────────
interface Dice3DProps {
  dice: [number, number];
  rolling: boolean;
  skin?: string;
}

export function Dice3D({ dice, rolling, skin = 'neon' }: Dice3DProps) {
  const skinKey: SkinName =
    skin === 'jade' ? 'jade' : skin === 'wood' ? 'wood' : 'neon';
  const colors = SKINS[skinKey];

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

      <Die
        value={dice[0]}
        rolling={rolling}
        position={[-0.85, 0, 0]}
        colors={colors}
      />
      <Die
        value={dice[1]}
        rolling={rolling}
        position={[ 0.85, 0, 0]}
        colors={colors}
      />
    </Canvas>
  );
}
