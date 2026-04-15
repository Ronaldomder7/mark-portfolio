"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, useAnimation } from "framer-motion";
import staticContent from "@/content/static.json";
import type { StaticContent } from "@/lib/types";
import {
  calculateCoverage,
  isRevealed,
  type Circle,
} from "@/lib/flashlightReveal";

const content = staticContent as StaticContent;

const RADIUS = 100;
const THRESHOLD = 0.4;
const MAX_POINTS = 800;

export default function Hero() {
  // --- Typing animation ---
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
  const [flashPos, setFlashPos] = useState<{ x: number; y: number } | null>(
    null
  );
  const [revealed, setRevealed] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  // Reset counter — bumps when user right-clicks to reset flashlight position
  const [resetKey, setResetKey] = useState(0);

  // Framer-motion controls so we can animate flashlight back to origin on reset
  const flashControls = useAnimation();

  // Rebuild the mask canvas: transparent by default, opaque where flashlight
  // has been. Applied to big text layer → big text only shows where scanned.
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
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of visitedPointsRef.current) {
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
      grad.addColorStop(0, "rgba(0,0,0,1)");
      grad.addColorStop(0.6, "rgba(0,0,0,1)");
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    setMaskUrl(canvas.toDataURL());
  }, []);

  // Called by framer-motion during drag with pointer info
  function onDrag(_e: unknown, info: { point: { x: number; y: number } }) {
    if (revealed || !sectionRef.current || !typingComplete) return;
    const rect = sectionRef.current.getBoundingClientRect();
    const x = info.point.x - rect.left;
    const y = info.point.y - rect.top;
    setFlashPos({ x, y });

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
        setDragging(false);
        setFlashPos(null);
        window.dispatchEvent(new Event("avatar:resume"));
        // After 4s of full reveal, fade big text back to default state
        setTimeout(() => setFadeOut(true), 4000);
        setTimeout(() => {
          // Reset visually (small text back, big text gone, flashlight back)
          resetAll();
        }, 6500);
      }
    }
  }

  function onDragStart() {
    if (revealed) return;
    setDragging(true);
    window.dispatchEvent(new Event("avatar:pause"));
  }

  function onDragEnd() {
    setDragging(false);
    setFlashPos(null);
    if (!revealed) {
      window.dispatchEvent(new Event("avatar:resume"));
    }
  }

  function resetAll() {
    setRevealed(false);
    setFadeOut(false);
    setDragging(false);
    setFlashPos(null);
    visitedPointsRef.current = [];
    setMaskUrl("");
    // Animate flashlight back to origin and bump key so framer resets drag offset
    flashControls.start({ x: 0, y: 0, transition: { duration: 0.5 } });
    setResetKey((k) => k + 1);
    window.dispatchEvent(new Event("avatar:resume"));
  }

  function onContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    resetAll();
  }

  // Safety: always resume avatar on unmount
  useEffect(() => {
    return () => {
      window.dispatchEvent(new Event("avatar:resume"));
    };
  }, []);

  // Dark vignette radial-gradient for current flashlight position
  const vignetteStyle =
    dragging && flashPos
      ? {
          background: `radial-gradient(circle ${RADIUS * 1.4}px at ${flashPos.x}px ${flashPos.y}px, transparent 0%, transparent 45%, rgba(20,20,25,0.92) 100%)`,
          opacity: 1,
        }
      : {
          background:
            "radial-gradient(circle 100px at 50% 50%, transparent 0%, rgba(20,20,25,0.92) 100%)",
          opacity: 0,
        };

  return (
    <section
      ref={sectionRef}
      id="hero"
      onContextMenu={onContextMenu}
      className="relative min-h-screen flex flex-col justify-center items-center px-6 text-center overflow-hidden"
    >
      {/* Offscreen mask canvas */}
      <canvas ref={maskCanvasRef} className="hidden" aria-hidden="true" />

      {/* Small text — visible by default, hides when revealed */}
      <div
        className="relative z-[1] space-y-3"
        style={{
          opacity: revealed && !fadeOut ? 0 : 1,
          transition: "opacity 0.8s",
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

      {/* Big text — only visible where scanned (via mask) or on full reveal */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-[3]"
        style={{
          WebkitMaskImage:
            revealed && !fadeOut ? "none" : maskUrl ? `url(${maskUrl})` : "none",
          maskImage:
            revealed && !fadeOut ? "none" : maskUrl ? `url(${maskUrl})` : "none",
          WebkitMaskSize: "100% 100%",
          maskSize: "100% 100%",
          opacity:
            revealed && !fadeOut ? 1 : dragging && maskUrl ? 1 : 0,
          transition:
            revealed && !fadeOut ? "opacity 0.8s" : "opacity 0.3s",
        }}
      >
        <p className="font-serif text-5xl md:text-7xl text-ink leading-tight">
          你想要
        </p>
        <p className="font-serif text-5xl md:text-7xl text-ink leading-tight mt-3">
          怎样活这一生?
        </p>
      </div>

      {/* Dark vignette — covers Hero with a circular hole at flashlight position */}
      <div
        className="absolute inset-0 pointer-events-none z-[2] transition-opacity duration-500"
        style={vignetteStyle}
      />

      {/* Signature */}
      <div
        className={`relative z-[1] mt-24 text-sm font-sans text-muted tracking-widest transition-opacity duration-1000 ${
          typingComplete && !dragging && !revealed ? "opacity-100" : "opacity-0"
        }`}
      >
        马泽闰 Mark · 2026
      </div>

      {/* Draggable flashlight */}
      {typingComplete && (
        <motion.div
          key={resetKey}
          drag
          dragMomentum={false}
          animate={flashControls}
          onDrag={onDrag}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          initial={{ opacity: 0, y: 20 }}
          whileDrag={{ scale: 1.15 }}
          className="absolute bottom-32 left-1/2 -translate-x-1/2 cursor-grab active:cursor-grabbing select-none z-[4] flex flex-col items-center gap-2"
          style={{ opacity: 1 }}
          aria-label="手电筒——拖动我扫过文字，右键复位"
        >
          {!dragging && !revealed && (
            <>
              <span
                className="absolute pointer-events-none rounded-full"
                style={{
                  background:
                    "radial-gradient(circle, rgba(255,220,150,0.55) 0%, transparent 70%)",
                  animation: "flashlightPulse 1.8s ease-in-out infinite",
                  width: 90,
                  height: 90,
                  top: -28,
                  left: -28,
                }}
              />
              <span
                className="absolute pointer-events-none rounded-full border border-accent/50"
                style={{
                  animation: "flashlightRing 1.8s ease-out infinite",
                  width: 90,
                  height: 90,
                  top: -28,
                  left: -28,
                }}
              />
            </>
          )}
          <span className="text-4xl relative z-[1]">🔦</span>
          <span className="font-sans text-[10px] text-muted tracking-widest whitespace-nowrap pointer-events-none">
            拖动我 · 右键复位
          </span>
        </motion.div>
      )}
    </section>
  );
}
