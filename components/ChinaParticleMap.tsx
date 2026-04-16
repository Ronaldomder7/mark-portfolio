"use client";

import {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import Image from "next/image";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import cities from "@/content/cities.json";
import { CHINA_PROVINCES } from "@/lib/china-map-data";
import MapGesturePrompt from "./MapGesturePrompt";
import { useHandTracking } from "./useHandTracking";

interface City {
  name: string;
  lat: number;
  lng: number;
  label: string;
  photoFolder: string;
  photoCount: number;
}

const VIEW_X = 80;
const VIEW_Y = -20;
const VIEW_W = 700;
const VIEW_H = 700;
const W = 800;
const H = 680;

function projectGeo(lat: number, lng: number) {
  const x = ((lng - 73) / (135 - 73)) * W;
  const y = ((54 - lat) / (54 - 18)) * H;
  return { x, y };
}

function svgToWorld(x: number, y: number): [number, number, number] {
  const cx = VIEW_X + VIEW_W / 2;
  const cy = VIEW_Y + VIEW_H / 2;
  const worldX = ((x - cx) / VIEW_W) * 10;
  const worldY = -((y - cy) / VIEW_H) * 10;
  return [worldX, worldY, 0];
}

function samplePathFill(pathD: string, step: number): { x: number; y: number }[] {
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", `${VIEW_X} ${VIEW_Y} ${VIEW_W} ${VIEW_H}`);
  svg.style.position = "absolute";
  svg.style.left = "-9999px";
  svg.style.width = "700px";
  svg.style.height = "700px";
  document.body.appendChild(svg);
  const path = document.createElementNS(svgNS, "path");
  path.setAttribute("d", pathD);
  svg.appendChild(path);
  const bbox = path.getBBox();
  const pts: { x: number; y: number }[] = [];
  const svgPt = svg.createSVGPoint();
  for (let x = bbox.x; x < bbox.x + bbox.width; x += step) {
    for (let y = bbox.y; y < bbox.y + bbox.height; y += step) {
      svgPt.x = x + (Math.random() - 0.5) * step;
      svgPt.y = y + (Math.random() - 0.5) * step;
      if (path.isPointInFill(svgPt)) pts.push({ x: svgPt.x, y: svgPt.y });
    }
  }
  document.body.removeChild(svg);
  return pts;
}

function samplePathOutline(pathD: string, step: number): { x: number; y: number }[] {
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", `${VIEW_X} ${VIEW_Y} ${VIEW_W} ${VIEW_H}`);
  svg.style.position = "absolute";
  svg.style.left = "-9999px";
  svg.style.width = "700px";
  svg.style.height = "700px";
  document.body.appendChild(svg);
  const path = document.createElementNS(svgNS, "path");
  path.setAttribute("d", pathD);
  svg.appendChild(path);
  const total = path.getTotalLength();
  const pts: { x: number; y: number }[] = [];
  for (let d = 0; d < total; d += step) {
    const p = path.getPointAtLength(d);
    pts.push({ x: p.x, y: p.y });
  }
  document.body.removeChild(svg);
  return pts;
}

// --- Circular glow texture used by particles for soft-bloom look ---
function makeGlowTexture(): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.3, "rgba(255,255,255,0.6)");
  grad.addColorStop(0.7, "rgba(255,255,255,0.15)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

// --- Particle Field with hand-driven repulsion physics ---

interface ParticleFieldProps {
  restPositions: Float32Array;
  colors: Float32Array;
  glowTexture: THREE.Texture;
  handWorldRef: React.MutableRefObject<THREE.Vector3 | null>;
  pointSize: number;
}

function ParticleField({
  restPositions,
  colors,
  glowTexture,
  handWorldRef,
  pointSize,
}: ParticleFieldProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const currentPositions = useMemo(
    () => new Float32Array(restPositions),
    [restPositions]
  );
  const velocities = useMemo(
    () => new Float32Array(restPositions.length),
    [restPositions]
  );

  useFrame((_, delta) => {
    const pts = pointsRef.current;
    if (!pts) return;
    const posAttr = pts.geometry.attributes.position as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;
    const n = arr.length / 3;

    const hand = handWorldRef.current;
    const hx = hand?.x ?? 0;
    const hy = hand?.y ?? 0;
    const hz = hand?.z ?? 0;
    const REPULSE_RANGE = 1.4;
    const REPULSE_STRENGTH = 6.5;
    const SPRING = 3.5;
    const DAMPING = 0.88;
    const dt = Math.min(delta, 0.033); // clamp for stability

    for (let i = 0; i < n; i++) {
      const ix = i * 3;
      const iy = i * 3 + 1;
      const iz = i * 3 + 2;
      const cx = currentPositions[ix];
      const cy = currentPositions[iy];
      const cz = currentPositions[iz];
      const rx = restPositions[ix];
      const ry = restPositions[iy];
      const rz = restPositions[iz];

      // Spring back to rest
      let fx = (rx - cx) * SPRING;
      let fy = (ry - cy) * SPRING;
      let fz = (rz - cz) * SPRING;

      // Repulsion from hand
      if (hand) {
        const dx = cx - hx;
        const dy = cy - hy;
        const dz = cz - hz;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < REPULSE_RANGE && dist > 0.001) {
          const falloff = 1 - dist / REPULSE_RANGE;
          const force = falloff * falloff * REPULSE_STRENGTH;
          const inv = 1 / dist;
          fx += dx * inv * force;
          fy += dy * inv * force;
          fz += dz * inv * force;
        }
      }

      velocities[ix] = (velocities[ix] + fx * dt) * DAMPING;
      velocities[iy] = (velocities[iy] + fy * dt) * DAMPING;
      velocities[iz] = (velocities[iz] + fz * dt) * DAMPING;
      currentPositions[ix] = cx + velocities[ix] * dt;
      currentPositions[iy] = cy + velocities[iy] * dt;
      currentPositions[iz] = cz + velocities[iz] * dt;
      arr[ix] = currentPositions[ix];
      arr[iy] = currentPositions[iy];
      arr[iz] = currentPositions[iz];
    }
    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[new Float32Array(restPositions), 3]}
          count={restPositions.length / 3}
          array={new Float32Array(restPositions)}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
          count={colors.length / 3}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={pointSize}
        vertexColors
        map={glowTexture}
        transparent
        alphaTest={0.01}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  );
}

