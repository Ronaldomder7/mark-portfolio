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
  // --- Typing animation for 3 hook lines ---
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

  const typingLines = fullText.slice(0, visibleChars).split("\n");
  const typingComplete = visibleChars >= totalChars;

  // --- Flashlight state ---
  const sectionRef = useRef<HTMLElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const visitedPointsRef = useRef<Circle[]>([]);
  const lastMaskUpdateRef = useRef(0);
  const [maskUrl, setMaskUrl] = useState<string>("");
  const [dragging, setDragging] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const [hideFlash, setHideFlash] = useState(false);

  // Rebuild the mask canvas. It's applied to the BIG text layer:
  //   opaque = big text visible, transparent = big text hidden.
  // So: start transparent, draw opaque circles where flashlight has been.
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
    // Start fully transparent (big text hidden everywhere)
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Paint opaque circles where flashlight has been (big text shows there)
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

  // Only record scan points when the flashlight is actively being dragged.
  function onPointerMove(e: React.PointerEvent) {
    if (!dragging || revealed || hideFlash || !typingComplete) return;

    const rect = sectionRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Dedup close-together points
    const prev = visitedPointsRef.current[visitedPointsRef.current.length - 1];
    if (prev) {
      const dx = prev.x - x;
      const dy = prev.y - y;
      if (dx * dx + dy * dy < 100) return;
    }

    visitedPointsRef.current.push({ x, y, r: RADIUS });
    if (visitedPointsRef.current.length > MAX_POINTS) {
      visitedPointsRef.current.shift();
    }

    // Throttle mask redraw ~20fps
    const now = performance.now();
    if (now - lastMaskUpdateRef.current > 50) {
      lastMaskUpdateRef.current = now;
      rebuildMask();

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
          setDragging(false);
          window.dispatchEvent(new Event("avatar:resume"));
        }, 4500);
      }
    }
  }

  function onDragStart() {
    if (hideFlash || revealed) return;
    setDragging(true);
    window.dispatchEvent(new Event("avatar:pause"));
  }

  function onDragEnd() {
    setDragging(false);
    if (!revealed) {
      window.dispatchEvent(new Event("avatar:resume"));
    }
  }

  function dismissFlashlight(e: React.MouseEvent) {
    e.preventDefault();
    if (hideFlash) return;
    setHideFlash(true);
    setDragging(false);
    visitedPointsRef.current = [];
    setMaskUrl("");
    window.dispatchEvent(new Event("avatar:resume"));
  }

  // Safety net: always resume avatar on unmount so other pages aren't left frozen
  useEffect(() => {
    return () => {
      window.dispatchEvent(new Event("avatar:resume"));
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      id="hero"
      onPointerMove={onPointerMove}
      onContextMenu={dismissFlashlight}
      className="relative min-h-screen flex flex-col justify-center items-center px-6 text-center overflow-hidden"
    >
      {/* Offscreen canvas — only its dataURL is used as mask */}
      <canvas ref={maskCanvasRef} className="hidden" aria-hidden="true" />

      {/* Small text (always fully visible, in normal flow) */}
      <div className="relative z-[1] space-y-3">
        {content.hook.lines.map((line, i) => (
          <p
            key={i}
            className="font-serif text-3xl md:text-5xl text-ink leading-relaxed tracking-wide"
            style={{
              opacity: revealed && !fadeOut ? 0 : 1,
              transition: "opacity 1.2s",
            }}
          >
            {typingLines[i] || ""}
            {!typingComplete && i === typingLines.length - 1 && (
              <span className="animate-pulse text-accent">|</span>
            )}
          </p>
        ))}
      </div>

      {/* Big revealed text — only visible where mask is opaque (scanned areas
          or during reveal latch) */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-[2]"
        style={{
          WebkitMaskImage:
            revealed && !fadeOut ? "none" : maskUrl ? `url(${maskUrl})` : "none",
          maskImage:
            revealed && !fadeOut ? "none" : maskUrl ? `url(${maskUrl})` : "none",
          WebkitMaskSize: "100% 100%",
          maskSize: "100% 100%",
          opacity: revealed && !fadeOut ? 1 : maskUrl ? 1 : 0,
          transition:
            revealed && !fadeOut ? "opacity 0.6s" : "opacity 0.3s",
        }}
      >
        <p className="font-serif text-5xl md:text-7xl text-ink leading-tight">
          你想要
        </p>
        <p className="font-serif text-5xl md:text-7xl text-ink leading-tight mt-3">
          怎样活这一生?
        </p>
      </div>

      {/* Signature */}
      <div
        className={`relative z-[1] mt-24 text-sm font-sans text-muted tracking-widest transition-opacity duration-1000 ${
          typingComplete && !dragging && !revealed ? "opacity-100" : "opacity-0"
        }`}
      >
        马泽闰 Mark · 2026
      </div>

      {/* Flashlight — bottom-center with pulsing halo hook */}
      {!hideFlash && typingComplete && (
        <motion.div
          drag
          dragMomentum={false}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
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
          {!dragging && (
            <>
              <span
                className="absolute pointer-events-none rounded-full"
                style={{
                  background:
                    "radial-gradient(circle, rgba(255,220,150,0.5) 0%, transparent 70%)",
                  animation: "flashlightPulse 1.8s ease-in-out infinite",
                  width: 80,
                  height: 80,
                  top: -24,
                  left: -24,
                }}
              />
              <span
                className="absolute pointer-events-none rounded-full border border-accent/50"
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
