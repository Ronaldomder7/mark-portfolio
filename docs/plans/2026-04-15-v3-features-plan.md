# V3 功能 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ship the 4 V3 features for asi-mark.cn: information architecture (Experience section + Footer apply), Hero flashlight easter egg, fullscreen project pages, and gesture-based China map.

**Architecture:** Replace existing `Works` component with new `Experience` section listing 4 projects as MIMO-style numbered cards. Each project opens a fullscreen takeover via `framer-motion`. Hero gains a draggable flashlight with SVG mask reveal. ChinaMap gets a gesture layer using MediaPipe (opt-in) with particle effects fallback to mouse. Footer adds the WeChat QR application block.

**Tech Stack:** Next.js 16 + React 19 + TypeScript + Tailwind v4 + framer-motion + @mediapipe/tasks-vision + @react-three/fiber (existing) + SVG mask

---

## Phase 0: Dependencies & Content

### Task 1: Install new dependencies

**Files:** `package.json`

**Step 1: Install framer-motion and MediaPipe**

Run:
```bash
cd ~/Code/mark-portfolio
npm install framer-motion @mediapipe/tasks-vision
```

**Step 2: Verify build still works**

Run: `npm run build`
Expected: Build succeeds.

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "deps: add framer-motion and mediapipe for V3 features"
```

---

### Task 2: Add experience data to content/static.json

**Files:**
- Modify: `content/static.json`
- Modify: `lib/types.ts`

**Step 1: Add experience array to static.json**

Add this block inside the top-level object:

```json
"experience": [
  {
    "num": "01",
    "period": "2024.06 - 至今",
    "title": "个人自媒体",
    "titleEn": "PERSONAL MEDIA",
    "summary": "抖音 2 万粉 · 百万爆款 · 5 位数广告营收",
    "highlights": [
      "抖音单月 2 万粉丝",
      "创作出多个百万爆款视频",
      "广告营收 5 位数"
    ],
    "assets": []
  },
  {
    "num": "02",
    "period": "2024.10 - 至今",
    "title": "行动营主理（4 次）",
    "titleEn": "CAMP LEADER",
    "summary": "4,375 人累计带教",
    "highlights": [
      "《AI短视频自媒体AIP打造》主教练 · 1210 人",
      "《视频号&小红书AI短视频影响力》主教练 · 264 人",
      "《AI工作流创始人IP打造》主教练 · 235 人",
      "《AI一人公司内容自动化》主教练 · 2666 人"
    ],
    "assets": [
      "/camps/camp-01.jpg",
      "/camps/camp-02.jpg",
      "/camps/camp-03.jpg",
      "/camps/camp-04.jpg"
    ]
  },
  {
    "num": "03",
    "period": "2025.03 - 2025.06",
    "title": "MCN 操盘",
    "titleEn": "MCN OPERATIONS",
    "summary": "统筹学员/教练/助教 · 奖励体系",
    "highlights": [
      "统筹学员 / 教练 / 助教",
      "奖励体系搭建"
    ],
    "assets": []
  },
  {
    "num": "04",
    "period": "2025.07 - 至今",
    "title": "IP 操盘手",
    "titleEn": "IP COMMANDER",
    "summary": "月成交万单 · ROI 0.18 · 月 GMV 100万+",
    "highlights": [
      "在 Obsidian 知识库搭建了整个营销系统",
      "用户调研和分层 → IP 策划和脚本 → 拍摄和剪辑 → 投放和复盘"
    ],
    "works": [
      { "title": "代表作品 01", "metric": "出单 5,248 · ROI 0.16" },
      { "title": "代表作品 02", "metric": "出单 536 · ROI 0.36" },
      { "title": "代表作品 03", "metric": "单月产出 114 条" }
    ],
    "assets": []
  }
]
```

**Step 2: Extend types**

In `lib/types.ts`, add:

```typescript
export interface ExperienceWork {
  title: string;
  metric: string;
}