// --- Background stars (parallax layer, doesn't rotate with map) ---

function BackgroundStars({ glowTexture }: { glowTexture: THREE.Texture }) {
  const { positions, colors } = useMemo(() => {
    const COUNT = 400;
    const pos = new Float32Array(COUNT * 3);
    const col = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      // Distribute stars in a spherical shell behind the scene
      const r = 25 + Math.random() * 15;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = -Math.abs(r * Math.cos(phi)) - 10;
      const tint = 0.7 + Math.random() * 0.3;
      col[i * 3] = tint * 0.8;
      col[i * 3 + 1] = tint * 0.9;
      col[i * 3 + 2] = tint;
    }
    return { positions: pos, colors: col };
  }, []);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
          count={colors.length / 3}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.18}
        vertexColors
        map={glowTexture}
        transparent
        alphaTest={0.01}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// --- Main scene ---

interface SceneProps {
  fillPositions: Float32Array;
  fillColors: Float32Array;
  borderPositions: Float32Array;
  borderColors: Float32Array;
  cityWorlds: { city: City; world: THREE.Vector3 }[];
  lockedCity: string | null;
  hand: { x: number; y: number; isFist: boolean; isOk: boolean } | null;
  gestureMode: "none" | "camera" | "mouse";
  hoveredCityRef: React.MutableRefObject<string | null>;
  onHoverChange: (name: string | null) => void;
}

