"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import cities from "@/content/cities.json";

interface City {
  name: string;
  lat: number;
  lng: number;
  label: string;
  photoFolder: string;
}

// Mercator projection for China region
function toPercent(lat: number, lng: number) {
  const minLng = 97;
  const maxLng = 127;
  const minLat = 18;
  const maxLat = 45;
  const x = ((lng - minLng) / (maxLng - minLng)) * 100;
  const y = ((maxLat - lat) / (maxLat - minLat)) * 100;
  return { x: Math.max(2, Math.min(98, x)), y: Math.max(2, Math.min(98, y)) };
}

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

  // Group nearby cities for connection lines
  const connections = [
    ["宝鸡", "西安"],
    ["西安", "华山"],
    ["西安", "汉中"],
    ["晋城", "运城"],
    ["漳州", "厦门"],
    ["惠州", "深圳"],
    ["惠州", "清远"],
    ["惠州", "河源"],
    ["北京", "秦皇岛"],
  ];

  function getCityPos(name: string) {
    const c = typedCities.find((c) => c.name === name);
    if (!c) return null;
    return toPercent(c.lat, c.lng);
  }

  return (
    <>
      <section id="map" className="py-32 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-sans text-xs text-muted tracking-widest uppercase mb-4 text-center">
            我走过的地方
          </h2>
          <p className="font-serif text-sm text-muted text-center mb-4">
            20 个城市，10 个省份
          </p>
          <p className="font-sans text-xs text-muted/50 text-center mb-16">
            点击光点查看照片
          </p>

          {/* Map container — dark card with subtle gradient */}
          <div
            className="relative w-full rounded-lg overflow-hidden"
            style={{
              aspectRatio: "4 / 3",
              background:
                "radial-gradient(ellipse at 60% 40%, #1a1a2e 0%, #0f0f1a 50%, #0a0a12 100%)",
            }}
          >
            {/* Subtle grid lines */}
            <svg
              className="absolute inset-0 w-full h-full opacity-[0.06]"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              {Array.from({ length: 10 }, (_, i) => (
                <line
                  key={`h${i}`}
                  x1="0"
                  y1={i * 10}
                  x2="100"
                  y2={i * 10}
                  stroke="white"
                  strokeWidth="0.2"
                />
              ))}
              {Array.from({ length: 10 }, (_, i) => (
                <line
                  key={`v${i}`}
                  x1={i * 10}
                  y1="0"
                  x2={i * 10}
                  y2="100"
                  stroke="white"
                  strokeWidth="0.2"
                />
              ))}
            </svg>

            {/* Connection lines between nearby cities */}
            <svg
              className="absolute inset-0 w-full h-full"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              {connections.map(([from, to], i) => {
                const a = getCityPos(from);
                const b = getCityPos(to);
                if (!a || !b) return null;
                return (
                  <line
                    key={i}
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke="rgba(139, 46, 46, 0.15)"
                    strokeWidth="0.3"
                    strokeDasharray="1 1"
                  />
                );
              })}
            </svg>

            {/* City dots */}
            {mounted &&
              typedCities.map((city, idx) => {
                const { x, y } = toPercent(city.lat, city.lng);
                const isBeijing = city.name === "北京";
                const isHovered = hoveredCity === city.name;
                const dotSize = isBeijing ? 14 : 10;

                return (
                  <button
                    key={city.name}
                    type="button"
                    className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
                    style={{
                      left: `${x}%`,
                      top: `${y}%`,
                      zIndex: isHovered ? 20 : 10,
                      animationDelay: `${idx * 150}ms`,
                    }}
                    onClick={() => setSelected(city)}
                    onMouseEnter={() => setHoveredCity(city.name)}
                    onMouseLeave={() => setHoveredCity(null)}
                    aria-label={`${city.name} - ${city.label}`}
                  >
                    {/* Outer glow ring */}
                    <span
                      className="absolute inset-0 rounded-full city-dot"
                      style={{
                        width: dotSize * 2.5,
                        height: dotSize * 2.5,
                        top: -(dotSize * 0.75),
                        left: -(dotSize * 0.75),
                        background: "transparent",
                      }}
                    />

                    {/* Core dot */}
                    <span
                      className="block rounded-full transition-transform duration-300"
                      style={{
                        width: dotSize,
                        height: dotSize,
                        background: isBeijing
                          ? "radial-gradient(circle, #ff6b6b, #8B2E2E)"
                          : "radial-gradient(circle, #d4726a, #8B2E2E)",
                        boxShadow: isBeijing
                          ? "0 0 12px 6px rgba(255, 107, 107, 0.4), 0 0 24px 12px rgba(139, 46, 46, 0.2)"
                          : isHovered
                            ? "0 0 10px 5px rgba(212, 114, 106, 0.5), 0 0 20px 10px rgba(139, 46, 46, 0.2)"
                            : "0 0 6px 3px rgba(139, 46, 46, 0.4)",
                        transform: isHovered ? "scale(1.5)" : "scale(1)",
                      }}
                    />

                    {/* City name label */}
                    <span
                      className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap transition-all duration-300 pointer-events-none"
                      style={{
                        top: isHovered ? -28 : -24,
                        opacity: isHovered || isBeijing ? 1 : 0,
                        fontSize: "11px",
                        fontFamily: "var(--font-sans)",
                        color: isBeijing
                          ? "rgba(255, 200, 200, 0.9)"
                          : "rgba(255, 255, 255, 0.85)",
                        textShadow: "0 1px 4px rgba(0,0,0,0.8)",
                        letterSpacing: "0.1em",
                      }}
                    >
                      {city.name}
                      {isBeijing && (
                        <span
                          style={{
                            fontSize: "9px",
                            opacity: 0.6,
                            marginLeft: 4,
                          }}
                        >
                          ← 在这里
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}

            {/* Bottom gradient fade */}
            <div
              className="absolute bottom-0 left-0 right-0 h-16"
              style={{
                background:
                  "linear-gradient(to top, #0a0a12, transparent)",
              }}
            />

            {/* Stats overlay bottom-right */}
            <div className="absolute bottom-4 right-4 text-right">
              <p
                style={{
                  fontSize: "28px",
                  fontWeight: 700,
                  color: "rgba(255, 255, 255, 0.08)",
                  fontFamily: "var(--font-serif)",
                  lineHeight: 1,
                }}
              >
                20
              </p>
              <p
                style={{
                  fontSize: "10px",
                  color: "rgba(255, 255, 255, 0.15)",
                  fontFamily: "var(--font-sans)",
                  letterSpacing: "0.15em",
                }}
              >
                CITIES
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Photo Modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-6"
          style={{ background: "rgba(10, 10, 18, 0.85)", backdropFilter: "blur(8px)" }}
          onClick={() => setSelected(null)}
        >
          <div
            className="relative max-w-lg w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Photo */}
            <div className="rounded-lg overflow-hidden">
              <Image
                src={`/cities/${selected.name}.jpg`}
                alt={`${selected.name} - ${selected.label}`}
                width={800}
                height={600}
                className="w-full h-auto object-cover"
                style={{ maxHeight: "60vh" }}
              />
            </div>

            {/* Info bar below photo */}
            <div className="mt-4 flex items-center justify-between">
              <div>
                <p
                  className="font-serif text-ink"
                  style={{ fontSize: "18px", color: "rgba(255,255,255,0.9)" }}
                >
                  {selected.name}
                </p>
                <p
                  className="font-sans"
                  style={{
                    fontSize: "12px",
                    color: "rgba(255,255,255,0.4)",
                    letterSpacing: "0.1em",
                    marginTop: 2,
                  }}
                >
                  {selected.label}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="font-sans transition-colors"
                style={{
                  fontSize: "12px",
                  color: "rgba(255,255,255,0.3)",
                  letterSpacing: "0.15em",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.color = "rgba(255,255,255,0.8)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = "rgba(255,255,255,0.3)")
                }
              >
                关闭 ×
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
