"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import cities from "@/content/cities.json";

interface City {
  name: string;
  lat: number;
  lng: number;
  label: string;
  photoFolder: string;
}

function toPercent(lat: number, lng: number) {
  // China approx bounds for the cities we have
  const minLng = 100;
  const maxLng = 125;
  const minLat = 20;
  const maxLat = 42;
  const x = ((lng - minLng) / (maxLng - minLng)) * 100;
  const y = ((maxLat - lat) / (maxLat - minLat)) * 100;
  return { x, y };
}

// Simplified China border SVG path (approximate outline)
const CHINA_PATH = `M 28 8 L 32 5 L 38 3 L 44 2 L 50 4 L 55 3 L 60 5 L 65 4 L 70 6 L 72 10 L 75 12 L 78 10 L 82 12 L 85 15 L 88 14 L 92 16 L 95 20 L 93 24 L 96 28 L 94 32 L 90 35 L 92 38 L 88 42 L 85 45 L 88 48 L 90 52 L 88 56 L 84 58 L 80 62 L 76 65 L 78 68 L 82 72 L 80 76 L 76 78 L 72 82 L 68 85 L 64 82 L 60 84 L 56 88 L 52 90 L 48 88 L 44 90 L 40 92 L 36 90 L 32 88 L 28 85 L 24 82 L 20 78 L 16 74 L 12 70 L 10 66 L 8 62 L 6 58 L 5 54 L 4 50 L 3 46 L 5 42 L 8 38 L 10 34 L 8 30 L 10 26 L 12 22 L 15 18 L 18 14 L 22 10 L 28 8 Z`;

export default function ChinaMap() {
  const [selected, setSelected] = useState<City | null>(null);
  const [hoveredCity, setHoveredCity] = useState<string | null>(null);
  const sectionRef = useRef<HTMLElement>(null);

  // Close modal on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setSelected(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <section id="map" ref={sectionRef} className="py-32 px-6">
        <div className="max-w-prose mx-auto">
          <h2 className="font-sans text-xs text-muted tracking-widest uppercase mb-4 text-center">
            我走过的地方
          </h2>
          <p className="font-serif text-sm text-muted text-center mb-12">
            20 个城市，10 个省份
          </p>

          {/* Map container */}
          <div className="relative w-full" style={{ aspectRatio: "5 / 4" }}>
            {/* Faint China outline */}
            <svg
              viewBox="0 0 100 100"
              className="absolute inset-0 w-full h-full"
              preserveAspectRatio="none"
            >
              <path
                d={CHINA_PATH}
                fill="none"
                stroke="var(--color-line)"
                strokeWidth="0.5"
                opacity="0.6"
              />
            </svg>

            {/* City dots */}
            {(cities as City[]).map((city) => {
              const { x, y } = toPercent(city.lat, city.lng);
              const isBeijing = city.name === "北京";
              const isHovered = hoveredCity === city.name;

              return (
                <button
                  key={city.name}
                  type="button"
                  className="absolute -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
                  style={{ left: `${x}%`, top: `${y}%` }}
                  onClick={() => setSelected(city)}
                  onMouseEnter={() => setHoveredCity(city.name)}
                  onMouseLeave={() => setHoveredCity(null)}
                  aria-label={`${city.name} - ${city.label}`}
                >
                  {/* Glow ring */}
                  <span
                    className={`block rounded-full ${
                      isBeijing ? "w-3.5 h-3.5" : "w-2.5 h-2.5"
                    } bg-accent city-dot`}
                    style={
                      isBeijing
                        ? {
                            boxShadow:
                              "0 0 8px 4px rgba(139, 46, 46, 0.5)",
                          }
                        : undefined
                    }
                  />

                  {/* Tooltip */}
                  <span
                    className={`absolute left-1/2 -translate-x-1/2 -top-7 whitespace-nowrap font-sans text-xs text-ink bg-bg/90 border border-line rounded-sm px-2 py-0.5 pointer-events-none transition-opacity duration-200 ${
                      isHovered ? "opacity-100" : "opacity-0"
                    }`}
                  >
                    {city.name}
                  </span>
                </button>
              );
            })}
          </div>

          <p className="font-sans text-xs text-muted text-center mt-6">
            点击城市查看照片
          </p>
        </div>
      </section>

      {/* Modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 backdrop-blur-sm px-6"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-bg border border-line rounded-sm max-w-md w-full p-10 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-serif text-lg text-ink mb-1">{selected.name}</p>
            <p className="font-sans text-xs text-muted mb-6 tracking-wide">
              {selected.label}
            </p>

            <div className="flex justify-center mb-6">
              <Image
                src={`/cities/${selected.name}.jpg`}
                alt={`${selected.name} - ${selected.label}`}
                width={400}
                height={300}
                className="rounded-sm object-cover"
                style={{ maxHeight: "300px" }}
              />
            </div>

            <button
              type="button"
              onClick={() => setSelected(null)}
              className="mt-4 font-sans text-xs text-muted hover:text-ink transition-colors tracking-widest"
            >
              关闭
            </button>
          </div>
        </div>
      )}
    </>
  );
}
