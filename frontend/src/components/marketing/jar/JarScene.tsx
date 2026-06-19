import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";

const EMERALD_GLASS = "#7fcfa6";
const COIN_FACE = "#2f9e63";
// Fixed settle spots inside the squat jar (x, y, z), oldest first — stacked so
// the top coins sit near the opening and stay visible even if glass reads dense.
const SETTLE: [number, number, number][] = [
  [-0.34, -0.55, 0.08],
  [0.34, -0.55, -0.1],
  [0.0, -0.52, 0.32],
  [-0.22, -0.28, -0.16],
  [0.3, -0.26, 0.16],
  [0.04, 0.0, 0.0],
];

/** Cheap glass environment: a vertical mint→white gradient as an equirect map,
 *  so the transmission material refracts something instead of reading flat. */
function Environment() {
  const { scene } = useThree();
  useEffect(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 16;
    canvas.height = 64;
    const ctx = canvas.getContext("2d")!;
    const g = ctx.createLinearGradient(0, 0, 0, 64);
    g.addColorStop(0, "#ffffff");
    g.addColorStop(0.6, "#e6f5ec");
    g.addColorStop(1, "#bfe3d0");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 16, 64);
    const tex = new THREE.CanvasTexture(canvas);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = tex;
    return () => {
      scene.environment = null;
      tex.dispose();
    };
  }, [scene]);
  return null;
}

function Jar() {
  return (
    <group>
      {/* glass walls (open-ended, double-sided so the inside shows) */}
      <mesh>
        <cylinderGeometry args={[1.1, 1.0, 1.55, 64, 1, true]} />
        <meshPhysicalMaterial
          color={EMERALD_GLASS}
          transmission={0.95}
          roughness={0.1}
          thickness={0.45}
          ior={1.45}
          attenuationColor={"#1a6b4a"}
          attenuationDistance={2.2}
          clearcoat={1}
          clearcoatRoughness={0.12}
          envMapIntensity={1.4}
          metalness={0}
          transparent
          opacity={0.92}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* bottom */}
      <mesh position={[0, -0.77, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.0, 64]} />
        <meshPhysicalMaterial
          color={EMERALD_GLASS}
          transmission={0.9}
          roughness={0.14}
          thickness={0.45}
          ior={1.45}
          clearcoat={1}
          transparent
          opacity={0.92}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* soft contact shadow */}
      <mesh position={[0, -0.84, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.35, 48]} />
        <meshBasicMaterial color="#0a3a24" transparent opacity={0.13} />
      </mesh>
    </group>
  );
}

function Coin({ position }: { position: [number, number, number] }) {
  return (
    <mesh position={position} rotation={[Math.PI / 2.6, 0, Math.random() * Math.PI]}>
      <cylinderGeometry args={[0.42, 0.42, 0.08, 28]} />
      <meshStandardMaterial color={COIN_FACE} metalness={0.25} roughness={0.45} />
    </mesh>
  );
}

/** The coin that animates in on each drop (nonce change). */
function DroppingCoin({ nonce, settleIndex }: { nonce: number; settleIndex: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const start = useRef(-1);
  const { invalidate, clock } = useThree();
  const target = SETTLE[Math.min(settleIndex, SETTLE.length - 1)];

  useEffect(() => {
    if (nonce <= 0) return;
    start.current = clock.getElapsedTime();
    invalidate();
  }, [nonce, clock, invalidate]);

  useFrame(() => {
    const mesh = ref.current;
    if (!mesh || start.current < 0) return;
    const t = clock.getElapsedTime() - start.current;
    const dur = 0.75;
    const p = Math.min(1, t / dur);
    const eased = 1 - Math.pow(1 - p, 3);
    const topY = 1.9;
    let y = topY + (target[1] - topY) * eased;
    if (t > dur && t < dur + 0.28) {
      const b = (t - dur) / 0.28;
      y = target[1] + Math.sin(b * Math.PI) * 0.1 * (1 - b);
    }
    mesh.position.set(target[0], y, target[2]);
    mesh.rotation.z += 0.18;
    if (t < dur + 0.3) invalidate();
  });

  if (nonce <= 0) return null;
  return (
    <mesh ref={ref} position={[target[0], 1.9, target[2]]} rotation={[Math.PI / 2.6, 0, 0]}>
      <cylinderGeometry args={[0.42, 0.42, 0.08, 28]} />
      <meshStandardMaterial color={COIN_FACE} metalness={0.25} roughness={0.45} />
    </mesh>
  );
}

/** Gentle pointer parallax; invalidates only while settling toward the target. */
function Parallax({ children }: { children: ReactNode }) {
  const group = useRef<THREE.Group>(null);
  const targetX = useRef(0);
  const targetY = useRef(0);
  const { gl, invalidate } = useThree();

  useEffect(() => {
    const el = gl.domElement;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      targetX.current = ((e.clientX - r.left) / r.width - 0.5) * 0.22;
      targetY.current = ((e.clientY - r.top) / r.height - 0.5) * 0.12;
      invalidate();
    };
    el.addEventListener("pointermove", onMove);
    return () => el.removeEventListener("pointermove", onMove);
  }, [gl, invalidate]);

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    g.rotation.y += (targetX.current - g.rotation.y) * 0.08;
    g.rotation.x += (-targetY.current - g.rotation.x) * 0.08;
    if (Math.abs(targetX.current - g.rotation.y) > 0.001) invalidate();
  });

  return <group ref={group}>{children}</group>;
}

export default function JarScene({ coins, dropNonce }: { coins: number; dropNonce: number }) {
  const settled = useMemo(() => SETTLE.slice(0, Math.max(0, Math.min(SETTLE.length, coins))), [coins]);
  return (
    <Canvas
      frameloop="demand"
      dpr={[1, 1.5]}
      camera={{ position: [0, 1.35, 4.6], fov: 35 }}
      gl={{ antialias: true, alpha: true }}
      style={{ width: "100%", height: "100%" }}
    >
      <Environment />
      <ambientLight intensity={0.7} />
      <hemisphereLight args={["#dff3e9", "#ffffff", 0.55]} />
      <directionalLight position={[3, 5, 4]} intensity={1.3} />
      <directionalLight position={[-4, 2, 3]} intensity={0.5} color="#bfe9d4" />
      <Parallax>
        <Jar />
        {settled.map((p, i) => (
          <Coin key={i} position={p} />
        ))}
        <DroppingCoin nonce={dropNonce} settleIndex={coins} />
      </Parallax>
    </Canvas>
  );
}