export interface ExperienceProject {
  num: string;
  period: string;
  title: string;
  titleEn: string;
  summary: string;
  highlights: string[];
  assets: string[];
  works?: ExperienceWork[];
}

// And add to StaticContent:
export interface StaticContent {
  // ... existing fields
  experience: ExperienceProject[];
}
```

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 4: Commit**

```bash
git add content/static.json lib/types.ts
git commit -m "content: add 4 project entries for Experience section"
```

---

### Task 3: Add camp screenshots to public/

**Files:** `public/camps/`

**Step 1: Create camps directory**

Run: `mkdir -p ~/Code/mark-portfolio/public/camps`

**Step 2: Ask user to save 4 camp screenshots**

Prompt user to place these files in `public/camps/`:
- `camp-01.jpg` — AI短视频自媒体AIP打造 screenshot
- `camp-02.jpg` — 视频号&小红书AI短视频影响力 screenshot
- `camp-03.jpg` — AI工作流创始人IP打造 screenshot
- `camp-04.jpg` — AI一人公司内容自动化 screenshot

If user hasn't provided them, use placeholders for now.

**Step 3: Commit when user confirms files present**

```bash
git add public/camps/
git commit -m "content: add 4 camp screenshots for project 02"
```

---

## Phase 1: Experience Section (Replaces Works)

### Task 4: Create Experience component (MIMO-style cards)

**Files:**
- Create: `components/Experience.tsx`
- Modify: `app/page.tsx`

**Step 1: Write the component**

Create `components/Experience.tsx`:

```tsx
"use client";

import { useState } from "react";
import staticContent from "@/content/static.json";
import type { StaticContent, ExperienceProject } from "@/lib/types";
import ProjectDetail from "./ProjectDetail";

const content = staticContent as StaticContent;

