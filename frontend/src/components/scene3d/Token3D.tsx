import { useRef } from 'react';
import * as THREE from 'three';

interface Token3DProps {
  skinId: string;
  color: string;
}

export function Token3D({ skinId, color }: Token3DProps) {
  const groupRef = useRef<THREE.Group>(null);

  // Render components based on selected skin
  const renderMesh = () => {
    switch (skinId) {
      case 'hat': // Nón lá / Nón
        return (
          <group position={[0, 0.05, 0]}>
            {/* Vành nón */}
            <mesh castShadow receiveShadow>
              <cylinderGeometry args={[0.22, 0.22, 0.015, 24]} />
              <meshStandardMaterial color="#f0d59e" emissive="#f0d59e" emissiveIntensity={0.25} roughness={0.8} />
            </mesh>
            {/* Chóp nón (Nón lá) */}
            <mesh castShadow receiveShadow position={[0, 0.1, 0]}>
              <coneGeometry args={[0.18, 0.2, 24]} />
              <meshStandardMaterial color="#e5c583" emissive="#e5c583" emissiveIntensity={0.25} roughness={0.8} />
            </mesh>
            {/* Dây nón đỏ */}
            <mesh position={[0, -0.02, 0]}>
              <torusGeometry args={[0.08, 0.01, 8, 16, Math.PI]} />
              <meshStandardMaterial color="#ff3333" />
            </mesh>
          </group>
        );

      case 'rocket': // Phi thuyền
        return (
          <group position={[0, 0.15, 0]}>
            {/* Thân phi thuyền */}
            <mesh castShadow receiveShadow>
              <cylinderGeometry args={[0.07, 0.07, 0.25, 16]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.45} roughness={0.3} metalness={0.8} />
            </mesh>
            {/* Đầu phi thuyền */}
            <mesh castShadow receiveShadow position={[0, 0.18, 0]}>
              <coneGeometry args={[0.07, 0.12, 16]} />
              <meshStandardMaterial color="#ffffff" roughness={0.2} metalness={0.9} />
            </mesh>
            {/* Cánh đuôi 1 */}
            <mesh castShadow receiveShadow position={[0.09, -0.08, 0]} rotation={[0, 0, -Math.PI / 6]}>
              <boxGeometry args={[0.08, 0.08, 0.02]} />
              <meshStandardMaterial color="#ff3333" roughness={0.3} />
            </mesh>
            {/* Cánh đuôi 2 */}
            <mesh castShadow receiveShadow position={[-0.09, -0.08, 0]} rotation={[0, 0, Math.PI / 6]}>
              <boxGeometry args={[0.08, 0.08, 0.02]} />
              <meshStandardMaterial color="#ff3333" roughness={0.3} />
            </mesh>
            {/* Động cơ lửa dưới đít */}
            <mesh position={[0, -0.15, 0]} rotation={[Math.PI, 0, 0]}>
              <coneGeometry args={[0.04, 0.08, 8]} />
              <meshBasicMaterial color="#ffaa00" />
            </mesh>
          </group>
        );

      case 'car': // Ô tô
        return (
          <group position={[0, 0.08, 0]}>
            {/* Gầm xe */}
            <mesh castShadow receiveShadow>
              <boxGeometry args={[0.26, 0.07, 0.14]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} roughness={0.2} metalness={0.6} />
            </mesh>
            {/* Cabin xe */}
            <mesh castShadow receiveShadow position={[-0.02, 0.06, 0]}>
              <boxGeometry args={[0.14, 0.06, 0.11]} />
              <meshStandardMaterial color="#111111" roughness={0.1} />
            </mesh>
            {/* Bánh xe 1 */}
            <mesh castShadow position={[0.08, -0.03, 0.075]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.04, 0.04, 0.03, 12]} />
              <meshStandardMaterial color="#333333" roughness={0.9} />
            </mesh>
            {/* Bánh xe 2 */}
            <mesh castShadow position={[-0.08, -0.03, 0.075]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.04, 0.04, 0.03, 12]} />
              <meshStandardMaterial color="#333333" roughness={0.9} />
            </mesh>
            {/* Bánh xe 3 */}
            <mesh castShadow position={[0.08, -0.03, -0.075]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.04, 0.04, 0.03, 12]} />
              <meshStandardMaterial color="#333333" roughness={0.9} />
            </mesh>
            {/* Bánh xe 4 */}
            <mesh castShadow position={[-0.08, -0.03, -0.075]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.04, 0.04, 0.03, 12]} />
              <meshStandardMaterial color="#333333" roughness={0.9} />
            </mesh>
          </group>
        );

      case 'motorbike': // Xe máy
        return (
          <group position={[0, 0.08, 0]}>
            {/* Bánh trước */}
            <mesh castShadow position={[0.1, -0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.06, 0.06, 0.025, 12]} />
              <meshStandardMaterial color="#222222" roughness={0.9} />
            </mesh>
            {/* Bánh sau */}
            <mesh castShadow position={[-0.1, -0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.06, 0.06, 0.025, 12]} />
              <meshStandardMaterial color="#222222" roughness={0.9} />
            </mesh>
            {/* Khung thân xe */}
            <mesh castShadow receiveShadow position={[0, 0.03, 0]}>
              <boxGeometry args={[0.16, 0.06, 0.05]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} roughness={0.3} />
            </mesh>
            {/* Yên xe */}
            <mesh castShadow position={[-0.03, 0.07, 0]}>
              <boxGeometry args={[0.08, 0.02, 0.06]} />
              <meshStandardMaterial color="#333333" roughness={0.7} />
            </mesh>
            {/* Tay lái */}
            <mesh castShadow position={[0.07, 0.1, 0]} rotation={[0, 0, -Math.PI / 6]}>
              <cylinderGeometry args={[0.015, 0.015, 0.12, 8]} />
              <meshStandardMaterial color="#dddddd" metalness={0.9} />
            </mesh>
          </group>
        );

      case 'dragon': // Rồng / Rồng đất
        return (
          <group position={[0, 0.08, 0]}>
            {/* Thân uốn lượn (3 khúc cầu ghép lại) */}
            <mesh castShadow receiveShadow position={[0.08, 0, 0]}>
              <sphereGeometry args={[0.08, 12, 12]} />
              <meshStandardMaterial color="#10b981" emissive="#10b981" emissiveIntensity={0.4} roughness={0.4} />
            </mesh>
            <mesh castShadow receiveShadow position={[0, 0.04, 0.03]}>
              <sphereGeometry args={[0.075, 12, 12]} />
              <meshStandardMaterial color="#059669" emissive="#059669" emissiveIntensity={0.35} roughness={0.4} />
            </mesh>
            <mesh castShadow receiveShadow position={[-0.08, 0.01, -0.01]}>
              <sphereGeometry args={[0.06, 12, 12]} />
              <meshStandardMaterial color="#047857" emissive="#047857" emissiveIntensity={0.3} roughness={0.4} />
            </mesh>
            {/* Đầu rồng */}
            <mesh castShadow receiveShadow position={[0.13, 0.08, 0]}>
              <sphereGeometry args={[0.07, 12, 12]} />
              <meshStandardMaterial color="#10b981" emissive="#10b981" emissiveIntensity={0.4} roughness={0.4} />
            </mesh>
            {/* Sừng đỏ */}
            <mesh position={[0.11, 0.14, 0.02]} rotation={[0.2, 0, -0.3]}>
              <coneGeometry args={[0.015, 0.06, 8]} />
              <meshStandardMaterial color="#ef4444" />
            </mesh>
            <mesh position={[0.11, 0.14, -0.02]} rotation={[-0.2, 0, -0.3]}>
              <coneGeometry args={[0.015, 0.06, 8]} />
              <meshStandardMaterial color="#ef4444" />
            </mesh>
            {/* Mắt vàng rực */}
            <mesh position={[0.17, 0.09, 0.03]}>
              <sphereGeometry args={[0.015, 8, 8]} />
              <meshBasicMaterial color="#fbbf24" />
            </mesh>
            <mesh position={[0.17, 0.09, -0.03]}>
              <sphereGeometry args={[0.015, 8, 8]} />
              <meshBasicMaterial color="#fbbf24" />
            </mesh>
          </group>
        );

      case 'pho': // Tô phở
        return (
          <group position={[0, 0.06, 0]}>
            {/* Tô sứ trắng */}
            <mesh castShadow receiveShadow>
              <cylinderGeometry args={[0.16, 0.1, 0.12, 20]} />
              <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.2} roughness={0.1} />
            </mesh>
            {/* Lớp nước dùng phở ở trên */}
            <mesh position={[0, 0.061, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[0.15, 20]} />
              <meshStandardMaterial color="#b45309" emissive="#b45309" emissiveIntensity={0.15} roughness={0.3} />
            </mesh>
            {/* Bánh phở / Hành hoa (Khối nhỏ) */}
            <mesh position={[0.02, 0.065, 0.02]} rotation={[0.1, 0.5, 0]}>
              <boxGeometry args={[0.05, 0.01, 0.1]} />
              <meshStandardMaterial color="#fcfaf2" />
            </mesh>
            {/* Đũa ăn */}
            <mesh position={[-0.04, 0.13, 0.04]} rotation={[0.4, 0, -Math.PI / 4]}>
              <cylinderGeometry args={[0.01, 0.007, 0.28, 8]} />
              <meshStandardMaterial color="#78350f" roughness={0.6} />
            </mesh>
          </group>
        );

      case 'coconut': // Quả dừa
        return (
          <group position={[0, 0.07, 0]}>
            {/* Vỏ dừa nâu dẹt */}
            <mesh castShadow receiveShadow>
              <sphereGeometry args={[0.14, 20, 20, 0, Math.PI * 2, 0, Math.PI * 0.7]} />
              <meshStandardMaterial color="#5c3f15" emissive="#5c3f15" emissiveIntensity={0.25} roughness={0.9} />
            </mesh>
            {/* Ruột dừa trắng */}
            <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[0.138, 20]} />
              <meshStandardMaterial color="#f3f4f6" roughness={0.5} />
            </mesh>
            {/* Nước dừa bên trong */}
            <mesh position={[0, 0.042, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[0.11, 20]} />
              <meshStandardMaterial color="#e0f2fe" emissive="#e0f2fe" emissiveIntensity={0.15} roughness={0.1} />
            </mesh>
            {/* Ống hút xanh lá */}
            <mesh position={[0.04, 0.1, 0.02]} rotation={[0.3, 0, -0.4]}>
              <cylinderGeometry args={[0.012, 0.012, 0.18, 8]} />
              <meshStandardMaterial color="#10b981" />
            </mesh>
          </group>
        );

      case 'tiger': // Con Hổ
        return (
          <group position={[0, 0.09, 0]}>
            {/* Thân hổ vàng cam */}
            <mesh castShadow receiveShadow>
              <boxGeometry args={[0.22, 0.13, 0.14]} />
              <meshStandardMaterial color="#f97316" emissive="#f97316" emissiveIntensity={0.4} roughness={0.6} />
            </mesh>
            {/* Đầu hổ */}
            <mesh castShadow receiveShadow position={[0.11, 0.08, 0]}>
              <boxGeometry args={[0.12, 0.12, 0.12]} />
              <meshStandardMaterial color="#ea580c" emissive="#ea580c" emissiveIntensity={0.4} roughness={0.6} />
            </mesh>
            {/* Tai trái */}
            <mesh position={[0.1, 0.16, 0.04]} rotation={[0, 0, 0.1]}>
              <boxGeometry args={[0.03, 0.04, 0.03]} />
              <meshStandardMaterial color="#111111" />
            </mesh>
            {/* Tai phải */}
            <mesh position={[0.1, 0.16, -0.04]} rotation={[0, 0, 0.1]}>
              <boxGeometry args={[0.03, 0.04, 0.03]} />
              <meshStandardMaterial color="#111111" />
            </mesh>
            {/* Đuôi hổ */}
            <mesh castShadow position={[-0.14, 0.04, 0]} rotation={[0, 0, -Math.PI / 4]}>
              <cylinderGeometry args={[0.015, 0.015, 0.14, 8]} />
              <meshStandardMaterial color="#f97316" />
            </mesh>
            {/* Chân hổ x4 */}
            <mesh position={[0.07, -0.08, 0.05]}>
              <boxGeometry args={[0.04, 0.05, 0.04]} />
              <meshStandardMaterial color="#ea580c" />
            </mesh>
            <mesh position={[-0.07, -0.08, 0.05]}>
              <boxGeometry args={[0.04, 0.05, 0.04]} />
              <meshStandardMaterial color="#ea580c" />
            </mesh>
            <mesh position={[0.07, -0.08, -0.05]}>
              <boxGeometry args={[0.04, 0.05, 0.04]} />
              <meshStandardMaterial color="#ea580c" />
            </mesh>
            <mesh position={[-0.07, -0.08, -0.05]}>
              <boxGeometry args={[0.04, 0.05, 0.04]} />
              <meshStandardMaterial color="#ea580c" />
            </mesh>
          </group>
        );

      default: // Quân cờ mặc định (Cylinder)
        return (
          <group position={[0, 0.12, 0]}>
            <mesh castShadow receiveShadow>
              <cylinderGeometry args={[0.08, 0.11, 0.24, 16]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.45} roughness={0.3} metalness={0.5} />
            </mesh>
            <mesh position={[0, 0.14, 0]}>
              <sphereGeometry args={[0.07, 16, 16]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.45} roughness={0.3} metalness={0.5} />
            </mesh>
          </group>
        );
    }
  };

  return <group ref={groupRef}>{renderMesh()}</group>;
}
