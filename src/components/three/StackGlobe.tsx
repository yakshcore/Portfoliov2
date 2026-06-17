"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { useMemo, useRef, Suspense } from "react";
import * as THREE from "three";
import type { StackLayer } from "@/data/portfolio";

const R = 3;
const LAT_MAX = (60 * Math.PI) / 180;
const BASE_TILT = 0.5; // ~28° — keeps every band (incl. the equator) readable
const DRAG_SENS = 3.2; // how strongly a swipe spins the globe
const IDLE_SPIN = 0.1; // baseline auto-spin (rad/s)
const X_CLAMP = 1.3; // keep tilt from flipping the globe upside-down

// map a layer index to a latitude band (foundation low, frontier high)
function layerLatitude(i: number, n: number) {
  if (n <= 1) return 0;
  const t = i / (n - 1);
  return -LAT_MAX + t * (2 * LAT_MAX);
}

const DIM = new THREE.Color("#244b6e");
const HL = new THREE.Color("#eaffff"); // hovered-node highlight

// shared drag state — fed by pointer handlers in the overlay
export type GlobeControls = {
  dragging: boolean;
  vy: number;
  vx: number;
  accumDX: number;
  accumDY: number;
  lastX: number;
  lastY: number;
};

export type HoverNode = { layer: number; item: number } | null;

