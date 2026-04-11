"use client";

import { useEffect, useRef, useState } from "react";

interface AnimatedNumberProps {
  value: string; // e.g. "16,384" or "100万+" or "303万"
  className?: string;
}

export default function AnimatedNumber({ value, className }: AnimatedNumberProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [displayed, setDisplayed] = useState(value);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          animateValue();
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  function animateValue() {
    // Extract numeric part and suffix
    const match = value.match(/^([\d,]+)(.*)/);
    if (!match) {
      setDisplayed(value);
      return;
    }

    const numericStr = match[1].replace(/,/g, "");
    const suffix = match[2]; // e.g. "万+", "万", ""
    const target = parseInt(numericStr, 10);
    const duration = 1500; // ms
    const steps = 40;
    const stepDuration = duration / steps;

    let current = 0;
    const increment = target / steps;

    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        current = target;
        clearInterval(timer);
      }
      // Format with commas
      const formatted = Math.round(current).toLocaleString("en-US");
      setDisplayed(formatted + suffix);
    }, stepDuration);
  }

  return (
    <div ref={ref} className={className}>
      {displayed}
    </div>
  );
}
