"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";

// Section-to-state mapping: what the avatar "does" at each section
type AvatarState = "idle" | "wave" | "think" | "read" | "work" | "sleep" | "excited";

const SECTION_STATES: Record<string, { state: AvatarState; tooltip: string }> = {
  hero: { state: "wave", tooltip: "你好！" },
  works: { state: "work", tooltip: "在复盘数据..." },
  beliefs: { state: "think", tooltip: "在想事情..." },
  mind: { state: "read", tooltip: "在读笔记..." },
  timeline: { state: "idle", tooltip: "在回忆..." },
  map: { state: "excited", tooltip: "想去旅行！" },
  recent: { state: "think", tooltip: "在思考..." },
  guestbook: { state: "wave", tooltip: "留个言吧！" },
};

const SECTIONS = ["hero", "works", "beliefs", "mind", "timeline", "map", "recent", "guestbook"];

// CSS transforms for different states
const STATE_STYLES: Record<AvatarState, React.CSSProperties> = {
  idle: {},
  wave: { transform: "rotate(-5deg)" },
  think: { transform: "translateY(-3px) rotate(3deg)" },
  read: { transform: "translateY(2px) rotate(-2deg)" },
  work: { transform: "scaleX(-1)" }, // flip horizontally
  sleep: { transform: "rotate(15deg) translateY(5px)", opacity: 0.7 },
  excited: { transform: "translateY(-8px) scale(1.05)" },
};

interface AvatarCompanionProps {
  onChatOpen: () => void;
  chatOpen: boolean;
}

export default function AvatarCompanion({ onChatOpen, chatOpen }: AvatarCompanionProps) {
  const [currentState, setCurrentState] = useState<AvatarState>("wave");
  const [tooltip, setTooltip] = useState("你好！");
  const [hovered, setHovered] = useState(false);
  const [showTooltip, setShowTooltip] = useState(true);

  // Track which section is in view
  useEffect(() => {
    function updateState() {
      const scrollY = window.scrollY;
      const viewH = window.innerHeight;
      const center = scrollY + viewH * 0.5;

      let currentSection = "hero";
      for (const id of SECTIONS) {
        const el = document.getElementById(id);
        if (!el) continue;
        if (el.offsetTop <= center) {
          currentSection = id;
        }
      }

      const sectionConfig = SECTION_STATES[currentSection] || SECTION_STATES.hero;
      setCurrentState(sectionConfig.state);
      setTooltip(sectionConfig.tooltip);
    }

    updateState();
    window.addEventListener("scroll", updateState, { passive: true });
    return () => window.removeEventListener("scroll", updateState);
  }, []);

  // Auto-hide tooltip after 3 seconds, show again on section change
  useEffect(() => {
    setShowTooltip(true);
    const timer = setTimeout(() => setShowTooltip(false), 3000);
    return () => clearTimeout(timer);
  }, [currentState]);

  if (chatOpen) return null; // Hide when chat is open

  return (
    <button
      type="button"
      onClick={onChatOpen}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="fixed z-50 cursor-pointer group"
      style={{
        bottom: 24,
        right: 24,
        width: 80,
        height: 80,
      }}
      aria-label="和马克的数字分身聊天"
    >
      {/* Tooltip bubble */}
      <span
        className="absolute -top-12 right-0 whitespace-nowrap font-sans text-xs bg-bg border border-line rounded-full px-4 py-2 pointer-events-none transition-all duration-500"
        style={{
          color: "#1A1A1A",
          boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
          opacity: showTooltip || hovered ? 1 : 0,
          transform: showTooltip || hovered ? "translateY(0)" : "translateY(4px)",
        }}
      >
        {hovered ? "点我聊天 💬" : tooltip}
      </span>

      {/* Avatar container with breathing animation */}
      <div
        className="relative w-full h-full transition-all duration-700 ease-in-out"
        style={{
          animation: "avatarFloat 3s ease-in-out infinite",
          ...STATE_STYLES[hovered ? "excited" : currentState],
        }}
      >
        {/* Shadow under avatar */}
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full"
          style={{
            width: 50,
            height: 8,
            background: "rgba(0,0,0,0.08)",
            filter: "blur(3px)",
            animation: "avatarShadow 3s ease-in-out infinite",
          }}
        />

        {/* Avatar image — transparent background version */}
        <Image
          src="/avatar-nobg.png"
          alt="马克的数字分身"
          width={80}
          height={80}
          className="object-contain object-bottom drop-shadow-lg transition-transform duration-300"
          style={{
            filter: hovered
              ? "drop-shadow(0 4px 12px rgba(139, 46, 46, 0.3))"
              : "drop-shadow(0 2px 6px rgba(0,0,0,0.1))",
          }}
          priority
        />
      </div>

      {/* Pulse ring */}
      {!hovered && (
        <span
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            border: "1.5px solid rgba(139, 46, 46, 0.2)",
            animation: "avatarPulse 2.5s ease-out infinite",
          }}
        />
      )}
    </button>
  );
}
