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
const THRESHOLD = 0.45;
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
  const [coverage, setCoverage] = useState(0); // 0..1, drives progressive reveal
  const [revealed, setRevealed] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const [hideFlash, setHideFlash] = useState(false);
  const [active, setActive] = useState(false); // user is interacting with flashlight

  // Track visited points + recompute coverage on each move
  useEffect(() => {
    if (revealed || !flashPos || !sectionRef.current) return;

    const next = [
      ...visitedPoints,
      { x: flashPos.x, y: flashPos.y, r: RADIUS },
    ];
    const trimmed = next.length > MAX_POINTS ? next.slice(-MAX_POINTS) : next;
    setVisitedPoints(trimmed);

    const rect = sectionRef.current.getBoundingClientRect();
    const cov = calculateCoverage(trimmed, rect.width, rect.height);
    setCoverage(cov);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flashPos, revealed]);

  // Pause avatar when user starts interacting with flashlight
  useEffect(() => {
    if (active) {
      window.dispatchEvent(new Event("avatar:pause"));
    }
  }, [active]);

  function onPointerMove(e: React.PointerEvent) {
    if (revealed || hideFlash || !typingComplete) return;
    const rect = sectionRef.current!.getBoundingClientRect();
    setFlashPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    if (!active) setActive(true);
  }

  function dismissFlashlight(e: React.MouseEvent) {
    e.preventDefault();
    if (hideFlash) return;
    setHideFlash(true);
    setActive(false);
    setFlashPos(null);
    setVisitedPoints([]);
    setCoverage(0);
    window.dispatchEvent(new Event("avatar:resume"));
  }

  // Progressive opacity (only during scanning; revealed phase overrides)
  const bigOpacity = revealed
    ? fadeOut
      ? 0
      : 1
    : Math.min(1, coverage * 1.6); // amplify so reveal feels responsive
  const linesOpacity = revealed
    ? fadeOut
      ? 1
      : 0
    : Math.max(0.15, 1 - coverage * 1.2);

  // Mask cuts holes in the original lines where flashlight is
  const maskStyle =
    flashPos && !revealed
      ? {
          WebkitMaskImage: `radial-gradient(circle ${RADIUS}px at ${flashPos.x}px ${flashPos.y}px, transparent 55%, black 100%)`,
          maskImage: `radial-gradient(circle ${RADIUS}px at ${flashPos.x}px ${flashPos.y}px, transparent 55%, black 100%)`,
        }
      : {};

  return (
    <section
      ref={sectionRef}
      id="hero"
      onPointerMove={onPointerMove}
      onContextMenu={dismissFlashlight}
      className="relative min-h-screen flex flex-col justify-center items-center px-6 text-center overflow-hidden"
    >
      {/* Big revealed text — opacity follows coverage */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
        style={{
          opacity: bigOpacity,
          transition: revealed ? "opacity 0.6s" : "opacity 0.15s linear",
        }}
      >
        <p className="font-serif text-6xl md:text-8xl text-ink leading-tight">
          你想要
        </p>
        <p className="font-serif text-6xl md:text-8xl text-ink leading-tight mt-4">
          怎样活这一生？
        </p>
      </div>

      {/* Original 3 hook lines — masked while flashlight present, fade by coverage */}
      <div
        className="relative z-[1] space-y-3"
        style={{
          ...maskStyle,
          opacity: linesOpacity,
          transition: revealed ? "opacity 1.2s" : "opacity 0.2s linear",
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

      {/* Draggable flashlight + hint */}
      {!hideFlash && typingComplete && (
        <motion.div
          drag
          dragMomentum={false}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{
            opacity: fadeOut ? 0 : 1,
            scale: 1,
          }}
          transition={{ duration: fadeOut ? 1.5 : 0.6 }}
          className="absolute top-8 right-8 cursor-grab active:cursor-grabbing select-none z-[3] flex flex-col items-center gap-2"
          aria-label="手电筒——拖动我扫过文字，右键收起"
        >
          <span className="text-3xl">🔦</span>
          <span className="font-sans text-[10px] text-muted tracking-widest whitespace-nowrap pointer-events-none">
            拖动 · 右键收起
          </span>
        </motion.div>
      )}
    </section>
  );
}