function Scene({
  fillPositions,
  fillColors,
  borderPositions,
  borderColors,
  cityWorlds,
  lockedCity,
  hand,
  gestureMode,
  hoveredCityRef,
  onHoverChange,
}: SceneProps) {
  const mapGroupRef = useRef<THREE.Group>(null);
  const { camera, size } = useThree();
  const glowTexture = useMemo(makeGlowTexture, []);

  // Hand position in world space — computed once per frame, shared with particles
  const handWorldRef = useRef<THREE.Vector3 | null>(null);

  useFrame((_, delta) => {
    if (!mapGroupRef.current) return;

    // Hand → 3D world position (for repulsion)
    if (gestureMode === "camera" && hand) {
      const ndcX = hand.x * 2 - 1;
      const ndcY = -(hand.y * 2 - 1);
      const v = new THREE.Vector3(ndcX, ndcY, 0.4).unproject(camera);
      // Convert from world to map-group-local space
      const inverse = mapGroupRef.current.matrixWorld.clone().invert();
      v.applyMatrix4(inverse);
      handWorldRef.current = v;
    } else {
      handWorldRef.current = null;
    }

    // Auto-rotation + parallax tilt based on hand
    const baseSpin = delta * 0.06;
    mapGroupRef.current.rotation.y += baseSpin;
    if (gestureMode === "camera" && hand) {
      const targetTiltX = (hand.y - 0.5) * 0.35 - 0.15;
      const targetTiltZ = (hand.x - 0.5) * 0.08;
      mapGroupRef.current.rotation.x +=
        (targetTiltX - mapGroupRef.current.rotation.x) * 0.08;
      mapGroupRef.current.rotation.z +=
        (targetTiltZ - mapGroupRef.current.rotation.z) * 0.08;
    } else {
      mapGroupRef.current.rotation.x +=
        (-0.12 - mapGroupRef.current.rotation.x) * 0.05;
    }

    // Breathing float
    const t = performance.now() * 0.0004;
    mapGroupRef.current.position.y = Math.sin(t) * 0.08;

    // Camera parallax
    if (gestureMode === "camera" && hand) {
      const camOffsetX = (hand.x - 0.5) * 0.6;
      const camOffsetY = -(hand.y - 0.5) * 0.4;
      camera.position.x += (camOffsetX - camera.position.x) * 0.05;
      camera.position.y += (camOffsetY - camera.position.y) * 0.05;
      camera.lookAt(0, 0, 0);
    }

    // Nearest-city picking via screen projection
    if (gestureMode === "camera" && hand) {
      const sx = hand.x * size.width;
      const sy = hand.y * size.height;
      let best: { name: string; dist: number } | null = null;
      const v = new THREE.Vector3();
      for (const { city, world } of cityWorlds) {
        v.copy(world).applyMatrix4(mapGroupRef.current.matrixWorld);
        v.project(camera);
        const pxx = ((v.x + 1) / 2) * size.width;
        const pyy = ((1 - v.y) / 2) * size.height;
        const dx = pxx - sx;
        const dy = pyy - sy;
        const d = dx * dx + dy * dy;
        if (!best || d < best.dist) best = { name: city.name, dist: d };
      }
      // Only treat as hovered if cursor is reasonably close (in screen pixels)
      if (best && best.dist < 8000 && best.name !== hoveredCityRef.current) {
        hoveredCityRef.current = best.name;
        onHoverChange(best.name);
      } else if (best && best.dist >= 8000 && hoveredCityRef.current) {
        hoveredCityRef.current = null;
        onHoverChange(null);
      }
    }
  });

  return (
    <>
      <BackgroundStars glowTexture={glowTexture} />

      <group ref={mapGroupRef}>
        <ParticleField
          restPositions={fillPositions}
          colors={fillColors}
          glowTexture={glowTexture}
          handWorldRef={handWorldRef}
          pointSize={0.14}
        />
        <ParticleField
          restPositions={borderPositions}
          colors={borderColors}
          glowTexture={glowTexture}
          handWorldRef={handWorldRef}
          pointSize={0.2}
        />

        {/* Cities — amber pulsing spheres */}
        {cityWorlds.map(({ city, world }) => (
          <CitySphere
            key={city.name}
            world={world}
            isLocked={lockedCity === city.name}
            glowTexture={glowTexture}
          />
        ))}
      </group>

      {/* Hand cursor — a glowing orb that tracks hand in viewport space */}
      {gestureMode === "camera" && hand && <HandCursor hand={hand} />}
    </>
  );
}

