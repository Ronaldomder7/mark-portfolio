"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import cities from "@/content/cities.json";
import { CHINA_PROVINCES } from "@/lib/china-map-data";

interface City {
  name: string;
  lat: number;
  lng: number;
  label: string;
  photoFolder: string;
}

// Same projection as the SVG province paths (lng 73-135, lat 18-54 → 800x680)
const W = 800;
const H = 680;
function project(lat: number, lng: number) {
  const x = ((lng - 73) / (135 - 73)) * W;
  const y = ((54 - lat) / (54 - 18)) * H;
  return { x, y };
}

// Which provinces Mark has visited (for highlight)
const VISITED_PROVINCES = [
  "陕西省", "河南省", "山西省", "上海市", "福建省",
  "浙江省", "贵州省", "广东省", "北京市", "河北省", "湖北省",
];

export default function ChinaMap() {
  const [selected, setSelected] = useState<City | null>(null);
  const [hoveredCity, setHoveredCity] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setSelected(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const typedCities = cities as City[];

  // Memoize projected city positions
  const cityPositions = useMemo(
    () => typedCities.map((c) => ({ ...c, pos: project(c.lat, c.lng) })),
    [typedCities]
  );

  return (
    <>
      <section id="map" className="py-32 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-sans text-xs text-muted tracking-widest uppercase mb-4 text-center">
            我走过的地方
          </h2>
          <p className="font-serif text-sm text-muted text-center mb-16">
            20 个城市，10 个省份
          </p>

          {/* Map container */}
          <div
            className="relative w-full rounded-2xl overflow-hidden"
            style={{
              background: "linear-gradient(145deg, #0d1117 0%, #161b22 50%, #0d1117 100%)",
              boxShadow: "0 0 60px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)",
            }}
          >
            {/* Main SVG: provinces + dots + effects */}
            <svg
              viewBox={`80 -20 ${W - 100} ${H + 20}`}
              className="w-full h-auto"
              style={{ display: "block" }}
            >
              <defs>
                {/* Glow filter for dots */}
                <filter id="dot-glow" x="-100%" y="-100%" width="300%" height="300%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                {/* Stronger glow for Beijing */}
                <filter id="beijing-glow" x="-200%" y="-200%" width="500%" height="500%">
                  <feGaussianBlur stdDeviation="8" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                {/* Ripple animation rings */}
                <radialGradient id="ripple-grad">
                  <stop offset="0%" stopColor="#8B2E2E" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#8B2E2E" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* Province outlines */}
              {CHINA_PROVINCES.map((prov) => {
                const isVisited = VISITED_PROVINCES.includes(prov.name);
                return (
                  <path
                    key={prov.name}
                    d={prov.path}
                    fill={isVisited ? "rgba(139, 46, 46, 0.08)" : "rgba(255, 255, 255, 0.015)"}
                    stroke="rgba(255, 255, 255, 0.08)"
                    strokeWidth="0.5"
                    className="transition-colors duration-500"
                  />
                );
              })}

              {/* Province borders (slightly brighter on visited) */}
              {CHINA_PROVINCES.map((prov) => {
                const isVisited = VISITED_PROVINCES.includes(prov.name);
                if (!isVisited) return null;
                return (
                  <path
                    key={`border-${prov.name}`}
                    d={prov.path}
                    fill="none"
                    stroke="rgba(139, 46, 46, 0.15)"
                    strokeWidth="0.8"
                  />
                );
              })}

              {/* Connection lines between nearby cities */}
              {mounted && [
                ["宝鸡", "西安"], ["西安", "华山"], ["西安", "汉中"],
                ["晋城", "运城"], ["漳州", "厦门"],
                ["惠州", "深圳"], ["惠州", "清远"], ["惠州", "河源"],
                ["北京", "秦皇岛"],
              ].map(([from, to], i) => {
                const a = cityPositions.find((c) => c.name === from);
                const b = cityPositions.find((c) => c.name === to);
                if (!a || !b) return null;
                return (
                  <line
                    key={i}
                    x1={a.pos.x} y1={a.pos.y}
                    x2={b.pos.x} y2={b.pos.y}
                    stroke="rgba(139, 46, 46, 0.12)"
                    strokeWidth="0.6"
                    strokeDasharray="3 3"
                  />
                );
              })}

              {/* City dots with ripple effect */}
              {mounted && cityPositions.map((city, idx) => {
                const isBeijing = city.name === "北京";
                const isHovered = hoveredCity === city.name;
                const r = isBeijing ? 4.5 : 3;

                return (
                  <g key={city.name}>
                    {/* Ripple rings (CSS animated) */}
                    <circle
                      cx={city.pos.x} cy={city.pos.y} r={r * 4}
                      fill="none"
                      stroke="rgba(139, 46, 46, 0.2)"
                      strokeWidth="0.5"
                      className="city-ripple"
                      style={{ animationDelay: `${idx * 200}ms` }}
                    />
                    <circle
                      cx={city.pos.x} cy={city.pos.y} r={r * 2.5}
                      fill="none"
                      stroke="rgba(139, 46, 46, 0.3)"
                      strokeWidth="0.5"
                      className="city-ripple"
                      style={{ animationDelay: `${idx * 200 + 500}ms` }}
                    />

                    {/* Outer soft glow */}
                    <circle
                      cx={city.pos.x} cy={city.pos.y}
                      r={isHovered ? r * 3 : r * 2}
                      fill="url(#ripple-grad)"
                      opacity={isHovered ? 0.8 : 0.4}
                      className="transition-all duration-300"
                    />

                    {/* Core dot */}
                    <circle
                      cx={city.pos.x} cy={city.pos.y}
                      r={isHovered ? r * 1.5 : r}
                      fill={isBeijing ? "#ff6b6b" : "#d4726a"}
                      filter={isBeijing ? "url(#beijing-glow)" : "url(#dot-glow)"}
                      className="transition-all duration-300 cursor-pointer"
                      onClick={() => setSelected(city)}
                      onMouseEnter={() => setHoveredCity(city.name)}
                      onMouseLeave={() => setHoveredCity(null)}
                      style={{ cursor: "pointer" }}
                    />

                    {/* City label */}
                    <text
                      x={city.pos.x}
                      y={city.pos.y - (isBeijing ? 14 : 10)}
                      textAnchor="middle"
                      fill={isBeijing ? "rgba(255, 200, 200, 0.9)" : "rgba(255, 255, 255, 0.7)"}
                      fontSize={isBeijing ? "10" : "8"}
                      fontFamily="var(--font-sans)"
                      className="transition-opacity duration-300 pointer-events-none select-none"
                      opacity={isHovered || isBeijing ? 1 : 0}
                      style={{ textShadow: "0 1px 6px rgba(0,0,0,0.9)" }}
                    >
                      {city.name}
                      {isBeijing && (
                        <tspan fontSize="7" opacity="0.5" dx="4">← 在这里</tspan>
                      )}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Bottom info bar */}
            <div className="flex items-center justify-between px-6 py-4"
              style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
            >
              <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)", fontFamily: "var(--font-sans)", letterSpacing: "0.1em" }}>
                点击光点查看照片
              </p>
              <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.15)", fontFamily: "var(--font-sans)", letterSpacing: "0.15em" }}>
                20 CITIES · 10 PROVINCES
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Photo Modal — cinematic dark overlay */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-6"
          style={{ background: "rgba(10, 10, 18, 0.9)", backdropFilter: "blur(12px)" }}
          onClick={() => setSelected(null)}
        >
          <div
            className="relative max-w-lg w-full"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: "fadeUp 0.3s ease-out" }}
          >
            {/* Photo with subtle border */}
            <div
              className="rounded-lg overflow-hidden"
              style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}
            >
              <Image
                src={`/cities/${selected.name}.jpg`}
                alt={`${selected.name} - ${selected.label}`}
                width={800}
                height={600}
                className="w-full h-auto object-cover"
                style={{ maxHeight: "55vh" }}
              />
            </div>

            {/* Info below */}
            <div className="mt-5 flex items-end justify-between">
              <div>
                <p style={{ fontSize: "20px", color: "rgba(255,255,255,0.9)", fontFamily: "var(--font-serif)" }}>
                  {selected.name}
                </p>
                <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)", fontFamily: "var(--font-sans)", letterSpacing: "0.1em", marginTop: 4 }}>
                  {selected.label}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                style={{ fontSize: "12px", color: "rgba(255,255,255,0.25)", letterSpacing: "0.15em", fontFamily: "var(--font-sans)", background: "none", border: "none", cursor: "pointer" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.25)")}
              >
                ESC ×
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
