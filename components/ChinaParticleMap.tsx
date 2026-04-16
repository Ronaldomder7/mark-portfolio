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

// SVG viewBox of the original map: x=80, y=-20, w=700, h=700
const VIEW_X = 80;
const VIEW_Y = -20;
const VIEW_W = 700;
const VIEW_H = 700;

// Project geographic coords to SVG space (same as ChinaMap)
const W = 800;
const H = 680;
function projectGeo(lat: number, lng: number) {
  const x = ((lng - 73) / (135 - 73)) * W;
  const y = ((54 - lat) / (54 - 18)) * H;
  return { x, y };
}

// Convert SVG coords to Three.js world coords (centered, normalized)
function svgToWorld(x: number, y: number): [number, number, number] {
  const cx = VIEW_X + VIEW_W / 2;
  const cy = VIEW_Y + VIEW_H / 2;
  const worldX = ((x - cx) / VIEW_W) * 10; // ~[-5, 5]
  const worldY = -((y - cy) / VIEW_H) * 10; // flip Y, ~[-5, 5]
  const worldZ = 0;
  return [worldX, worldY, worldZ];
}

// Sample points inside the filled area of an SVG path using isPointInFill
function samplePathFill(
  pathD: string,
  step: number
): { x: number; y: number }[] {
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
      svgPt.x = x + (Math.random() - 0.5) * step; // jitter for organic feel
      svgPt.y = y + (Math.random() - 0.5) * step;
      if (path.isPointInFill(svgPt)) {
        pts.push({ x: svgPt.x, y: svgPt.y });
      }
    }
  }
  document.body.removeChild(svg);
  return pts;
}

// Sample points along the OUTLINE of an SVG path at fixed arc-length intervals
function samplePathOutline(
  pathD: string,
  step: number
): { x: number; y: number }[] {
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

// --- Inner R3F scene ---

interface SceneProps {
  fillPositions: Float32Array;
  borderPositions: Float32Array;
  cityPositions: { city: City; world: THREE.Vector3 }[];
  lockedCity: string | null;
  hand: { x: number; y: number; isFist: boolean; isOk: boolean } | null;
  gestureMode: "none" | "camera" | "mouse";
  hoveredCityRef: React.MutableRefObject<string | null>;
  onHoverChange: (name: string | null) => void;
}

function Scene({
  fillPositions,
  borderPositions,
  cityPositions,
  lockedCity,
  hand,
  gestureMode,
  hoveredCityRef,
  onHoverChange,
}: SceneProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { camera, size } = useThree();

  // Smoothly rotate the group based on hand position
  useFrame(() => {
    if (!groupRef.current) return;
    const targetRotY =
      gestureMode === "camera" && hand ? (hand.x - 0.5) * 0.7 : 0;
    const targetRotX =
      gestureMode === "camera" && hand ? (hand.y - 0.5) * 0.5 : -0.15;
    groupRef.current.rotation.y +=
      (targetRotY - groupRef.current.rotation.y) * 0.1;
    groupRef.current.rotation.x +=
      (targetRotX - groupRef.current.rotation.x) * 0.1;

    // Subtle breathing float
    const t = performance.now() * 0.0004;
    groupRef.current.position.y = Math.sin(t) * 0.05;

    // Compute which city is closest to the hand cursor in SCREEN space
    if (gestureMode === "camera" && hand && cityPositions.length > 0) {
      const screenCursorX = hand.x * size.width;
      const screenCursorY = hand.y * size.height;
      let best: { name: string; dist: number } | null = null;
      const v = new THREE.Vector3();
      for (const { city, world } of cityPositions) {
        v.copy(world).applyMatrix4(groupRef.current.matrixWorld);
        v.project(camera);
        const sx = ((v.x + 1) / 2) * size.width;
        const sy = ((1 - v.y) / 2) * size.height;
        const dx = sx - screenCursorX;
        const dy = sy - screenCursorY;
        const d = dx * dx + dy * dy;
        if (!best || d < best.dist) best = { name: city.name, dist: d };
      }
      if (best && best.name !== hoveredCityRef.current) {
        hoveredCityRef.current = best.name;
        onHoverChange(best.name);
      }
    }
  });

  return (
    <group ref={groupRef}>
      {/* Fill particle cloud — cold blue-white */}
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[fillPositions, 3]}
            count={fillPositions.length / 3}
            array={fillPositions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          color="#9ec5ff"
          size={0.028}
          sizeAttenuation
          transparent
          opacity={0.75}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Province borders — faint particle trail */}
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[borderPositions, 3]}
            count={borderPositions.length / 3}
            array={borderPositions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          color="#c8dcff"
          size={0.035}
          sizeAttenuation
          transparent
          opacity={0.55}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* City spheres — amber, bigger, glowing */}
      {cityPositions.map(({ city, world }) => {
        const isLocked = lockedCity === city.name;
        return (
          <mesh key={city.name} position={world}>
            <sphereGeometry args={[isLocked ? 0.14 : 0.08, 16, 16]} />
            <meshBasicMaterial
              color={isLocked ? "#ffd68a" : "#ff9960"}
              transparent
              opacity={isLocked ? 1 : 0.9}
            />
          </mesh>
        );
      })}

      {/* Hand cursor projected to 3D — a floating light orb at the hand
          position in viewport space, given slight depth */}
      {gestureMode === "camera" && hand && <HandCursor hand={hand} />}
    </group>
  );
}