function Globe({
  layers,
  activeRef,
  controlsRef,
  hoverRef,
  staticFrame = false,
}: {
  layers: StackLayer[];
  activeRef: React.RefObject<number>;
  controlsRef: React.RefObject<GlobeControls>;
  hoverRef: React.RefObject<HoverNode>;
  staticFrame?: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const nodeMat = useRef<THREE.PointsMaterial>(null);
  const ringMats = useRef<(THREE.LineBasicMaterial | null)[]>([]);
  const halo = useRef<THREE.Mesh>(null);
  const { size } = useThree();

  const accentColors = useMemo(
    () =>
      layers.map(
        (L) => new THREE.Color(L.accent === "amber" ? "#ffcb6b" : "#7fe0ff")
      ),
    [layers]
  );

  // build node clusters per layer (latitude bands)
  const built = useMemo(() => {
    const layered: THREE.Vector3[][] = [];
    layers.forEach((L, i) => {
      const lat = layerLatitude(i, layers.length);
      const y = R * Math.sin(lat);
      const rr = R * Math.cos(lat);
      const ring: THREE.Vector3[] = [];
      const m = Math.max(L.items.length, 3);
      for (let k = 0; k < m; k++) {
        const theta = (k / m) * Math.PI * 2 + i * 0.55;
        ring.push(
          new THREE.Vector3(rr * Math.cos(theta), y, rr * Math.sin(theta))
        );
      }
      layered.push(ring);
    });

    const flat: THREE.Vector3[] = [];
    const nodeLayer: number[] = [];
    const nodeItem: number[] = [];
    layered.forEach((ring, i) =>
      ring.forEach((p, k) => {
        flat.push(p);
        nodeLayer.push(i);
        nodeItem.push(k);
      })
    );

    // spine: connect each node to the angular-nearest node one band up
    const spine: number[] = [];
    for (let i = 0; i < layered.length - 1; i++) {
      const a = layered[i];
      const b = layered[i + 1];
      a.forEach((pa) => {
        let best = b[0];
        let bd = Infinity;
        b.forEach((pb) => {
          const d = pa.distanceToSquared(pb);
          if (d < bd) {
            bd = d;
            best = pb;
          }
        });
        spine.push(pa.x, pa.y, pa.z, best.x, best.y, best.z);
      });
    }
    return { layered, flat, nodeLayer, nodeItem, spine };
  }, [layers]);

  const ringGeoms = useMemo(
    () =>
      built.layered.map((ring) => {
        const g = new THREE.BufferGeometry();
        g.setAttribute(
          "position",
          new THREE.Float32BufferAttribute(
            ring.flatMap((p) => [p.x, p.y, p.z]),
            3
          )
        );
        return g;
      }),
    [built]
  );

  const nodeGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(
        built.flat.flatMap((p) => [p.x, p.y, p.z]),
        3
      )
    );
    const colors = new Float32Array(built.flat.length * 3);
    for (let i = 0; i < built.flat.length; i++) {
      colors[i * 3] = DIM.r;
      colors[i * 3 + 1] = DIM.g;
      colors[i * 3 + 2] = DIM.b;
    }
    g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    return g;
  }, [built]);

  const spineGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(built.spine, 3)
    );
    return g;
  }, [built]);

  const tmpC = useMemo(() => new THREE.Color(), []);

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    const active = activeRef.current ?? 0;
    const c = controlsRef.current;
    const w = size.width || 1;
    const dt = Math.max(delta, 0.001);

    if (c && c.dragging) {
      // user is spinning it — apply the swipe directly and derive momentum
      const ry = (c.accumDX / w) * DRAG_SENS;
      const rx = (c.accumDY / w) * DRAG_SENS;
      g.rotation.y += ry; // free 360° horizontally
      g.rotation.x = THREE.MathUtils.clamp(g.rotation.x + rx, -X_CLAMP, X_CLAMP);
      c.vy = ry / dt;
      c.vx = rx / dt;
      c.accumDX = 0;
      c.accumDY = 0;
    } else {
      // momentum eases back to idle spin, tilt re-frames the active band
      if (c) {
        c.vy += (IDLE_SPIN - c.vy) * Math.min(1, delta / 2.2);
        c.vx += (0 - c.vx) * Math.min(1, delta / 1.0);
        g.rotation.y += c.vy * delta;
        g.rotation.x += c.vx * delta;
      } else {
        g.rotation.y += IDLE_SPIN * delta;
      }
      // hero (staticFrame) keeps a fixed 3/4 tilt; the scroll-story reframes
      // to bring each active layer band level with the camera.
      const targetX = staticFrame
        ? BASE_TILT
        : layerLatitude(active, layers.length) + BASE_TILT;
      g.rotation.x += (targetX - g.rotation.x) * Math.min(1, delta * 1.6);
      g.rotation.x = THREE.MathUtils.clamp(g.rotation.x, -X_CLAMP, X_CLAMP);
    }
    g.position.y = Math.sin(state.clock.elapsedTime * 0.4) * 0.08;

    const k = Math.min(1, delta * 5);
    const hover = hoverRef.current;

    // node colors: every layer down to the active one stays lit (cumulative);
    // a hovered tag pops its single node bright-white.
    const colAttr = nodeGeo.getAttribute("color") as THREE.BufferAttribute;
    for (let i = 0; i < built.nodeLayer.length; i++) {
      const li = built.nodeLayer[i];
      const isHover =
        !!hover && li === hover.layer && built.nodeItem[i] === hover.item;
      const target = isHover ? HL : li <= active ? accentColors[li] : DIM;
      tmpC.setRGB(colAttr.getX(i), colAttr.getY(i), colAttr.getZ(i));
      tmpC.lerp(target, isHover ? Math.min(1, delta * 12) : k);
      colAttr.setXYZ(i, tmpC.r, tmpC.g, tmpC.b);
    }
    colAttr.needsUpdate = true;

    if (nodeMat.current)
      nodeMat.current.size =
        0.14 + Math.sin(state.clock.elapsedTime * 1.8) * 0.015;

    // ring brightness: lit rings (i <= active) draw their full loop over the
    // sphere (depthTest off) so the highlighted line is always complete.
    ringMats.current.forEach((m, i) => {
      if (!m) return;
      const lit = i <= active;
      const tOp = i === active ? 0.95 : lit ? 0.55 : 0.12;
      m.opacity += (tOp - m.opacity) * k;
      m.color.lerp(lit ? accentColors[i] : DIM, k);
      m.depthTest = !lit;
    });

    // halo follows the hovered node (visible even through the globe)
    if (halo.current) {
      const ring = hover ? built.layered[hover.layer] : null;
      const p = ring ? ring[hover!.item] : null;
      if (p) {
        halo.current.position.copy(p);
        halo.current.visible = true;
        const s = 1 + Math.sin(state.clock.elapsedTime * 6) * 0.18;
        halo.current.scale.setScalar(s);
      } else {
        halo.current.visible = false;
      }
    }
  });

  return (
    <group ref={group}>
      {/* spine connecting the layers */}
      <lineSegments geometry={spineGeo}>
        <lineBasicMaterial color="#1f4368" transparent opacity={0.35} />
      </lineSegments>

      {/* per-layer rings */}
      {ringGeoms.map((geo, i) => (
        <lineLoop key={i} geometry={geo} renderOrder={2}>
          <lineBasicMaterial
            ref={(m) => {
              ringMats.current[i] = m;
            }}
            color="#244b6e"
            transparent
            opacity={0.13}
          />
        </lineLoop>
      ))}

      {/* nodes — depthTest off so highlighted layers show their full ring */}
      <points geometry={nodeGeo} renderOrder={3}>
        <pointsMaterial
          ref={nodeMat}
          size={0.14}
          sizeAttenuation
          vertexColors
          transparent
          opacity={1}
          depthWrite={false}
          depthTest={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* hovered-node halo */}
      <mesh ref={halo} visible={false} renderOrder={4}>
        <sphereGeometry args={[0.2, 18, 18]} />
        <meshBasicMaterial
          color="#eaffff"
          wireframe
          transparent
          opacity={0.85}
          depthTest={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* faint shell + inner fill for depth */}
      <mesh renderOrder={0}>
        <sphereGeometry args={[R * 0.985, 28, 18]} />
        <meshBasicMaterial color="#163152" wireframe transparent opacity={0.14} />
      </mesh>
      <mesh renderOrder={-1}>
        <sphereGeometry args={[R * 0.92, 32, 24]} />
        <meshBasicMaterial color="#070d1c" transparent opacity={0.7} />
      </mesh>
    </group>
  );
}

