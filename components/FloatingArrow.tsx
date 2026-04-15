"use client";

import { useEffect, useState } from "react";

// Section IDs in order (minus Hero — we hide while Hero is visible)
const SECTIONS = ["experience", "beliefs", "mind", "timeline", "map", "recent", "guestbook"];

export default function FloatingArrow() {
  const [nextSection, setNextSection] = useState<string | null>(null);
  const [heroVisible, setHeroVisible] = useState(true); // assume hero visible on load
  const [nearBottom, setNearBottom] = useState(false);

  // Reliable Hero visibility via IntersectionObserver
  useEffect(() => {
    const hero = document.getElementById("hero");
    if (!hero) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        // Treat Hero as "visible" when >= 20% of it is in viewport.
        // This keeps FloatingArrow out of the way while the flashlight
        // has center stage on Hero.
        setHeroVisible(entry.intersectionRatio >= 0.2);
      },
      { threshold: [0, 0.2, 0.5, 1] }
    );
    obs.observe(hero);
    return () => obs.disconnect();
  }, []);

  // Next-section tracking + bottom detection
  useEffect(() => {
    function update() {
      const scrollY = window.scrollY;
      const viewH = window.innerHeight;
      const docH = document.documentElement.scrollHeight;

      setNearBottom(scrollY + viewH > docH - 200);

      const center = scrollY + viewH * 0.6;
      let next: string | null = null;
      for (const id of SECTIONS) {
        const el = document.getElementById(id);
        if (!el) continue;
        if (el.offsetTop > center) {
          next = id;
          break;
        }
      }
      setNextSection(next);
    }

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const visible = !heroVisible && !nearBottom && !!nextSection;
  if (!visible) return null;

  return (
    <a
      href={`#${nextSection}`}
      aria-label="继续向下"
      className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] transition-all duration-500"
      style={{ opacity: 0.4 }}
    >
      <div
        className="w-10 h-10 flex items-center justify-center rounded-full backdrop-blur-sm"
        style={{
          background: "rgba(26, 26, 26, 0.15)",
          border: "1px solid rgba(26, 26, 26, 0.08)",
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-ink animate-bounce"
          style={{ animationDuration: "2s" }}
        >
          <path
            d="M12 5v14M5 12l7 7 7-7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </a>
  );
}