function CitySphere({
  world,
  isLocked,
  glowTexture,
}: {
  world: THREE.Vector3;
  isLocked: boolean;
  glowTexture: THREE.Texture;
}) {
  const groupRef = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!groupRef.current) return;
    const t = performance.now() * 0.001;
    const pulse = 1 + Math.sin(t * 2) * 0.12;
    groupRef.current.scale.setScalar(isLocked ? 1.6 * pulse : pulse);
  });
  return (
    <group ref={groupRef} position={world}>
      <mesh>
        <sphereGeometry args={[0.07, 16, 16]} />
        <meshBasicMaterial color={isLocked ? "#ffd68a" : "#ff9960"} />
      </mesh>
      <sprite scale={[0.5, 0.5, 0.5]}>
        <spriteMaterial
          map={glowTexture}
          color={isLocked ? "#ffd68a" : "#ffb070"}
          transparent
          opacity={0.9}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
    </group>
  );
}

function HandCursor({
  hand,
}: {
  hand: { x: number; y: number; isFist: boolean; isOk: boolean };
}) {
  const ref = useRef<THREE.Sprite>(null);
  const { camera } = useThree();
  useFrame(() => {
    if (!ref.current) return;
    const ndcX = hand.x * 2 - 1;
    const ndcY = -(hand.y * 2 - 1);
    const v = new THREE.Vector3(ndcX, ndcY, 0.2).unproject(camera);
    ref.current.position.copy(v);
  });
  const color = hand.isFist ? "#ffb464" : hand.isOk ? "#78ffb4" : "#e8f4ff";
  const scale = hand.isFist ? 1.4 : hand.isOk ? 1.1 : 0.9;
  const glowTexture = useMemo(makeGlowTexture, []);
  return (
    <sprite ref={ref} scale={[scale, scale, scale]}>
      <spriteMaterial
        map={glowTexture}
        color={color}
        transparent
        opacity={0.95}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </sprite>
  );
}

// --- Main component ---

