"use client";

import { useEffect, useState } from "react";
import staticContent from "@/content/static.json";
import type { StaticContent } from "@/lib/types";

const content = staticContent as StaticContent;

export default function Hero() {
  const [visibleChars, setVisibleChars] = useState(0);
  const fullText = content.hook.lines.join("\n");
  const totalChars = fullText.length;

  useEffect(() => {
    if (visibleChars >= totalChars) return;

    const delay = 80; // ms per character
    const timer = setTimeout(() => {
      setVisibleChars((prev) => prev + 1);
    }, delay);

    return () => clearTimeout(timer);
  }, [visibleChars, totalChars]);

  // Split the revealed text back into lines
  const revealed = fullText.slice(0, visibleChars);
  const lines = revealed.split("\n");

  const isComplete = visibleChars >= totalChars;

  return (
    <section
      id="hero"
      className="min-h-screen flex flex-col justify-center items-center px-6 text-center"
    >
      <div className="space-y-3">
        {content.hook.lines.map((line, i) => (
          <p
            key={i}
            className="font-serif text-3xl md:text-5xl text-ink leading-relaxed tracking-wide"
          >
            {lines[i] || ""}
            {/* Show cursor on the current typing line */}
            {!isComplete && i === lines.length - 1 && (
              <span className="animate-pulse text-accent">|</span>
            )}
          </p>
        ))}
      </div>

      <div
        className={`mt-24 text-sm font-sans text-muted tracking-widest transition-opacity duration-1000 ${
          isComplete ? "opacity-100" : "opacity-0"
        }`}
      >
        马泽闰 Mark · 2026
      </div>
    </section>
  );
}
