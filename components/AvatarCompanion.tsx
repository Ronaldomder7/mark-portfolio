"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";

type PetState = "idle" | "walking" | "sleeping" | "wave" | "thinking";

interface AvatarCompanionProps {
  onChatOpen: () => void;
  chatOpen: boolean;
}

export default function AvatarCompanion({ onChatOpen, chatOpen }: AvatarCompanionProps) {
  const [pos, setPos] = useState({ x: 100, y: 100 });
  const [targetPos, setTargetPos] = useState({ x: 100, y: 100 });
  const [state, setState] = useState<PetState>("idle");
  const [facingLeft, setFacingLeft] = useState(false);
  const [frame, setFrame] = useState(0);
  const [showBubble, setShowBubble] = useState(true);
  const [mounted, setMounted] = useState(false);
  const idleTimer = useRef<NodeJS.Timeout | null>(null);
  const frameRef = useRef(0);
  const stateRef = useRef<PetState>("idle");
  const posRef = useRef({ x: 100, y: 100 });
  const targetRef = useRef({ x: 100, y: 100 });

  // Initialize position
  useEffect(() => {
    setMounted(true);
    const startX = window.innerWidth - 120;
    const startY = window.innerHeight - 120;
    setPos({ x: startX, y: startY });
    setTargetPos({ x: startX, y: startY });
    posRef.current = { x: startX, y: startY };
    targetRef.current = { x: startX, y: startY };
  }, []);

  // Track mouse position as target
  useEffect(() => {
    if (!mounted) return;

    function onMouseMove(e: MouseEvent) {
      targetRef.current = { x: e.clientX - 16, y: e.clientY - 16 };

      // Wake up if sleeping
      if (stateRef.current === "sleeping") {
        stateRef.current = "walking";
        setState("walking");
      }

      // Reset idle timer
      if (idleTimer.current) clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(() => {
        stateRef.current = "idle";
        setState("idle");

        // After longer idle, fall asleep
        idleTimer.current = setTimeout(() => {
          stateRef.current = "sleeping";
          setState("sleeping");
        }, 8000);
      }, 2000);
    }

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMouseMove);
  }, [mounted]);

  // Main animation loop
  useEffect(() => {
    if (!mounted) return;

    const SPEED = 6;
    const CLOSE_ENOUGH = 48;
    let animId: number;
    let lastTime = 0;

    function tick(timestamp: number) {
      animId = requestAnimationFrame(tick);

      // ~60ms per frame (like oneko.js's 100ms but smoother)
      if (timestamp - lastTime < 60) return;
      lastTime = timestamp;

      const current = posRef.current;
      const target = targetRef.current;

      const dx = target.x - current.x;
      const dy = target.y - current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > CLOSE_ENOUGH) {
        // Move toward target
        const moveX = (dx / dist) * SPEED;
        const moveY = (dy / dist) * SPEED;
        const newPos = {
          x: current.x + moveX,
          y: current.y + moveY,
        };
        posRef.current = newPos;
        setPos(newPos);

        // Face direction of movement
        setFacingLeft(dx < 0);

        // Set walking state
        if (stateRef.current !== "walking") {
          stateRef.current = "walking";
          setState("walking");
        }

        // Animate walking frame
        frameRef.current = (frameRef.current + 1) % 4;
        setFrame(frameRef.current);
      } else {
        // Close enough — idle
        if (stateRef.current === "walking") {
          stateRef.current = "idle";
          setState("idle");
        }
      }
    }

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [mounted]);

  // Hide bubble after 5 seconds
  useEffect(() => {
    const t = setTimeout(() => setShowBubble(false), 5000);
    return () => clearTimeout(t);
  }, []);

  if (!mounted || chatOpen) return null;

  // CSS transforms based on state
  const stateTransform = (() => {
    switch (state) {
      case "walking":
        // Bouncy walk: alternate Y offset
        return `translateY(${frame % 2 === 0 ? -3 : 3}px)`;
      case "sleeping":
        return "rotate(20deg) scale(0.85)";
      case "idle":
        return "";
      default:
        return "";
    }
  })();

  return (
    <div
      className="fixed z-50 pointer-events-none"
      style={{
        left: pos.x,
        top: pos.y,
        transition: state === "walking" ? "none" : "left 0.3s, top 0.3s",
      }}
    >
      {/* Speech bubble */}
      {showBubble && state !== "sleeping" && (
        <div
          className="absolute -top-14 left-1/2 -translate-x-1/2 whitespace-nowrap pointer-events-none"
          style={{
            background: "#FAFAF8",
            border: "1px solid #E8E6E1",
            borderRadius: 12,
            padding: "6px 12px",
            fontSize: 12,
            fontFamily: "var(--font-sans)",
            color: "#1A1A1A",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            animation: "fadeUp 0.3s ease-out",
          }}
        >
          点击我聊天 👋
          {/* Triangle pointer */}
          <div
            className="absolute left-1/2 -translate-x-1/2 -bottom-1.5"
            style={{
              width: 8,
              height: 8,
              background: "#FAFAF8",
              border: "1px solid #E8E6E1",
              borderTop: "none",
              borderLeft: "none",
              transform: "translateX(-50%) rotate(45deg)",
            }}
          />
        </div>
      )}

      {/* Sleeping zzz */}
      {state === "sleeping" && (
        <div
          className="absolute -top-8 -right-2 font-serif text-muted pointer-events-none select-none"
          style={{
            fontSize: 16,
            animation: "zzzFloat 2s ease-in-out infinite",
          }}
        >
          💤
        </div>
      )}

      {/* Avatar — clickable */}
      <button
        type="button"
        onClick={onChatOpen}
        className="pointer-events-auto cursor-pointer block"
        style={{
          width: 64,
          height: 64,
          transform: `${facingLeft ? "scaleX(-1)" : ""} ${stateTransform}`,
          transition: "transform 0.15s ease",
          filter: state === "sleeping"
            ? "brightness(0.8) saturate(0.7)"
            : "drop-shadow(0 3px 8px rgba(0,0,0,0.12))",
        }}
        aria-label="和马克的数字分身聊天"
      >
        <Image
          src="/avatar-nobg.png"
          alt="马克"
          width={64}
          height={64}
          className="object-contain"
          priority
        />
      </button>

      {/* Ground shadow */}
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: -4,
          left: "50%",
          transform: "translateX(-50%)",
          width: state === "sleeping" ? 30 : 40,
          height: 6,
          background: "rgba(0,0,0,0.06)",
          borderRadius: "50%",
          filter: "blur(2px)",
        }}
      />
    </div>
  );
}
