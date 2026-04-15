"use client";

import { useEffect, useRef, useState, useCallback } from "react";
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

type FlashTransform = {
  x: number;
  y: number;
  rotate: number;
  opacity: number;
  scale: number;
};

const ORIGIN: FlashTransform = { x: 0, y: 0, rotate: 0, opacity: 1, scale: 1 };

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
  const flashRef = useRef<HTMLDivElement>(null);
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
  const [completed, setCompleted] = useState(false);

  // React state for transform (used for the reset/drop animation via CSS
  // transition). During drag we bypass state and set the flashRef style
  // directly for lag-free tracking.
  const [transform, setTransform] = useState<FlashTransform>(ORIGIN);
  const [transitionDuration, setTransitionDuration] = useState(0);

  const dragRef = useRef<{
    pointerId: number;
    pointerX: number;
    pointerY: number;
    origX: number;
    origY: number;
    currentX: number;
    currentY: number;
  } | null>(null);

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

  function applyTransformToRef(t: FlashTransform) {
    const el = flashRef.current;
    if (!el) return;
    el.style.transform = `translate(${t.x}px, ${t.y}px) rotate(${t.rotate}deg) scale(${t.scale})`;
    el.style.opacity = String(t.opacity);
  }

  function recordScanPoint(clientX: number, clientY: number) {
    if (revealed || completed || !sectionRef.current || !typingComplete) return;
    const rect = sectionRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
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
        // Tear down the drag entirely — release pointer capture so
        // nothing claims ownership of the element for the reset.
        const d = dragRef.current;
        if (d && flashRef.current) {
          try {
            flashRef.current.releasePointerCapture(d.pointerId);
          } catch {
            // ignore
          }
        }
        dragRef.current = null;
        window.dispatchEvent(new Event("avatar:resume"));
        void endReveal();
      }
    }
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (revealed || completed || !typingComplete) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    // Disable transitions during drag (we update style directly)
    setTransitionDuration(0);
    dragRef.current = {
      pointerId: e.pointerId,
      pointerX: e.clientX,
      pointerY: e.clientY,
      origX: transform.x,
      origY: transform.y,
      currentX: transform.x,
      currentY: transform.y,
    };
    setDragging(true);
    applyTransformToRef({ ...transform, scale: 1.15 });
    window.dispatchEvent(new Event("avatar:pause"));
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const d = dragRef.current;
    if (!d) return;
    const nx = d.origX + (e.clientX - d.pointerX);
    const ny = d.origY + (e.clientY - d.pointerY);
    d.currentX = nx;
    d.currentY = ny;
    applyTransformToRef({
      x: nx,
      y: ny,
      rotate: 0,
      opacity: 1,
      scale: 1.15,
    });
    recordScanPoint(e.clientX, e.clientY);
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    const d = dragRef.current;
    if (!d) return;
    try {
      e.currentTarget.releasePointerCapture(d.pointerId);
    } catch {
      // ignore
    }
    // Commit the dragged position to React state so future transitions
    // can interpolate from it.
    const finalT: FlashTransform = {
      x: d.currentX,
      y: d.currentY,
      rotate: 0,
      opacity: 1,
      scale: 1,
    };
    dragRef.current = null;
    setTransform(finalT);
    applyTransformToRef(finalT);
    setDragging(false);
    setFlashPos(null);
    if (!revealed) {
      window.dispatchEvent(new Event("avatar:resume"));
    }
  }

  // Helper: snap state to a transform and wait for the transition to finish.
  async function animateTo(target: FlashTransform, durationMs: number) {
    setTransitionDuration(durationMs);
    setTransform(target);
    // style prop re-render happens async; mirror to ref immediately for
    // fallback if transition is missed.
    applyTransformToRef(target);
    await new Promise((r) => setTimeout(r, durationMs + 30));
  }

  async function endReveal() {
    await new Promise((r) => setTimeout(r, 1500));
    setFadeOut(true);
    await new Promise((r) => setTimeout(r, 900));

    // Read current transform (may have been dragged)
    const cur = transform;
    // Drop — pitch down + rotate + dim
    await animateTo(
      {
        x: cur.x,
        y: cur.y + 140,
        rotate: 28,
        opacity: 0.55,
        scale: 1,
      },
      550
    );
    await new Promise((r) => setTimeout(r, 200));

    // Reset to origin
    await animateTo(ORIGIN, 450);

    setRevealed(false);
    setFadeOut(false);
    setDragging(false);
    setFlashPos(null);
    visitedPointsRef.current = [];
    setMaskUrl("");
    setCompleted(true);
    window.dispatchEvent(new Event("avatar:resume"));
  }

  async function resetAll() {
    setRevealed(false);
    setFadeOut(false);
    setDragging(false);
    setFlashPos(null);
    dragRef.current = null;
    visitedPointsRef.current = [];
    setMaskUrl("");
    window.dispatchEvent(new Event("avatar:resume"));
    await animateTo(ORIGIN, 500);
  }

  function onContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    void resetAll();
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

      <div
        className="absolute inset-0 pointer-events-none z-[2] transition-opacity duration-500"
        style={{
          background: NIGHT_COLOR,
          opacity: nightActive ? 1 : 0,
        }}
      />

      {dragging && flashPos && (
        <div
          className="absolute inset-0 pointer-events-none z-[3]"
          style={{
            background: `radial-gradient(circle ${RADIUS * 1.3}px at ${flashPos.x}px ${flashPos.y}px, rgba(255,230,180,0.22) 0%, rgba(255,230,180,0.08) 45%, transparent 75%)`,
          }}
        />
      )}

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
            revealed && !fadeOut ? 1 : nightActive && maskUrl ? 1 : 0,
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

      <div
        className={`relative z-[1] mt-24 text-sm font-sans text-muted tracking-widest transition-opacity duration-1000 ${
          typingComplete && !nightActive ? "opacity-100" : "opacity-0"
        }`}
      >
        马泽闰 Mark · 2026
      </div>

      {typingComplete && (
        <div className="absolute bottom-40 left-0 right-0 flex justify-center pointer-events-none z-[80]">
          <div
            ref={flashRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            className={`pointer-events-auto select-none flex flex-col items-center gap-2 ${
              completed ? "cursor-default" : "cursor-grab active:cursor-grabbing"
            }`}
            style={{
              transform: `translate(${transform.x}px, ${transform.y}px) rotate(${transform.rotate}deg) scale(${transform.scale})`,
              opacity: transform.opacity,
              transition:
                transitionDuration > 0
                  ? `transform ${transitionDuration}ms ease-out, opacity ${transitionDuration}ms ease-out`
                  : "none",
              touchAction: "none",
            }}
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
          </div>
        </div>
      )}
    </section>
  );
}
