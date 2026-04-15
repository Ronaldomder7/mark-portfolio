"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";
import staticContent from "@/content/static.json";
import type { StaticContent } from "@/lib/types";
import {
  calculateCoverage,
  isRevealed,
  type Circle,
} from "@/lib/flashlightReveal";

const content = staticContent as StaticContent;

const RADIUS = 80;
const THRESHOLD = 0.4;
const MAX_POINTS = 800;

export default function Hero() {
  // --- Original typing animation for the 3 hook lines ---
  const [visibleChars, setVisibleChars] = useState(0);
  const fullText = content.hook.lines.join("\n");
  const totalChars = fullText.length;

  useEffect(() => {
    if (visibleChars >= totalChars) return;
    const timer = setTimeout(() => {
      setVisibleChars((prev) => prev + 1);
    }, 80);
    return () => clearTimeout(timer);
  }, [visibleChars, totalChars]);

  const revealedText = fullText.slice(0, visibleChars);
  const typingLines = revealedText.split("\n");
  const typingComplete = visibleChars >= totalChars;

  // --- Flashlight state ---
  const sectionRef = useRef<HTMLElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const visitedPointsRef = useRef<Circle[]>([]);
  const lastMaskUpdateRef = useRef(0);
  const [maskUrl, setMaskUrl] = useState<string>("");
  const [revealed, setRevealed] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const [hideFlash, setHideFlash] = useState(false);
  const [active, setActive] = useState(false);

  // Rebuild the mask canvas from all visited points; memoized so we can throttle it.
  const rebuildMask = useCallback(() => {
    const canvas = maskCanvasRef.current;
    const section = sectionRef.current;
    if (!canvas || !section) return;
    const rect = section.getBoundingClientRect();
    if (canvas.width !== rect.width || canvas.height !== rect.height) {
      canvas.width = rect.width;
      canvas.height = rect.height;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Start opaque black = small text fully visible
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Erase circles where flashlight has been — creates progressively
    // larger "chalk-erased" area as user scans
    ctx.globalCompositeOperation = "destination-out";
    for (const p of visitedPointsRef.current) {
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
      grad.addColorStop(0, "rgba(0,0,0,1)");
      grad.addColorStop(0.55, "rgba(0,0,0,1)");
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    setMaskUrl(canvas.toDataURL());
  }, []);

  function onPointerMove(e: React.PointerEvent) {
    if (revealed || hideFlash || !typingComplete) return;
    const rect = sectionRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Dedup: skip if very close to the previous point (reduces redundant draws)
    const prev = visitedPointsRef.current[visitedPointsRef.current.length - 1];
    if (prev) {
      const dx = prev.x - x;
      const dy = prev.y - y;
      if (dx * dx + dy * dy < 100) return; // <10px since last
    }

    const next: Circle = { x, y, r: RADIUS };
    visitedPointsRef.current.push(next);
    if (visitedPointsRef.current.length > MAX_POINTS) {
      visitedPointsRef.current.shift();
    }

    if (!active) setActive(true);

    // Throttle mask redraw to ~20fps (50ms)
    const now = performance.now();
    if (now - lastMaskUpdateRef.current > 50) {
      lastMaskUpdateRef.current = now;
      rebuildMask();

      // Check coverage after redraw — use same threshold logic
      const cov = calculateCoverage(
        visitedPointsRef.current,
        rect.width,
        rect.height
      );
      if (isRevealed(cov, THRESHOLD)) {
        setRevealed(true);
        setTimeout(() => setFadeOut(true), 3000);
        setTimeout(() => {
          setFadeOut(false);
          setHideFlash(true);
          setActive(false);
          window.dispatchEvent(new Event("avatar:resume"));
        }, 4500);
      }
    }
  }

  // Dispatch pause event as soon as user starts interacting
  useEffect(() => {
    if (active) window.dispatchEvent(new Event("avatar:pause"));
  }, [active]);

  function dismissFlashlight(e: React.MouseEvent) {
    e.preventDefault();
    if (hideFlash) return;
    setHideFlash(true);
    setActive(false);
    visitedPointsRef.current = [];
    setMaskUrl("");
    window.dispatchEvent(new Event("avatar:resume"));
  }

  return (
    <section
      ref={sectionRef}
      id="hero"
      onPointerMove={onPointerMove}
      onContextMenu={dismissFlashlight}
      className="relative min-h-screen flex flex-col justify-center items-center px-6 text-center overflow-hidden"
    >
      {/* Hidden mask canvas — never visible, only sourced for maskUrl */}
      <canvas ref={maskCanvasRef} className="hidden" aria-hidden="true" />

      {/* Back layer: BIG revealed text, positioned in the same vertical band
          as the small text so they visually align when scanned */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none transition-opacity"
        style={{
          opacity: revealed && !fadeOut ? 1 : active ? 1 : 0,
          transitionDuration: revealed && !fadeOut ? "600ms" : "300ms",
        }}
      >
        <p className="font-serif text-5xl md:text-7xl text-ink leading-tight">
          你想要
        </p>
        <p className="font-serif text-5xl md:text-7xl text-ink leading-tight mt-3">
          怎样活这一生？
        </p>
      </div>

      {/* Front layer: original 3 hook lines, progressively erased by flashlight
          via canvas-generated mask. Before user starts scanning, no mask = fully
          visible. Once revealed latch fires, whole layer fades. */}
      <div
        className="relative z-[1] space-y-3"
        style={{
          WebkitMaskImage: maskUrl ? `url(${maskUrl})` : undefined,
          maskImage: maskUrl ? `url(${maskUrl})` : undefined,
          WebkitMaskSize: "100% 100%",
          maskSize: "100% 100%",
          opacity: revealed && !fadeOut ? 0 : 1,
          transition: "opacity 1.2s",
        }}
      >
        {content.hook.lines.map((line, i) => (
          <p
            key={i}
            className="font-serif text-3xl md:text-5xl text-ink leading-relaxed tracking-wide"
          >
            {typingLines[i] || ""}
            {!typingComplete && i === typingLines.length - 1 && (
              <span className="animate-pulse text-accent">|</span>
            )}
          </p>
        ))}
      </div>

      <div
        className={`relative z-[1] mt-24 text-sm font-sans text-muted tracking-widest transition-opacity duration-1000 ${
          typingComplete && !active && !revealed ? "opacity-100" : "opacity-0"
        }`}
      >
        马泽闰 Mark · 2026
      </div>

      {/* Flashlight: centered below the text, with pulsing halo to invite drag */}
      {!hideFlash && typingComplete && (
        <motion.div
          drag
          dragMomentum={false}
          initial={{ opacity: 0, y: 20 }}
          animate={{
            opacity: fadeOut ? 0 : 1,
            y: 0,
          }}
          transition={{ duration: fadeOut ? 1.5 : 0.6, delay: 0.2 }}
          whileDrag={{ scale: 1.1 }}
          className="absolute bottom-32 left-1/2 -translate-x-1/2 cursor-grab active:cursor-grabbing select-none z-[3] flex flex-col items-center gap-2"
          aria-label="手电筒——拖动我扫过文字，右键收起"
        >
          {/* Pulsing halo hook */}
          {!active && (
            <>
              <span
                className="absolute inset-0 rounded-full pointer-events-none"
                style={{
                  background:
                    "radial-gradient(circle, rgba(255,220,150,0.4) 0%, transparent 70%)",
                  animation: "flashlightPulse 1.8s ease-in-out infinite",
                  width: 80,
                  height: 80,
                  top: -24,
                  left: -24,
                }}
              />
              <span
                className="absolute inset-0 rounded-full pointer-events-none border border-accent/50"
                style={{
                  animation: "flashlightRing 1.8s ease-out infinite",
                  width: 80,
                  height: 80,
                  top: -24,
                  left: -24,
                }}
              />
            </>
          )}
          <span className="text-4xl relative z-[1]">🔦</span>
          <span className="font-sans text-[10px] text-muted tracking-widest whitespace-nowrap pointer-events-none">
            拖动我 · 右键收起
          </span>
        </motion.div>
      )}
    </section>
  );
}
