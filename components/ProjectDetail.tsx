"use client";

import { useEffect } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import type { ExperienceProject } from "@/lib/types";

interface Props {
  project: ExperienceProject;
  index: number;
  total: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}

export default function ProjectDetail({
  project,
  index,
  total,
  onClose,
  onPrev,
  onNext,
}: Props) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") onPrev();
      else if (e.key === "ArrowRight") onNext();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onPrev, onNext]);

  const isFirst = index === 0;
  const isLast = index === total - 1;

  const pad2 = (n: number) => String(n).padStart(2, "0");

  return (
    <AnimatePresence>
      <motion.div
        key="project-detail"
        className="fixed inset-0 z-[60] bg-bg overflow-y-auto"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 200 }}
      >
        <div className="sticky top-0 z-10 bg-bg/90 backdrop-blur-sm border-b border-line px-6 py-4 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="font-sans text-xs text-muted hover:text-ink transition-colors tracking-widest uppercase"
          >
            ← 返回
          </button>
          <div className="font-sans text-xs text-muted tracking-widest">
            {pad2(index + 1)} / {pad2(total)}
          </div>
        </div>

        <div className="max-w-prose mx-auto px-6 py-20">
          <div className="font-sans text-xs text-muted tracking-widest uppercase">
            {project.period}
          </div>
          <h1 className="font-serif text-4xl md:text-5xl text-ink mt-4 leading-tight">
            {project.title}
          </h1>
          <div className="font-sans text-xs text-muted tracking-widest uppercase mt-3">
            {project.titleEn}
          </div>

          <ul className="mt-12 space-y-4">
            {project.highlights.map((h, i) => (
              <li
                key={i}
                className="font-serif text-lg text-ink leading-relaxed"
              >
                · {h}
              </li>
            ))}
          </ul>

          {project.assets.length > 0 && (
            <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4">
              {project.assets.map((src, i) => (
                <div
                  key={i}
                  className="relative aspect-[9/16] rounded-sm overflow-hidden bg-ink/5"
                >
                  <Image
                    src={src}
                    alt={`${project.title} · ${i + 1}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                </div>
              ))}
            </div>
          )}

          {project.works && project.works.length > 0 && (
            <div className="mt-20">
              <h2 className="font-sans text-xs text-muted tracking-widest uppercase mb-6">
                代表作品 / WORKS
              </h2>
              <div className="border-t border-line">
                {project.works.map((w, i) => (
                  <div
                    key={i}
                    className="border-b border-line py-6 px-2"
                  >
                    <div className="flex items-baseline justify-between gap-4">
                      <div className="min-w-0">
                        <div className="font-serif text-lg text-ink">
                          {w.title}
                        </div>
                        <div className="font-sans text-xs text-muted mt-1 tracking-wide">
                          {w.metric}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-24 pt-8 border-t border-line flex items-center justify-between">
            <button
              type="button"
              onClick={onPrev}
              disabled={isFirst}
              className="font-sans text-xs text-muted hover:text-ink transition-colors tracking-widest uppercase disabled:opacity-30 disabled:hover:text-muted disabled:cursor-not-allowed"
            >
              ← 上一个
            </button>
            <button
              type="button"
              onClick={onNext}
              disabled={isLast}
              className="font-sans text-xs text-muted hover:text-ink transition-colors tracking-widest uppercase disabled:opacity-30 disabled:hover:text-muted disabled:cursor-not-allowed"
            >
              下一个 →
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
