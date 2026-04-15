"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import staticContent from "@/content/static.json";
import type { StaticContent } from "@/lib/types";
import {
  calculateCoverage,
  isRevealed,
  type Circle,
} from "@/lib/flashlightReveal";

const content = staticContent as StaticContent;

const RADIUS = 70;
const THRESHOLD = 0.5;
const MAX_POINTS = 500;

export default function Hero() {
  // Original typing animation for the 3 hook lines
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

  // Flashlight state
  const sectionRef = useRef<HTMLElement>(null);
  const [flashPos, setFlashPos] = useState<{ x: number; y: number } | null>(
    null
  );
  const [visitedPoints, setVisitedPoints] = useState<Circle[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const [hideFlash, setHideFlash] = useState(false);

  // Track visited points as user moves flashlight
  useEffect(() => {
    if (revealed || !flashPos) return;
    setVisitedPoints((prev) => {
      const next = [...prev, { x: flashPos.x, y: flashPos.y, r: RADIUS }];
      return next.length > MAX_POINTS ? next.slice(-MAX_POINTS) : next;
    });
  }, [flashPos, revealed]);

  // Check coverage and trigger reveal
  useEffect(() => {
    if (revealed || !sectionRef.current) return;
    const rect = sectionRef.current.getBoundingClientRect();
    const cov = calculateCoverage(visitedPoints, rect.width, rect.height);
    if (isRevealed(cov, THRESHOLD)) {
      setRevealed(true);
      setTimeout(() => setFadeOut(true), 3000);
      setTimeout(() => {
        setFadeOut(false);
        setHideFlash(true);
      }, 4500);
    }
  }, [visitedPoints, revealed]);

  function onPointerMove(e: React.PointerEvent) {
    if (revealed || hideFlash || !typingComplete) return;
    const rect = sectionRef.current!.getBoundingClientRect();
    setFlashPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }

  // Mask: when flashlight is active, cut a transparent hole into original lines
  const maskStyle =
    flashPos && !revealed
      ? {
          WebkitMaskImage: `radial-gradient(circle ${RADIUS}px at ${flashPos.x}px ${flashPos.y}px, transparent 60%, black 100%)`,
          maskImage: `radial-gradient(circle ${RADIUS}px at ${flashPos.x}px ${flashPos.y}px, transparent 60%, black 100%)`,
        }
      : {};

  return (
    <section
      ref={sectionRef}
      id="hero"
      onPointerMove={onPointerMove}
      className="relative min-h-screen flex flex-col justify-center items-center px-6 text-center overflow-hidden"
    >
      {/* Hidden revealed-text layer (shown when flashlight covers enough) */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none transition-opacity"
        style={{
          opacity: revealed && !fadeOut ? 1 : 0,
          transitionDuration: revealed && !fadeOut ? "600ms" : "1500ms",
        }}
      >
        <p className="font-serif text-6xl md:text-8xl text-ink leading-tight">
          你想要
        </p>
        <p className="font-serif text-6xl md:text-8xl text-ink leading-tight mt-4">
          怎样活这一生？
        </p>
      </div>

      {/* Original 3 hook lines (masked by flashlight while flashlight present) */}
      <div
        className="relative z-[1] space-y-3 transition-opacity duration-1000"
        style={{
          ...maskStyle,
          opacity: revealed && !fadeOut ? 0 : 1,
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
          typingComplete && !revealed ? "opacity-100" : "opacity-0"
        }`}
      >
        马泽闰 Mark · 2026
      </div>

      {/* Draggable flashlight emoji */}
      {!hideFlash && typingComplete && (
        <motion.div
          drag
          dragMomentum={false}
          initial={{ opacity: 0 }}
          animate={{ opacity: fadeOut ? 0 : 1 }}
          transition={{ duration: fadeOut ? 1.5 : 0.8 }}
          className="absolute top-8 right-8 text-3xl cursor-grab active:cursor-grabbing select-none z-[2]"
          aria-label="手电筒——拖动我扫过文字"
        >
          🔦
        </motion.div>
      )}
    </section>
  );
}