export default function Experience() {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  return (
    <>
      <section id="experience" className="py-32 px-6">
        <div className="max-w-prose mx-auto">
          <h2 className="font-sans text-xs text-muted tracking-widest uppercase mb-4">
            我做过什么 / EXPERIENCE
          </h2>
          <p className="font-serif text-lg text-ink mb-16 leading-relaxed">
            这两年，从一个人到带一支团队。
          </p>

          <div className="space-y-0 border-t border-line">
            {content.experience.map((p, i) => (
              <button
                key={p.num}
                type="button"
                onClick={() => setActiveIdx(i)}
                className="group block w-full text-left border-b border-line py-6 cursor-pointer transition-colors hover:bg-ink/[0.02]"
              >
                <div className="flex items-baseline gap-6">
                  <span className="font-sans text-xs text-muted tracking-widest shrink-0 w-8">
                    {p.num}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-4 mb-2">
                      <span className="font-sans text-xs text-muted tracking-wide">
                        {p.period}
                      </span>
                      <span className="font-sans text-xs text-muted group-hover:text-accent transition-colors shrink-0">
                        →
                      </span>
                    </div>
                    <div className="font-serif text-lg text-ink group-hover:text-accent transition-colors">
                      {p.title}
                    </div>
                    <div className="font-sans text-xs text-muted mt-2 tracking-wide">
                      {p.summary}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {activeIdx !== null && (
        <ProjectDetail
          project={content.experience[activeIdx]}
          index={activeIdx}
          total={content.experience.length}
          onClose={() => setActiveIdx(null)}
          onPrev={() => setActiveIdx((i) => (i! > 0 ? i! - 1 : i))}
          onNext={() =>
            setActiveIdx((i) =>
              i! < content.experience.length - 1 ? i! + 1 : i
            )
          }
        />
      )}
    </>
  );
}
```

**Step 2: Wire into page**

In `app/page.tsx`:
```diff
- import Works from "@/components/Works";
+ import Experience from "@/components/Experience";
```

```diff
-      <Works />
+      <Experience />
```

**Step 3: Run dev, verify cards render**

Run: `npm run dev`
Visit `http://localhost:3000` — Experience section shows 4 numbered cards.
Clicking a card will fail until ProjectDetail exists — that's OK, next task.

**Step 4: Commit**

```bash
git add components/Experience.tsx app/page.tsx
git commit -m "feat: add Experience section replacing Works"
```

---

### Task 5: Create ProjectDetail fullscreen component

**Files:**
- Create: `components/ProjectDetail.tsx`

**Step 1: Write ProjectDetail**

```tsx
"use client";

import { useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
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
  // ESC to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && index > 0) onPrev();
      if (e.key === "ArrowRight" && index < total - 1) onNext();
    };
    window.addEventListener("keydown", onKey);
    // Lock body scroll
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose, onPrev, onNext, index, total]);

  return (
    <AnimatePresence>
      <motion.div
        key={project.num}
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 200 }}
        className="fixed inset-0 z-[60] bg-bg overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-bg/95 backdrop-blur-sm border-b border-line">
          <div className="max-w-prose mx-auto flex items-center justify-between px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="font-sans text-xs text-muted hover:text-ink transition-colors tracking-widest"
            >
              ← 返回
            </button>
            <span className="font-sans text-xs text-muted tracking-widest">
              {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="max-w-prose mx-auto px-6 py-20">
          <div className="font-sans text-xs text-muted tracking-widest mb-2">
            {project.period}
          </div>
          <h1 className="font-serif text-4xl md:text-5xl text-ink mb-2">
            {project.title}
          </h1>
          <div className="font-sans text-xs text-muted tracking-widest mb-16">
            {project.titleEn}
          </div>

          <ul className="space-y-4 mb-20 border-t border-line pt-8">
            {project.highlights.map((h, i) => (
              <li
                key={i}
                className="font-serif text-lg text-ink leading-relaxed"
              >
                · {h}
              </li>
            ))}
          </ul>

          {/* Assets */}
          {project.assets.length > 0 && (
            <div className="mb-20">
              <h2 className="font-sans text-xs text-muted tracking-widest uppercase mb-6">
                素材 / ASSETS
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {project.assets.map((src, i) => (
                  <div
                    key={i}
                    className="aspect-[9/16] relative rounded-sm overflow-hidden bg-ink/5"
                  >
                    <Image
                      src={src}
                      alt=""
                      fill
                      className="object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Nested works (IP 操盘手 only) */}
          {project.works && project.works.length > 0 && (
            <div className="mb-20">
              <h2 className="font-sans text-xs text-muted tracking-widest uppercase mb-6">
                代表作品 / WORKS
              </h2>
              <div className="border-t border-line">
                {project.works.map((w, i) => (
                  <a
                    key={i}
                    href="#apply"
                    onClick={onClose}
                    className="group block border-b border-line py-6"
                  >
                    <div className="flex items-baseline justify-between">
                      <div>
                        <div className="font-serif text-lg text-ink group-hover:text-accent transition-colors">
                          {w.title}
                        </div>
                        <div className="font-sans text-xs text-muted mt-1 tracking-wide">
                          {w.metric}
                        </div>
                      </div>
                      <div className="font-sans text-xs text-muted group-hover:text-accent transition-colors">
                        申请查看 →
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Nav */}
          <div className="flex items-center justify-between border-t border-line pt-8">
            <button
              type="button"
              onClick={onPrev}
              disabled={index === 0}
              className="font-sans text-xs text-muted hover:text-ink disabled:opacity-30 disabled:hover:text-muted transition-colors tracking-widest"
            >
              ← 上一个
            </button>
            <button
              type="button"
              onClick={onNext}
              disabled={index === total - 1}
              className="font-sans text-xs text-muted hover:text-ink disabled:opacity-30 disabled:hover:text-muted transition-colors tracking-widest"
            >
              下一个 →
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
```

**Step 2: Test clicking each card opens detail**

Run: `npm run dev`
Click each card → detail slides in. ESC closes. ← → keys navigate.

**Step 3: Commit**

```bash
git add components/ProjectDetail.tsx
git commit -m "feat: add fullscreen ProjectDetail with navigation"
```

---

### Task 6: Add Footer apply section

**Files:**
- Create: `components/FooterApply.tsx`
- Modify: `components/Footer.tsx`
- Modify: `app/page.tsx`

**Step 1: Write FooterApply component**

```tsx
"use client";

import Image from "next/image";

export default function FooterApply() {
  return (
    <section
      id="apply"
      className="border-t border-line px-6 py-24"
    >
      <div className="max-w-prose mx-auto text-center">
        <h2 className="font-sans text-xs text-muted tracking-widest uppercase mb-6">
          想看完整作品集？ / APPLY
        </h2>
        <p className="font-serif text-lg text-ink mb-2 leading-relaxed">
          作品集为申请制。
        </p>
        <p className="font-sans text-xs text-muted mb-10 tracking-wide leading-relaxed">
          微信加我，告诉我你是谁、想看什么。
          <br />
          我同意后发送完整作品链接。
        </p>

        <div className="flex justify-center mb-6">
          <Image
            src="/wechat-qr.jpg"
            alt="马克的微信二维码"
            width={240}
            height={240}
            className="rounded-sm"
          />
        </div>

        <p className="font-sans text-xs text-muted tracking-widest">
          微信号 · ASI_Mark
        </p>
      </div>
    </section>
  );
}
```

**Step 2: Insert before Footer in page.tsx**

```diff
         <Guestbook />
+        <FooterApply />
         <Footer />
```

And add the import.

**Step 3: Test scrolling to footer shows apply + QR**

**Step 4: Remove Works modal code**

Delete `components/Works.tsx` (no longer referenced) and remove from any imports.

Run: `grep -r "Works" app/ components/ --include="*.tsx"`
Expected: No references except in `ProjectDetail` for 代表作品 text.

**Step 5: Commit**

```bash
git add components/FooterApply.tsx app/page.tsx
git rm components/Works.tsx
git commit -m "feat: move WeChat apply to Footer, remove Works modal"
```

---

## Phase 2: Hero Flashlight Easter Egg

### Task 7: Write flashlight reveal test

**Files:**
- Create: `components/__tests__/flashlightReveal.test.ts`

**Step 1: Write failing test for coverage calculation**

```typescript
import { describe, it, expect } from "vitest";
import { calculateCoverage, isRevealed } from "../lib/flashlightReveal";

describe("flashlightReveal", () => {
  it("returns 0 coverage when no points visited", () => {
    expect(calculateCoverage([], 100, 100)).toBe(0);
  });

  it("returns higher coverage with more points", () => {
    const few = calculateCoverage([{ x: 50, y: 50, r: 30 }], 200, 100);
    const many = calculateCoverage(
      [
        { x: 30, y: 30, r: 30 },
        { x: 100, y: 30, r: 30 },
        { x: 170, y: 30, r: 30 },
        { x: 30, y: 70, r: 30 },
        { x: 100, y: 70, r: 30 },
        { x: 170, y: 70, r: 30 },
      ],
      200,
      100
    );
    expect(many).toBeGreaterThan(few);
  });

  it("isRevealed returns true when coverage >= threshold", () => {
    expect(isRevealed(0.85, 0.8)).toBe(true);
    expect(isRevealed(0.5, 0.8)).toBe(false);
  });
});
```

**Step 2: Run test (expect failure)**

Run: `npx vitest run components/__tests__/flashlightReveal.test.ts`

**Step 3: Implement helpers**

Create `lib/flashlightReveal.ts`:

```typescript
export interface Circle {
  x: number;
  y: number;
  r: number;
}

/**
 * Very rough coverage estimate: sample grid and check if each sample
 * point is inside any circle. Returns 0..1 fraction of grid cells covered.
 */
export function calculateCoverage(
  circles: Circle[],
  width: number,
  height: number,
  step = 10
): number {
  if (circles.length === 0) return 0;
  let total = 0;
  let covered = 0;
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      total++;
      for (const c of circles) {
        const dx = x - c.x;
        const dy = y - c.y;
        if (dx * dx + dy * dy <= c.r * c.r) {
          covered++;
          break;
        }
      }
    }
  }
  return total === 0 ? 0 : covered / total;
}

export function isRevealed(coverage: number, threshold: number): boolean {
  return coverage >= threshold;
}
```

**Step 4: Tests pass**

Run: `npx vitest run components/__tests__/flashlightReveal.test.ts`
Expected: All 3 tests pass.

**Step 5: Commit**

```bash
git add lib/flashlightReveal.ts components/__tests__/flashlightReveal.test.ts
git commit -m "feat: add flashlight coverage calculation helpers"
```

---

### Task 8: Integrate flashlight into Hero

**Files:**
- Modify: `components/Hero.tsx`

**Step 1: Read current Hero**

Run: `cat components/Hero.tsx`

**Step 2: Rewrite Hero with flashlight layer**

Wrap existing Hero content in a relative container. Add behind it a hidden large-text layer with "你想要 / 怎样活这一生？". Add a draggable flashlight using framer-motion `useDragControls`. Use SVG mask to reveal the hidden layer within the flashlight circle.

Key structure:

```tsx
"use client";

import { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import staticContent from "@/content/static.json";
import { calculateCoverage, isRevealed, type Circle } from "@/lib/flashlightReveal";

export default function Hero() {
  const hookLines = staticContent.hook.lines;
  const heroRef = useRef<HTMLDivElement>(null);
  const [flashPos, setFlashPos] = useState({ x: -200, y: -200 }); // off-screen
  const [visitedPoints, setVisitedPoints] = useState<Circle[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const [hideFlash, setHideFlash] = useState(false);

  const RADIUS = 70;
  const THRESHOLD = 0.5;

  // Record visited points as user drags
  useEffect(() => {
    if (revealed || flashPos.x < 0) return;
    setVisitedPoints((prev) => {
      const next = [...prev, { x: flashPos.x, y: flashPos.y, r: RADIUS }];
      // Throttle: keep only last 500 points
      return next.length > 500 ? next.slice(-500) : next;
    });
  }, [flashPos, revealed]);

  // Check coverage
  useEffect(() => {
    if (revealed || !heroRef.current) return;
    const rect = heroRef.current.getBoundingClientRect();
    const cov = calculateCoverage(visitedPoints, rect.width, rect.height);
    if (isRevealed(cov, THRESHOLD)) {
      setRevealed(true);
      // After 3s, fade out revealed text and flashlight
      setTimeout(() => setFadeOut(true), 3000);
      setTimeout(() => {
        setFadeOut(false);
        setHideFlash(true);
      }, 4500);
    }
  }, [visitedPoints, revealed]);

  // Unique mask id
  const maskId = "flashlight-mask";

  return (
    <section
      ref={heroRef}
      className="relative min-h-screen flex items-center justify-center px-6 py-20 overflow-hidden"
      onPointerMove={(e) => {
        if (revealed || hideFlash) return;
        const rect = heroRef.current!.getBoundingClientRect();
        setFlashPos({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      }}
    >
      {/* Hidden revealed text layer */}
      <div
        className={`absolute inset-0 flex flex-col items-center justify-center pointer-events-none transition-opacity ${
          revealed && !fadeOut ? "opacity-100" : "opacity-0"
        }`}
        style={{
          transitionDuration: revealed && !fadeOut ? "500ms" : "1500ms",
        }}
      >
        <p className="font-serif text-6xl md:text-8xl text-ink leading-tight text-center">
          你想要
        </p>
        <p className="font-serif text-6xl md:text-8xl text-ink leading-tight text-center mt-4">
          怎样活这一生？
        </p>
      </div>

      {/* Original 3 hook lines — visible except where flashlight is */}
      <div
        className="relative z-[1] max-w-prose mx-auto"
        style={{
          WebkitMaskImage: revealed
            ? "none"
            : `radial-gradient(circle ${RADIUS}px at ${flashPos.x}px ${flashPos.y}px, transparent 60%, black 100%)`,
          maskImage: revealed
            ? "none"
            : `radial-gradient(circle ${RADIUS}px at ${flashPos.x}px ${flashPos.y}px, transparent 60%, black 100%)`,
          opacity: revealed ? 0 : 1,
          transition: "opacity 1s",
        }}
      >
        {hookLines.map((line, i) => (
          <p
            key={i}
            className="font-serif text-2xl md:text-3xl text-ink leading-relaxed"
          >
            {line}
          </p>
        ))}
      </div>

      {/* Flashlight icon */}
      {!hideFlash && (
        <motion.div
          drag
          dragMomentum={false}
          className="absolute top-8 right-8 text-3xl cursor-grab active:cursor-grabbing pointer-events-auto select-none"
          style={{ opacity: fadeOut ? 0 : 1, transition: "opacity 1.5s" }}
        >
          🔦
        </motion.div>
      )}
    </section>
  );
}
```

Note: existing Hero content may differ. Read it first and preserve structure; only add the flashlight layer on top of existing content.

**Step 3: Test in browser**

Run: `npm run dev`
- Move mouse over Hero → dark circle follows
- Move mouse widely → more coverage → at ~50% reveal triggers big text
- 3s later big text fades → original 3 lines return → 🔦 disappears

**Step 4: Commit**

```bash
git add components/Hero.tsx
git commit -m "feat: add flashlight reveal easter egg to Hero"
```

---

## Phase 3: China Map Gesture Interaction

### Task 9: Detect WebGL & camera support, add opt-in prompt

**Files:**
- Modify: `components/ChinaMap.tsx`
- Create: `components/MapGesturePrompt.tsx`

**Step 1: Write opt-in prompt component**

```tsx
"use client";

import { useState, useEffect } from "react";

interface Props {
  onAllow: () => void;
  onDeny: () => void;
}

export default function MapGesturePrompt({ onAllow, onDeny }: Props) {
  const [visible, setVisible] = useState(false);

  // Only show once per session
  useEffect(() => {
    const dismissed = sessionStorage.getItem("map-gesture-dismissed");
    if (!dismissed) setVisible(true);
  }, []);

  if (!visible) return null;

  function dismiss() {
    sessionStorage.setItem("map-gesture-dismissed", "1");
    setVisible(false);
  }

  return (
    <div className="absolute top-4 right-4 z-10 bg-bg border border-line rounded-sm p-4 max-w-xs font-sans text-xs">
      <p className="text-ink mb-3 leading-relaxed">
        打开摄像头，用手势浏览地图？
      </p>
      <p className="text-muted mb-4 leading-relaxed">
        挥手滑地图，握拳展开城市照片。
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            dismiss();
            onAllow();
          }}
          className="px-3 py-1.5 bg-ink text-bg tracking-wide hover:opacity-80 transition-opacity"
        >
          允许
        </button>
        <button
          type="button"
          onClick={() => {
            dismiss();
            onDeny();
          }}
          className="px-3 py-1.5 border border-line text-muted tracking-wide hover:text-ink transition-colors"
        >
          用鼠标就行
        </button>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add components/MapGesturePrompt.tsx
git commit -m "feat: add map gesture opt-in prompt"
```

---

### Task 10: MediaPipe hand tracking hook

**Files:**
- Create: `components/useHandTracking.ts`

**Step 1: Write hook**

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import {
  HandLandmarker,
  FilesetResolver,
  type HandLandmarkerResult,
} from "@mediapipe/tasks-vision";

export interface HandState {
  x: number; // 0..1 normalized x of palm center
  y: number; // 0..1 normalized y
  isFist: boolean;
}

export function useHandTracking(enabled: boolean) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hand, setHand] = useState<HandState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let landmarker: HandLandmarker | null = null;
    let rafId: number;
    let stream: MediaStream | null = null;
    let stopped = false;

    async function setup() {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );
        landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
          },
          runningMode: "VIDEO",
          numHands: 1,
        });

        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240 },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        const tick = () => {
          if (stopped || !landmarker || !videoRef.current) return;
          const now = performance.now();
          const result = landmarker.detectForVideo(videoRef.current, now);
          const landmarks = result.landmarks[0];
          if (landmarks) {
            // Palm center = landmark 9 (middle MCP)
            const palm = landmarks[9];
            // Fist detection: fingertips (8,12,16,20) close to palm (0)
            const wrist = landmarks[0];
            const tips = [8, 12, 16, 20].map((i) => landmarks[i]);
            const avgDist =
              tips.reduce(
                (sum, t) =>
                  sum +
                  Math.hypot(t.x - wrist.x, t.y - wrist.y),
                0
              ) / tips.length;
            const isFist = avgDist < 0.15;
            setHand({ x: 1 - palm.x, y: palm.y, isFist }); // mirror x
          } else {
            setHand(null);
          }
          rafId = requestAnimationFrame(tick);
        };
        tick();
      } catch (e) {
        setError(String(e));
      }
    }

    setup();

    return () => {
      stopped = true;
      cancelAnimationFrame(rafId);
      landmarker?.close();
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [enabled]);

  return { hand, error, videoRef };
}
```

**Step 2: Commit (no test for this one — integration test via running the app)**

```bash
git add components/useHandTracking.ts
git commit -m "feat: add MediaPipe hand tracking hook"
```

---

### Task 11: Wire hand tracking into ChinaMap

**Files:**
- Modify: `components/ChinaMap.tsx`

**Step 1: Read current ChinaMap**

Run: `cat components/ChinaMap.tsx`

**Step 2: Add gesture state, camera preview, prompt integration**

Around existing map:
- Add `<MapGesturePrompt>` overlay
- When allowed: mount `useHandTracking(true)`, show video preview in corner, map hand.x/y to hovered city, fist triggers that city's gallery
- When denied: existing mouse behavior (unchanged)
- Also implement particle effects on city hover (see Task 12)

Pseudocode:
```tsx
const [gestureMode, setGestureMode] = useState<"none" | "camera" | "mouse">("none");
const { hand, videoRef } = useHandTracking(gestureMode === "camera");