export default function ChinaParticleMap() {
  const [selected, setSelected] = useState<City | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [hoveredCity, setHoveredCity] = useState<string | null>(null);
  const [lockedCity, setLockedCity] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [gestureMode, setGestureMode] = useState<
    "none" | "camera" | "mouse"
  >("none");
  const [particlesReady, setParticlesReady] = useState(false);

  const hoveredCityRef = useRef<string | null>(null);

  const { hand, status: handStatus, error: handError, videoRef } =
    useHandTracking(gestureMode === "camera");

  const typedCities = cities as City[];

  const [fillPositions, setFillPositions] = useState<Float32Array>(
    new Float32Array(0)
  );
  const [fillColors, setFillColors] = useState<Float32Array>(
    new Float32Array(0)
  );
  const [borderPositions, setBorderPositions] = useState<Float32Array>(
    new Float32Array(0)
  );
  const [borderColors, setBorderColors] = useState<Float32Array>(
    new Float32Array(0)
  );

  useEffect(() => {
    setMounted(true);
    const timer = setTimeout(() => {
      const fills: number[] = [];
      const fcols: number[] = [];
      const borders: number[] = [];
      const bcols: number[] = [];
      for (const prov of CHINA_PROVINCES) {
        const fillPts = samplePathFill(prov.path, 9);
        for (const p of fillPts) {
          const [x, y] = svgToWorld(p.x, p.y);
          const z = (Math.random() - 0.5) * 0.6;
          fills.push(x, y, z);
          // Gradient color based on Y (latitude) — cooler blue at top, slightly cyan at bottom
          const t = (y + 5) / 10; // 0..1
          const r = 0.55 + (1 - t) * 0.1;
          const g = 0.75 + t * 0.1;
          const b = 1.0;
          fcols.push(r, g, b);
        }
        const borderPts = samplePathOutline(prov.path, 4);
        for (const p of borderPts) {
          const [x, y] = svgToWorld(p.x, p.y);
          borders.push(x, y, 0.1);
          bcols.push(0.85, 0.92, 1.0);
        }
      }
      setFillPositions(new Float32Array(fills));
      setFillColors(new Float32Array(fcols));
      setBorderPositions(new Float32Array(borders));
      setBorderColors(new Float32Array(bcols));
      setParticlesReady(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const cityWorlds = useMemo(
    () =>
      typedCities.map((city) => {
        const { x, y } = projectGeo(city.lat, city.lng);
        const [wx, wy] = svgToWorld(x, y);
        return { city, world: new THREE.Vector3(wx, wy, 0.2) };
      }),
    [typedCities]
  );

  const selectCity = useCallback((city: City) => {
    setSelected(city);
    setPhotoIndex(0);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setSelected(null);
      if (e.key === "ArrowRight" && selected) {
        setPhotoIndex((i) => Math.min(selected.photoCount - 1, i + 1));
      }
      if (e.key === "ArrowLeft" && selected) {
        setPhotoIndex((i) => Math.max(0, i - 1));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  useEffect(() => {
    if (!mounted) return;
    typedCities.forEach((c) => {
      const img = document.createElement("img");
      img.src = `/cities/${c.name}_1.jpg`;
    });
  }, [mounted, typedCities]);

  useEffect(() => {
    if (gestureMode !== "camera" || !hand) return;
    if (hand.isOk && hoveredCity && !lockedCity) {
      setLockedCity(hoveredCity);
    } else if (hand.isFist && lockedCity && !selected) {
      const lockedObj = cityWorlds.find((c) => c.city.name === lockedCity);
      if (lockedObj) selectCity(lockedObj.city);
    } else if (!hand.isFist && !hand.isOk && selected) {
      setSelected(null);
      setLockedCity(null);
    }
  }, [hand, gestureMode, hoveredCity, lockedCity, selected, cityWorlds, selectCity]);

  return (
    <>
      <section id="map" className="py-32 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-sans text-xs text-muted tracking-widest uppercase mb-4 text-center">
            我走过的地方 / FOOTPRINTS
          </h2>
          <p className="font-serif text-sm text-muted text-center mb-16">
            20 个城市，11 个省份
          </p>

          <div
            className="relative w-full rounded-2xl overflow-hidden"
            style={{
              aspectRatio: "1 / 1",
              background:
                "radial-gradient(ellipse at 50% 30%, #0a1628 0%, #040810 55%, #010204 100%)",
              boxShadow:
                "0 50px 100px rgba(0,0,0,0.75), 0 0 120px rgba(100,180,255,0.12), inset 0 1px 0 rgba(255,255,255,0.05)",
            }}
          >
            {mounted && gestureMode === "none" && (
              <MapGesturePrompt
                onAllow={() => setGestureMode("camera")}
                onDeny={() => setGestureMode("mouse")}
              />
            )}

            {!particlesReady && (
              <div className="absolute inset-0 flex items-center justify-center text-white/50 text-xs font-sans tracking-widest">
                加载粒子中…
              </div>
            )}

            {particlesReady && (
              <Canvas
                camera={{ position: [0, 0, 9], fov: 45 }}
                style={{ background: "transparent" }}
                dpr={[1, 2]}
                gl={{ antialias: true, alpha: true }}
              >
                <Scene
                  fillPositions={fillPositions}
                  fillColors={fillColors}
                  borderPositions={borderPositions}
                  borderColors={borderColors}
                  cityWorlds={cityWorlds}
                  lockedCity={lockedCity}
                  hand={hand}
                  gestureMode={gestureMode}
                  hoveredCityRef={hoveredCityRef}
                  onHoverChange={setHoveredCity}
                />
              </Canvas>
            )}

            {gestureMode === "camera" && (
              <div className="absolute top-4 left-4 z-10 w-56">
                <div className="aspect-video border border-line rounded-sm overflow-hidden bg-black relative">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    style={{ transform: "scaleX(-1)" }}
                    muted
                    playsInline
                  />
                  {handStatus !== "running" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-white text-xs font-sans tracking-wide text-center px-3">
                      {handStatus === "loading-wasm" && "加载识别引擎…"}
                      {handStatus === "loading-model" && "加载手势模型…"}
                      {handStatus === "awaiting-camera" && "等待摄像头…"}
                      {handStatus === "error" && (
                        <div>
                          <p className="mb-2 text-red-300">无法启动摄像头</p>
                          <p className="text-[10px] text-white/60 break-all">
                            {handError}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="mt-2 flex items-center justify-between gap-2 text-[10px] font-sans tracking-widest">
                  <span className="text-muted uppercase">
                    {handStatus === "running"
                      ? hand
                        ? hand.isFist
                          ? "握拳"
                          : hand.isOk
                          ? "OK"
                          : "跟踪中"
                        : "举手入镜"
                      : handStatus === "error"
                      ? "失败"
                      : "初始化…"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setGestureMode("mouse")}
                    className="text-muted hover:text-ink transition-colors uppercase"
                  >
                    切回鼠标 →
                  </button>
                </div>
              </div>
            )}

            {gestureMode === "camera" && handStatus === "running" && (
              <div
                className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[6] px-4 py-2 rounded-full font-sans text-xs tracking-wide pointer-events-none"
                style={{
                  background: "rgba(0,0,0,0.7)",
                  backdropFilter: "blur(6px)",
                  color: "#fff",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              >
                {!hand
                  ? "举起手掌，对准摄像头"
                  : selected
                  ? "松开手掌关闭"
                  : lockedCity
                  ? `握拳查看「${lockedCity}」的照片`
                  : hoveredCity
                  ? `👌 OK 手势确认「${hoveredCity}」`
                  : "移动手掌，拨动粒子"}
              </div>
            )}

            {gestureMode === "mouse" && (
              <div className="absolute bottom-4 left-4 right-4 z-[6] flex flex-wrap gap-2 justify-center">
                {typedCities.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => selectCity(c)}
                    className="px-3 py-1 text-[10px] font-sans tracking-wider rounded-full transition-all"
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      color: "rgba(255,255,255,0.7)",
                    }}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-6"
          style={{ background: "rgba(10,10,18,0.92)", backdropFilter: "blur(12px)" }}
          onClick={() => setSelected(null)}
        >
          <div
            className="relative max-w-lg w-full"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: "fadeUp 0.3s ease-out" }}
          >
            <div
              className="rounded-lg overflow-hidden relative"
              style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}
            >
              <Image
                src={`/cities/${selected.name}_${photoIndex + 1}.jpg`}
                alt={`${selected.name} - ${selected.label}`}
                width={800}
                height={600}
                className="w-full h-auto"
                priority
              />
            </div>
            <div className="mt-6 flex items-center justify-between">
              <div>
                <h3 className="font-serif text-2xl text-white mb-1">
                  {selected.name}
                </h3>
                <p className="font-sans text-xs text-white/50 tracking-wide">
                  {selected.label}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {photoIndex > 0 && (
                  <button
                    type="button"
                    onClick={() => setPhotoIndex((i) => Math.max(0, i - 1))}
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                  >
                    ←
                  </button>
                )}
                {photoIndex < selected.photoCount - 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setPhotoIndex((i) => Math.min(selected.photoCount - 1, i + 1))
                    }
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                  >
                    →
                  </button>
                )}
                <div className="font-sans text-xs text-white/40 tracking-widest">
                  {photoIndex + 1} / {selected.photoCount}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="absolute -top-4 -right-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              aria-label="关闭"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </>
  );
}
