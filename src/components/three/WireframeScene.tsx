"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { useMemo, useRef, Suspense } from "react";
import * as THREE from "three";

// shared drag/spin control state
type Controls = {
  dragging: boolean;
  vy: number; // angular velocity Y (rad/s)
  vx: number; // angular velocity X (rad/s)
  accumDX: number;
  accumDY: number;
  lastX: number;
  lastY: number;
};

const IDLE_SPEED = 0.16; // baseline auto-spin (rad/s)
const DRAG_SENS = 3.4; // how strongly a swipe rotates
const RELAX_Y = 2.6; // seconds to ease back to idle spin
const RELAX_X = 1.2; // seconds to settle vertical tilt
const MAX_TILT = 0.55;

// --- procedural "infrastructure" node graph on a globe ---------
function buildGraph(count: number, radius: number) {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i < count; i++) {
    const phi = Math.acos(1 - (2 * (i + 0.5)) / count);
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;
    pts.push(
      new THREE.Vector3(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi)
      )
    );
  }
  const edges: [number, number][] = [];
  const seen = new Set<string>();
  for (let i = 0; i < pts.length; i++) {
    const dists = pts
      .map((p, j) => ({ j, d: pts[i].distanceTo(p) }))
      .filter((o) => o.j !== i)
      .sort((a, b) => a.d - b.d)
      .slice(0, 3);
    for (const { j } of dists) {
      const key = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (!seen.has(key)) {
        seen.add(key);
        edges.push([i, j]);
      }
    }
  }
  return { pts, edges };
}

const CYAN = new THREE.Color("#7fe0ff");
const AMBER = new THREE.Color("#ffb347");

function Structure({ controls }: { controls: React.RefObject<Controls> }) {
  const group = useRef<THREE.Group>(null);
  const { size } = useThree();
  const GLOBE_R = 3.0;
  const { pts, edges } = useMemo(() => buildGraph(54, GLOBE_R), []);

  const lineGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const arr: number[] = [];
    for (const [a, b] of edges) {
      arr.push(pts[a].x, pts[a].y, pts[a].z, pts[b].x, pts[b].y, pts[b].z);
    }
    g.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3));
    return g;
  }, [pts, edges]);
  const lineMat = useRef<THREE.LineBasicMaterial>(null);

  const nodeGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(
        pts.flatMap((p) => [p.x, p.y, p.z]),
        3
      )
    );
    return g;
  }, [pts]);
  const nodeMat = useRef<THREE.PointsMaterial>(null);

  const SIGNALS = 26;
  const signals = useMemo(
    () =>
      Array.from({ length: SIGNALS }, () => ({
        edge: Math.floor(Math.random() * edges.length),
        t: Math.random(),
        speed: 0.25 + Math.random() * 0.5,
        amber: Math.random() > 0.7,
      })),
    [edges.length]
  );

  const signalGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(SIGNALS * 3), 3)
    );
    g.setAttribute(
      "color",
      new THREE.BufferAttribute(new Float32Array(SIGNALS * 3), 3)
    );
    return g;
  }, []);

  const tmp = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, delta) => {
    const g = group.current;
    const c = controls.current;
    if (!g || !c) return;

    const w = size.width || 1;

    if (c.dragging) {
      // rotate directly from the swipe, and derive momentum velocity
      const ry = (c.accumDX / w) * DRAG_SENS;
      const rx = (c.accumDY / w) * DRAG_SENS;
      g.rotation.y += ry;
      g.rotation.x += rx;
      const dt = Math.max(delta, 0.001);
      c.vy = ry / dt;
      c.vx = rx / dt;
      c.accumDX = 0;
      c.accumDY = 0;
    } else {
      // momentum eases back toward the steady idle spin
      c.vy += (IDLE_SPEED - c.vy) * Math.min(1, delta / RELAX_Y);
      c.vx += (0 - c.vx) * Math.min(1, delta / RELAX_X);
      g.rotation.y += c.vy * delta;
      g.rotation.x += c.vx * delta;
      // bring the globe gently back upright
      g.rotation.x += (0 - g.rotation.x) * Math.min(1, delta / 3);
    }
    g.rotation.x = THREE.MathUtils.clamp(g.rotation.x, -MAX_TILT, MAX_TILT);

    // subtle vertical bob
    g.position.y = Math.sin(state.clock.elapsedTime * 0.4) * 0.1;

    // node breathing + wiring flicker
    if (nodeMat.current)
      nodeMat.current.size = 0.1 + Math.sin(state.clock.elapsedTime * 1.6) * 0.02;
    if (lineMat.current)
      lineMat.current.opacity =
        0.42 + Math.sin(state.clock.elapsedTime * 0.9) * 0.12;

    // advance signals
    const posAttr = signalGeo.getAttribute("position") as THREE.BufferAttribute;
    const colAttr = signalGeo.getAttribute("color") as THREE.BufferAttribute;
    for (let i = 0; i < signals.length; i++) {
      const s = signals[i];
      s.t += delta * s.speed;
      if (s.t >= 1) {
        s.t = 0;
        s.edge = Math.floor(Math.random() * edges.length);
        s.amber = Math.random() > 0.7;
      }
      const [a, b] = edges[s.edge];
      tmp.copy(pts[a]).lerp(pts[b], s.t);
      posAttr.setXYZ(i, tmp.x, tmp.y, tmp.z);
      const col = s.amber ? AMBER : CYAN;
      colAttr.setXYZ(i, col.r, col.g, col.b);
    }
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
  });

  return (
    <group ref={group}>
      <lineSegments geometry={lineGeo}>
        <lineBasicMaterial
          ref={lineMat}
          color="#2f6f9e"
          transparent
          opacity={0.5}
        />
      </lineSegments>

      <points geometry={nodeGeo}>
        <pointsMaterial
          ref={nodeMat}
          color="#7fe0ff"
          size={0.1}
          sizeAttenuation
          transparent
          opacity={0.95}
        />
      </points>

      <points geometry={signalGeo}>
        <pointsMaterial
          size={0.22}
          sizeAttenuation
          vertexColors
          transparent
          opacity={1}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* globe lat/long shell */}
      <mesh>
        <sphereGeometry args={[GLOBE_R * 0.985, 24, 16]} />
        <meshBasicMaterial color="#1f4e76" wireframe transparent opacity={0.22} />
      </mesh>
      {/* opaque inner fill — occludes back-face wiring */}
      <mesh>
        <sphereGeometry args={[GLOBE_R * 0.93, 32, 24]} />
        <meshBasicMaterial color="#070d1c" transparent opacity={0.78} />
      </mesh>
      {/* equatorial halo */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[GLOBE_R * 1.05, GLOBE_R * 1.07, 64]} />
        <meshBasicMaterial
          color="#43c9ff"
          transparent
          opacity={0.25}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