useEffect(() => {
  if (!hand || gestureMode !== "camera") return;
  // Map hand.x/y (0..1) to map coordinates
  const mapEl = mapRef.current;
  if (!mapEl) return;
  const rect = mapEl.getBoundingClientRect();
  const mapX = rect.left + hand.x * rect.width;
  const mapY = rect.top + hand.y * rect.height;
  // Find nearest city to (mapX, mapY), set as hovered
  const nearestCity = findNearest(cities, mapX, mapY);
  setHoveredCity(nearestCity);

  if (hand.isFist && !galleryOpen) {
    setSelectedCity(nearestCity);
    setGalleryOpen(true);
  } else if (!hand.isFist && galleryOpen) {
    setGalleryOpen(false);
  }
}, [hand, gestureMode]);
```

Preview video:
```tsx
{gestureMode === "camera" && (
  <div className="absolute top-4 left-4 z-10 w-48 aspect-video border border-line rounded-sm overflow-hidden">
    <video ref={videoRef} className="w-full h-full object-cover" style={{ transform: "scaleX(-1)" }} muted />
    {hand && (
      <div
        className="absolute w-6 h-6 border-2 border-accent rounded-full pointer-events-none"
        style={{
          left: `${hand.x * 100}%`,
          top: `${hand.y * 100}%`,
          transform: "translate(-50%, -50%)",
        }}
      />
    )}
  </div>
)}
```

**Step 3: Test**

Run: `npm run dev`
- Go to map section → prompt appears
- Click "允许" → browser asks for camera → see video preview + hand tracking dot
- Move hand → cities light up → make fist → gallery opens
- Click "用鼠标就行" → fallback to mouse hover + click

**Step 4: Commit**

```bash
git add components/ChinaMap.tsx
git commit -m "feat: add MediaPipe hand gesture mode to ChinaMap"
```

---

### Task 12: Particle effect on city hover (shared by both modes)

**Files:**
- Modify: `components/ChinaMap.tsx`

**Step 1: Add particle system**

When a city is hovered (by mouse or hand), spawn 20-30 particles that radiate outward from the city, then fade. Use CSS animations for simplicity (not Three.js — ChinaMap is currently SVG-based).

Add a particle burst div per city:
```tsx
{hoveredCity === city.name && (
  <div className="absolute inset-0 pointer-events-none">
    {Array.from({ length: 24 }).map((_, i) => (
      <span
        key={i}
        className="absolute block w-1 h-1 bg-accent rounded-full"
        style={{
          left: city.x,
          top: city.y,
          animation: `particle-burst 0.8s ease-out forwards`,
          animationDelay: `${i * 10}ms`,
          transform: `rotate(${(i * 360) / 24}deg) translateY(-40px)`,
        }}
      />
    ))}
  </div>
)}
```

Add to `app/globals.css`:
```css
@keyframes particle-burst {
  0% { opacity: 1; transform: rotate(var(--r)) translateY(0); }
  100% { opacity: 0; transform: rotate(var(--r)) translateY(-40px); }
}
```

**Step 2: Commit**

```bash
git add components/ChinaMap.tsx app/globals.css
git commit -m "feat: add particle burst on city hover"
```

---

## Phase 4: MIMO-style bilingual labels

### Task 13: Add English sub-labels to section titles

**Files:**
- Modify: `components/Beliefs.tsx`
- Modify: `components/Thoughts.tsx`
- Modify: `components/SystemCard.tsx`
- Modify: `components/Timeline.tsx`
- Modify: `components/ChinaMap.tsx`
- Modify: `components/RecentThinking.tsx`

**Step 1: Update each section title**

For each file, update the `<h2>` from:
```tsx
<h2 className="...">我做过什么</h2>
```
to:
```tsx
<h2 className="...">思想 / BELIEFS</h2>
```

Map:
- Beliefs → `思想 / BELIEFS`
- Thoughts → `思考 / THOUGHTS`
- SystemCard → `系统 / SYSTEM`
- Timeline → `生长 / TIMELINE`
- ChinaMap → `足迹 / FOOTPRINTS`
- RecentThinking → `近期思考 / RECENT`

**Step 2: Build check**

Run: `npm run build`
Expected: Succeeds.

**Step 3: Commit**

```bash
git add -A
git commit -m "style: add bilingual English sub-labels to section titles"
```

---

## Phase 5: Final polish & deploy

### Task 14: Full manual test + build

**Step 1: Run all tests**

Run: `npx vitest run`
Expected: All existing + new tests pass.

**Step 2: Production build**

Run: `npm run build`
Expected: No errors, no warnings.

**Step 3: Manual checklist**

- [ ] Hero renders 3 lines normally
- [ ] Dragging 🔦 over Hero reveals dark circles showing big 你想要 text
- [ ] Full coverage → big text shows for 3s → fades → 🔦 hides
- [ ] Experience section shows 4 numbered cards
- [ ] Clicking each card opens fullscreen detail from right
- [ ] ESC / back button / ←→ keys work in detail
- [ ] 02 detail shows 4 camp screenshots
- [ ] 04 detail shows 3 works cards at bottom; clicking goes to Footer apply
- [ ] Footer apply has QR code visible, anchors to `#apply`
- [ ] China map prompts for camera
- [ ] Allow → video preview + hand tracking → fist opens city
- [ ] Deny → mouse hover works + particles fire
- [ ] All other sections unchanged
- [ ] No console errors

**Step 4: Commit and push**

```bash
git add -A
git commit -m "feat: V3 complete — flashlight hero, fullscreen projects, gesture map"
git push origin feat/v3-features
```

---

## Phase 6 (Optional/V3.1): Section easter eggs

Deferred per user — decide later which sections get flashlight reveals (Beliefs/Timeline candidate copy in design doc).
