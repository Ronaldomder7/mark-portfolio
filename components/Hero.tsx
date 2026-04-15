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

const RADIUS = 60;
const THRESHOLD = 0.4;
const MAX_POINTS = 800;
const NIGHT_COLOR = "#0a0a0a";

export default function Hero() {
  // --- Typing ---
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

  // --- Flashlight ---
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
  // One-way latch: once user has seen the full reveal, the flashlight
  // becomes dormant (no more halo, no more scan tracking).
  const [completed, setCompleted] = useState(false);

  const flashControls = useAnimation();

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
      grad.addColorStop(0.65, "rgba(0,0,0,1)");
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    setMaskUrl(canvas.toDataURL());
  }, []);

  function onDrag(_e: unknown, info: { point: { x: number; y: number } }) {
    if (revealed || completed || !sectionRef.current || !typingComplete) return;
    const rect = sectionRef.current.getBoundingClientRect();
    const x = info.point.x - rect.left;
    const y = info.point.y - rect.top;
    setFlashPos({ x, y });

    const prev = visitedPointsRef.current[visitedPointsRef.current.length - 1];
    if (prev) {
      const dx = prev.x - x;
      const dy = prev.y - y;
      if (dx * dx + dy * dy < 64) return;
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
        void endReveal();
      }
    }
  }

  // After the big text has been on screen long enough, play the "drop"
  // sequence: flashlight falls, returns to origin, halo extinguishes.
  async function endReveal() {
    // Let the big text sit on dark background ~3.5s
    await new Promise((r) => setTimeout(r, 3500));

    // Fade out big text + restore small text
    setFadeOut(true);
    await new Promise((r) => setTimeout(r, 900));

    // Drop: flashlight pitches forward and down like gravity took over
    await flashControls.start({
      y: 180,
      rotate: 28,
      opacity: 0.55,
      transition: { duration: 0.55, ease: [0.4, 0, 0.6, 1] },
    });
    await new Promise((r) => setTimeout(r, 200));

    // Slide/pop back to origin
    await flashControls.start({
      x: 0,
      y: 0,
      rotate: 0,
      opacity: 1,
      transition: { duration: 0.45, ease: "easeOut" },
    });

    // Final state: flashlight is present but dormant (no halo, no scan)
    setRevealed(false);
    setFadeOut(false);
    setDragging(false);
    setFlashPos(null);
    visitedPointsRef.current = [];
    setMaskUrl("");
    setCompleted(true);
    window.dispatchEvent(new Event("avatar:resume"));
  }

  function onDragStart() {
    if (revealed || completed) return;
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
    flashControls.start({
      x: 0,
      y: 0,
      transition: { duration: 0.5 },
    });
    window.dispatchEvent(new Event("avatar:resume"));
  }

  function onContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    resetAll();
  }

  useEffect(() => {
    return () => {
      window.dispatchEvent(new Event("avatar:resume"));
    };
  }, []);

  const nightActive = dragging || (revealed && !fadeOut);

  return (
    <section
      ref={sectionRef}
      id="hero"
      onContextMenu={onContextMenu}
      className="relative min-h-screen flex flex-col justify-center items-center px-6 text-center overflow-hidden"
    >
      <canvas ref={maskCanvasRef} className="hidden" aria-hidden="true" />

      {/* Small text */}
      <div
        className="relative z-[1] space-y-3 transition-opacity"
        style={{
          opacity: nightActive ? 0 : 1,
          transitionDuration: nightActive ? "300ms" : "800ms",
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

      {/* Night overlay */}
      <div
        className="absolute inset-0 pointer-events-none z-[2] transition-opacity duration-500"
        style={{
          background: NIGHT_COLOR,
          opacity: nightActive ? 1 : 0,
        }}
      />

      {/* Flashlight beam */}
      {dragging && flashPos && (
        <div
          className="absolute inset-0 pointer-events-none z-[3]"
          style={{
            background: `radial-gradient(circle ${RADIUS * 1.3}px at ${flashPos.x}px ${flashPos.y}px, rgba(255,230,180,0.22) 0%, rgba(255,230,180,0.08) 45%, transparent 75%)`,
          }}
        />
      )}

      {/* Big white text, masked */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-[4]"
        style={{
          WebkitMaskImage:
            revealed && !fadeOut ? "none" : maskUrl ? `url(${maskUrl})` : "none",
          maskImage:
            revealed && !fadeOut ? "none" : maskUrl ? `url(${maskUrl})` : "none",
          WebkitMaskSize: "100% 100%",
          maskSize: "100% 100%",
          opacity:
            revealed && !fadeOut
              ? 1
              : nightActive && maskUrl
              ? 1
              : 0,
          transition: fadeOut ? "opacity 1s" : "opacity 0.3s",
        }}
      >
        <p
          className="font-serif text-5xl md:text-7xl leading-tight"
          style={{ color: "#fafaf8" }}
        >
          你想要
        </p>
        <p
          className="font-serif text-5xl md:text-7xl leading-tight mt-3"
          style={{ color: "#fafaf8" }}
        >
          怎样活这一生?
        </p>
      </div>

      {/* Signature */}
      <div
        className={`relative z-[1] mt-24 text-sm font-sans text-muted tracking-widest transition-opacity duration-1000 ${
          typingComplete && !nightActive ? "opacity-100" : "opacity-0"
        }`}
      >
        马泽闰 Mark · 2026
      </div>

      {/* Flashlight — wrapped in a flex container so horizontal centering
          is handled by CSS (not transform), leaving framer-motion's x/y
          free to animate drag + reset without conflict. */}
      {typingComplete && (
        <div className="absolute bottom-40 left-0 right-0 flex justify-center pointer-events-none z-[80]">
        <motion.div
          drag={!completed && !revealed}
          dragMomentum={false}
          animate={flashControls}
          onDrag={onDrag}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          whileDrag={{ scale: 1.15 }}
          className="pointer-events-auto cursor-grab active:cursor-grabbing select-none flex flex-col items-center gap-2"
          style={{ opacity: 1 }}
          aria-label="手电筒——拖动我扫过文字，右键复位"
        >
          {!dragging && !revealed && !completed && (
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
          <span
            className="text-4xl relative z-[1] transition-all duration-500"
            style={{
              filter: completed ? "grayscale(0.6) brightness(0.85)" : "none",
            }}
          >
            🔦
          </span>
          {!completed && (
            <span
              className="font-sans text-[10px] tracking-widest whitespace-nowrap pointer-events-none"
              style={{ color: nightActive ? "#ccc" : "#888" }}
            >
              拖动我 · 右键复位
            </span>
          )}
        </motion.div>
        </div>
      )}
    </section>
  );
}