// floating data motes
function Motes() {
  const ref = useRef<THREE.Points>(null);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const n = 220;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 18;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 12;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 18;
    }
    g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    return g;
  }, []);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.02;
  });
  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial color="#3a567a" size={0.035} transparent opacity={0.6} />
    </points>
  );
}

// keep the globe fully framed regardless of canvas aspect ratio
function FitCamera({ radius }: { radius: number }) {
  const { camera, size } = useThree();
  useFrame(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const margin = 1.5; // breathing room around the globe
    const target = radius * margin;
    const vFov = (cam.fov * Math.PI) / 180;
    const aspect = size.width / Math.max(size.height, 1);
    // distance needed so the globe fits both vertically and horizontally
    const distV = target / Math.tan(vFov / 2);
    const distH = target / (Math.tan(vFov / 2) * aspect);
    const dist = Math.max(distV, distH);
    if (Math.abs(cam.position.z - dist) > 0.01) {
      cam.position.z += (dist - cam.position.z) * 0.2;
      cam.updateProjectionMatrix();
    }
  });
  return null;
}

export default function WireframeScene() {
  const controls = useRef<Controls>({
    dragging: false,
    vy: IDLE_SPEED,
    vx: 0,
    accumDX: 0,
    accumDY: 0,
    lastX: 0,
    lastY: 0,
  });

  const onDown = (e: React.PointerEvent) => {
    const c = controls.current;
    c.dragging = true;
    c.vy = 0; // grab to stop
    c.vx = 0;
    c.lastX = e.clientX;
    c.lastY = e.clientY;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    const c = controls.current;
    if (!c.dragging) return;
    c.accumDX += e.clientX - c.lastX;
    c.accumDY += e.clientY - c.lastY;
    c.lastX = e.clientX;
    c.lastY = e.clientY;
  };
  const onUp = () => {
    controls.current.dragging = false;
  };

  return (
    <div
      className="absolute inset-0 cursor-grab touch-none active:cursor-grabbing"
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerLeave={onUp}
    >
      <Canvas
        camera={{ position: [0, 0, 10], fov: 50 }}
        dpr={[1, 1.8]}
        gl={{ antialias: true, alpha: true }}
      >
        <Suspense fallback={null}>
          <FitCamera radius={3.0} />
          <Structure controls={controls} />
          <Motes />
          <EffectComposer>
            <Bloom
              intensity={1.25}
              luminanceThreshold={0.12}
              luminanceSmoothing={0.4}
              mipmapBlur
            />
          </EffectComposer>
        </Suspense>
      </Canvas>
    </div>
  );
}