// A small floating orb that tracks the hand cursor in the 3D scene.
// Uses camera-aligned position by converting NDC to world coords.
function HandCursor({
  hand,
}: {
  hand: { x: number; y: number; isFist: boolean; isOk: boolean };
}) {
  const ref = useRef<THREE.Mesh>(null);
  const { camera, size } = useThree();

  useFrame(() => {
    if (!ref.current) return;
    // Map hand.x/y (0..1) to NDC (-1..1)
    const ndcX = hand.x * 2 - 1;
    const ndcY = -(hand.y * 2 - 1);
    const v = new THREE.Vector3(ndcX, ndcY, 0.5).unproject(camera);
    // Place slightly in front of the point cloud
    ref.current.position.copy(v);
  });

  const color = hand.isFist ? "#ffb464" : hand.isOk ? "#78ffb4" : "#ffe6b4";
  const scale = hand.isFist ? 0.35 : hand.isOk ? 0.28 : 0.22;
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[scale, 16, 16]} />
      <meshBasicMaterial color={color} transparent opacity={0.7} />
    </mesh>
  );
}

// --- Main exported component ---

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

  // Sample particle positions once on mount
  const [fillPositions, setFillPositions] = useState<Float32Array>(
    new Float32Array(0)
  );
  const [borderPositions, setBorderPositions] = useState<Float32Array>(
    new Float32Array(0)
  );

  useEffect(() => {
    setMounted(true);

    // Do particle sampling in next tick so initial render isn't blocked
    const timer = setTimeout(() => {
      const fills: number[] = [];
      const borders: number[] = [];
      for (const prov of CHINA_PROVINCES) {
        const fillPts = samplePathFill(prov.path, 8);
        for (const p of fillPts) {
          const [x, y, z] = svgToWorld(p.x, p.y);
          // Small Z jitter for depth
          fills.push(x, y, z + (Math.random() - 0.5) * 0.4);
        }
        const borderPts = samplePathOutline(prov.path, 4);
        for (const p of borderPts) {
          const [x, y] = svgToWorld(p.x, p.y);
          borders.push(x, y, 0.05);
        }
      }
      setFillPositions(new Float32Array(fills));
      setBorderPositions(new Float32Array(borders));
      setParticlesReady(true);
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  // Cities in 3D world
  const cityPositions = useMemo(() => {
    return typedCities.map((city) => {
      const { x, y } = projectGeo(city.lat, city.lng);
      const [wx, wy, wz] = svgToWorld(x, y);
      return {
        city,
        world: new THREE.Vector3(wx, wy, wz + 0.15),
      };
    });
  }, [typedCities]);

  const selectCity = useCallback((city: City) => {
    setSelected(city);
    setPhotoIndex(0);
  }, []);

  // Keyboard: esc, arrows
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

  // Preload first photo of each city so gallery opens instantly
  useEffect(() => {
    if (!mounted) return;
    typedCities.forEach((c) => {
      const img = document.createElement("img");
      img.src = `/cities/${c.name}_1.jpg`;
    });
  }, [mounted, typedCities]);

  // Gesture flow: OK to lock, fist to open, open hand to close
  useEffect(() => {
    if (gestureMode !== "camera" || !hand) return;

    if (hand.isOk && hoveredCity && !lockedCity) {
      setLockedCity(hoveredCity);
    } else if (hand.isFist && lockedCity && !selected) {
      const lockedObj = cityPositions.find(
        (c) => c.city.name === lockedCity
      );
      if (lockedObj) selectCity(lockedObj.city);
    } else if (!hand.isFist && !hand.isOk && selected) {
      setSelected(null);
      setLockedCity(null);
    }
  }, [hand, gestureMode, hoveredCity, lockedCity, selected, cityPositions, selectCity]);

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

          {/* Map container */}
          <div
            className="relative w-full rounded-2xl overflow-hidden"
            style={{
              aspectRatio: "1 / 1",
              background:
                "radial-gradient(ellipse at 50% 30%, #0b1220 0%, #05070e 60%, #020308 100%)",
              boxShadow:
                "0 40px 80px rgba(0,0,0,0.6), 0 0 100px rgba(64,128,200,0.1), inset 0 1px 0 rgba(255,255,255,0.04)",
            }}
          >
            {/* Gesture opt-in prompt */}
            {mounted && gestureMode === "none" && (
              <MapGesturePrompt
                onAllow={() => setGestureMode("camera")}
                onDeny={() => setGestureMode("mouse")}
              />
            )}

            {/* Loading state */}
            {!particlesReady && (
              <div className="absolute inset-0 flex items-center justify-center text-white/50 text-xs font-sans tracking-widest">
                加载粒子中…
              </div>
            )}

            {/* R3F Canvas */}
            {particlesReady && (
              <Canvas
                camera={{ position: [0, 0, 8], fov: 45 }}
                style={{ background: "transparent" }}
                dpr={[1, 2]}
              >
                <Scene
                  fillPositions={fillPositions}
                  borderPositions={borderPositions}
                  cityPositions={cityPositions}
                  lockedCity={lockedCity}
                  hand={hand}
                  gestureMode={gestureMode}
                  hoveredCityRef={hoveredCityRef}
                  onHoverChange={setHoveredCity}
                />
              </Canvas>
            )}

            {/* Camera mode: video preview + status */}
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

            {/* Instruction bar */}
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
                  : "移动手掌，对准一个城市"}
              </div>
            )}

            {/* Mouse mode: click a city name below the map to view gallery */}
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

      {/* Photo Modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-6"
          style={{
            background: "rgba(10, 10, 18, 0.92)",
            backdropFilter: "blur(12px)",
          }}
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
                    onClick={() =>
                      setPhotoIndex((i) => Math.max(0, i - 1))
                    }
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                  >
                    ←
                  </button>
                )}
                {photoIndex < selected.photoCount - 1 && (
                  <button
                    type="button"
                    onClick={() =>
                      setPhotoIndex((i) =>
                        Math.min(selected.photoCount - 1, i + 1)
                      )
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