function FitCamera() {
  const { camera, size } = useThree();
  useFrame(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const target = R * 1.7;
    const vFov = (cam.fov * Math.PI) / 180;
    const aspect = size.width / Math.max(size.height, 1);
    const distV = target / Math.tan(vFov / 2);
    const distH = target / (Math.tan(vFov / 2) * aspect);
    const dist = Math.max(distV, distH);
    if (Math.abs(cam.position.z - dist) > 0.01) {
      cam.position.z += (dist - cam.position.z) * 0.15;
      cam.updateProjectionMatrix();
    }
  });
  return null;
}

export default function StackGlobe({
  layers,
  activeRef,
  controlsRef,
  hoverRef,
  staticFrame = false,
}: {
  layers: StackLayer[];
  activeRef: React.RefObject<number>;
  controlsRef: React.RefObject<GlobeControls>;
  hoverRef: React.RefObject<HoverNode>;
  staticFrame?: boolean;
}) {
  return (
    <Canvas
      camera={{ position: [0, 0, 11], fov: 50 }}
      dpr={[1, 1.8]}
      gl={{ antialias: true, alpha: true }}
    >
      <Suspense fallback={null}>
        <FitCamera />
        <Globe
          layers={layers}
          activeRef={activeRef}
          controlsRef={controlsRef}
          hoverRef={hoverRef}
          staticFrame={staticFrame}
        />
        <EffectComposer>
          <Bloom
            intensity={1.35}
            luminanceThreshold={0.12}
            luminanceSmoothing={0.4}
            mipmapBlur
          />
        </EffectComposer>
      </Suspense>
    </Canvas>
  );
}
