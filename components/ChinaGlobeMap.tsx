"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import cities from "@/content/cities.json";
import MapGesturePrompt from "./MapGesturePrompt";
import { useHandTracking } from "./useHandTracking";

// react-globe.gl must be loaded client-side only — it depends on WebGL
// and breaks SSR.
const Globe = dynamic(() => import("react-globe.gl"), { ssr: false });

interface City {
  name: string;
  lat: number;
  lng: number;
  label: string;
  photoFolder: string;
  photoCount: number;
}

// Countries GeoJSON — served from /public, avoids CDN blocking in China
const COUNTRIES_URL = "/globe/countries.geojson";

// Center of China (roughly)
const CHINA_LAT = 35;
const CHINA_LNG = 105;

interface GeoFeature {
  properties?: { name?: string; NAME?: string; [key: string]: unknown };
  geometry?: unknown;
}

interface CountriesGeoJson {
  features: GeoFeature[];
}

export default function ChinaGlobeMap() {
  const [selected, setSelected] = useState<City | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [hoveredCity, setHoveredCity] = useState<string | null>(null);
  const [lockedCity, setLockedCity] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [gestureMode, setGestureMode] = useState<
    "none" | "camera" | "mouse"
  >("none");
  const [countries, setCountries] = useState<CountriesGeoJson | null>(null);
  const [globeReady, setGlobeReady] = useState(false);

  const globeRef = useRef<{
    controls: () => {
      autoRotate: boolean;
      autoRotateSpeed: number;
      enableZoom: boolean;
      enableRotate: boolean;
    };
    pointOfView: (
      pov: { lat?: number; lng?: number; altitude?: number },
      transitionMs?: number
    ) => void;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ w: 800, h: 600 });

  const { hand, status: handStatus, error: handError, videoRef } =
    useHandTracking(gestureMode === "camera");

  const typedCities = cities as City[];

  // Fetch countries GeoJSON
  useEffect(() => {
    setMounted(true);
    fetch(COUNTRIES_URL)
      .then((r) => r.json())
      .then((data) => setCountries(data))
      .catch((err) => {
        console.error("Failed to load countries geojson:", err);
      });
  }, []);

  // Responsive sizing
  useEffect(() => {
    function updateSize() {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize({ w: rect.width, h: rect.height });
      }
    }
    updateSize();
    const obs = new ResizeObserver(updateSize);
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  // Initial POV + autoRotate setup once Globe is ready
  useEffect(() => {
    if (!globeReady || !globeRef.current) return;
    globeRef.current.pointOfView(
      { lat: CHINA_LAT, lng: CHINA_LNG, altitude: 1.8 },
      1200
    );
    const controls = globeRef.current.controls();
    controls.enableZoom = false;
    controls.autoRotate = gestureMode !== "mouse"; // mouse mode = static
    controls.autoRotateSpeed = 0.3;
  }, [globeReady, gestureMode]);

  // Camera-mode hand control — rotate globe based on hand position
  useEffect(() => {
    if (gestureMode !== "camera" || !hand || !globeReady || !globeRef.current)
      return;
    const controls = globeRef.current.controls();
    controls.autoRotate = false;
    // Map hand x/y to POV delta. hand.x=0.5 = centered on China.
    const lng = CHINA_LNG + (hand.x - 0.5) * 90; // ±45° around China center
    const lat = CHINA_LAT + (0.5 - hand.y) * 40; // ±20° lat
    globeRef.current.pointOfView({ lat, lng, altitude: 1.8 }, 120);
  }, [hand, gestureMode, globeReady]);

  // Preload first photo per city
  useEffect(() => {
    if (!mounted) return;
    typedCities.forEach((c) => {
      const img = document.createElement("img");
      img.src = `/cities/${c.name}_1.jpg`;
    });
  }, [mounted, typedCities]);

  const selectCity = useCallback((city: City) => {
    setSelected(city);
    setPhotoIndex(0);
  }, []);

  // Keyboard nav
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

  // Gesture flow: OK lock → fist open → open hand close
  useEffect(() => {
    if (gestureMode !== "camera" || !hand) return;
    if (hand.isOk && hoveredCity && !lockedCity) {
      setLockedCity(hoveredCity);
    } else if (hand.isFist && lockedCity && !selected) {
      const c = typedCities.find((c) => c.name === lockedCity);
      if (c) selectCity(c);
    } else if (!hand.isFist && !hand.isOk && selected) {
      setSelected(null);
      setLockedCity(null);
    }
  }, [hand, gestureMode, hoveredCity, lockedCity, selected, typedCities, selectCity]);

  // Filter countries to highlight China with a brighter color
  const isChinaFeature = useCallback((feat: GeoFeature) => {
    const name = (feat.properties?.NAME ?? feat.properties?.name ?? "") as string;
    return name === "China" || name === "中国";
  }, []);

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
            ref={containerRef}
            className="relative w-full rounded-2xl overflow-hidden"
            style={{
              aspectRatio: "1 / 1",
              background:
                "radial-gradient(ellipse at 50% 40%, #0a1628 0%, #040810 60%, #010204 100%)",
              boxShadow:
                "0 50px 100px rgba(0,0,0,0.75), 0 0 120px rgba(80,160,255,0.1), inset 0 1px 0 rgba(255,255,255,0.05)",
            }}
          >
            {mounted && gestureMode === "none" && (
              <MapGesturePrompt
                onAllow={() => setGestureMode("camera")}
                onDeny={() => setGestureMode("mouse")}
              />
            )}

            {!countries && (
              <div className="absolute inset-0 flex items-center justify-center text-white/50 text-xs font-sans tracking-widest">
                加载全球数据…
              </div>
            )}

            {countries && (
              <Globe
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                ref={globeRef as any}
                width={containerSize.w}
                height={containerSize.h}
                backgroundColor="rgba(0,0,0,0)"
                // Remove the earth texture — we want the hex grid look,
                // not a photo-realistic earth.
                globeImageUrl={null}
                showAtmosphere
                atmosphereColor="#4db3ff"
                atmosphereAltitude={0.22}
                // Hexagonal dot coverage over all countries (GitHub globe style)
                hexPolygonsData={countries.features}
                hexPolygonResolution={3}
                hexPolygonMargin={0.4}
                hexPolygonUseDots
                hexPolygonColor={(feat) =>
                  isChinaFeature(feat as GeoFeature)
                    ? "#7dd3fc"
                    : "rgba(120,180,255,0.5)"
                }
                // City markers
                pointsData={typedCities}
                pointLat={(d) => (d as City).lat}
                pointLng={(d) => (d as City).lng}
                pointColor={(d) =>
                  lockedCity === (d as City).name
                    ? "#ffd68a"
                    : hoveredCity === (d as City).name
                    ? "#ffb070"
                    : "#ff9960"
                }
                pointAltitude={0.01}
                pointRadius={(d) =>
                  lockedCity === (d as City).name
                    ? 0.55
                    : hoveredCity === (d as City).name
                    ? 0.4
                    : 0.3
                }
                pointResolution={12}
                // Hover + click wiring (mouse mode)
                onPointHover={(p) => setHoveredCity(p ? (p as City).name : null)}
                onPointClick={(p) => selectCity(p as City)}
                // Labels for cities
                labelsData={typedCities}
                labelLat={(d) => (d as City).lat}
                labelLng={(d) => (d as City).lng}
                labelText={(d) => (d as City).name}
                labelSize={0.4}
                labelDotRadius={0}
                labelAltitude={0.012}
                labelColor={() => "rgba(255,220,180,0.9)"}
                labelResolution={3}
                animateIn
                onGlobeReady={() => setGlobeReady(true)}
              />
            )}

            {/* Camera preview + status */}
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
                  : "移动手掌，转动地球"}
              </div>
            )}

            {/* Mouse mode: city chip buttons */}
            {gestureMode === "mouse" && (
              <div className="absolute bottom-4 left-4 right-4 z-[6] flex flex-wrap gap-2 justify-center">
                {typedCities.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => selectCity(c)}
                    onMouseEnter={() => setHoveredCity(c.name)}
                    onMouseLeave={() => setHoveredCity(null)}
                    className="px-3 py-1 text-[10px] font-sans tracking-wider rounded-full transition-all"
                    style={{
                      background:
                        hoveredCity === c.name
                          ? "rgba(255,180,112,0.15)"
                          : "rgba(255,255,255,0.06)",
                      border:
                        hoveredCity === c.name
                          ? "1px solid rgba(255,180,112,0.4)"
                          : "1px solid rgba(255,255,255,0.12)",
                      color:
                        hoveredCity === c.name
                          ? "rgba(255,220,180,1)"
                          : "rgba(255,255,255,0.7)",
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
