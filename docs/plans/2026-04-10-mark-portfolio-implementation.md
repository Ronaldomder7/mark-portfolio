# Mark Portfolio Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a living personal website that auto-syncs "latest thoughts" from Mark's Obsidian/flomo, with 5 content layers, static core content, and a local sync pipeline.

**Architecture:** Next.js 14 (App Router) + Tailwind CSS static site, JSON-driven content layer, Node.js local scripts to scan Obsidian/flomo and publish curated snippets. No CMS, no database, no backend — everything in git, deployed to Vercel.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, Node.js, Vitest (tests for scripts), Noto Serif SC + Noto Sans SC fonts, Git + GitHub + Vercel.

**Design doc:** [`2026-04-10-mark-portfolio-design.md`](./2026-04-10-mark-portfolio-design.md)

---

## Phase 1 · Project Scaffolding

### Task 1: Scaffold Next.js project

**Files:**
- Create: `~/Code/mark-portfolio/package.json` (and everything Next.js init creates)

**Step 1: Run Next.js CLI**

```bash
cd ~/Code/mark-portfolio
# Scaffold directly into current directory (. = here)
npx create-next-app@latest . \
  --typescript \
  --tailwind \
  --app \
  --no-src-dir \
  --no-eslint \
  --import-alias "@/*" \
  --use-npm
```

When prompted about Turbopack, press Enter (accept default).

**Step 2: Verify**

```bash
ls app/ && cat package.json | grep next
```
Expected: see `page.tsx`, `layout.tsx`, Next.js dep present.

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js project with TypeScript and Tailwind"
```

---

### Task 2: Configure Tailwind tokens (colors, fonts, spacing)

**Files:**
- Modify: `tailwind.config.ts`
- Modify: `app/globals.css`

**Step 1: Replace tailwind.config.ts**

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#FAFAF8",
        ink: "#1A1A1A",
        muted: "#888888",
        accent: "#8B2E2E",
        line: "#E8E6E1",
      },
      fontFamily: {
        serif: ["var(--font-serif)", "serif"],
        sans: ["var(--font-sans)", "sans-serif"],
      },
      maxWidth: {
        prose: "720px",
      },
    },
  },
  plugins: [],
};
export default config;
```

**Step 2: Replace app/globals.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html, body {
  background-color: #FAFAF8;
  color: #1A1A1A;
  font-family: var(--font-serif), serif;
  font-feature-settings: "palt";
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

::selection {
  background-color: #8B2E2E;
  color: #FAFAF8;
}

/* Fade-in on scroll utility */
.fade-in {
  opacity: 0;
  transform: translateY(12px);
  transition: opacity 0.8s ease-out, transform 0.8s ease-out;
}
.fade-in.visible {
  opacity: 1;
  transform: translateY(0);
}
```

**Step 3: Commit**

```bash
git add tailwind.config.ts app/globals.css
git commit -m "feat: configure design tokens (colors, fonts, spacing)"
```

---

### Task 3: Set up layout.tsx with Google fonts

**Files:**
- Modify: `app/layout.tsx`

**Step 1: Replace layout.tsx**

```typescript
import type { Metadata } from "next";
import { Noto_Serif_SC, Noto_Sans_SC } from "next/font/google";
import "./globals.css";

const serif = Noto_Serif_SC({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-serif",
  display: "swap",
});

const sans = Noto_Sans_SC({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "马泽闰 Mark",
  description: "人不能活一辈子。最后只有两个字——严父，或者慈母。",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className={`${serif.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

**Step 2: Commit**

```bash
git add app/layout.tsx
git commit -m "feat: wire up Noto Serif SC + Noto Sans SC fonts"
```

---

## Phase 2 · Content Data Layer

### Task 4: Define TypeScript types for content

**Files:**
- Create: `lib/types.ts`

**Step 1: Create file**

```typescript
// lib/types.ts
export interface Hook {
  lines: string[];
}

export interface Belief {
  text: string;
}

export interface TimelineNode {
  date: string;
  text: string;
}

export interface ThoughtPiece {
  title: string;
  body: string;
}

export interface DataMetric {
  value: string;
  label: string;
}

export interface Work {
  title: string;
  metric: string;
  thumbnail?: string;
  requestUrl?: string;
}

export interface KnowledgeSystem {
  stats: string[];
  tagline: string;
}

export interface StaticContent {
  hook: Hook;
  beliefs: Belief[];
  timeline: TimelineNode[];
  thoughtPieces: ThoughtPiece[];
  dataMetrics: DataMetric[];
  works: Work[];
  knowledgeSystem: KnowledgeSystem;
  footer: { quote: string; contact: { wechat: string; email: string } };
}

export interface RecentThought {
  date: string; // YYYY-MM-DD
  source: string; // flomo / 日志 / 成长教练 etc.
  text: string;
}

export interface RecentContent {
  updatedAt: string;
  items: RecentThought[];
}
```

**Step 2: Commit**

```bash
git add lib/types.ts
git commit -m "feat: add content type definitions"
```

---

### Task 5: Create static.json with all locked content

**Files:**
- Create: `content/static.json`

**Step 1: Create file**

```json
{
  "hook": {
    "lines": [
      "人不能活一辈子。",
      "最后只有两个字——",
      "严父，或者慈母。"
    ]
  },
  "beliefs": [
    { "text": "贩卖信息是贬值资产，贩卖视角是升值资产。" },
    { "text": "框架是梯子，不是牢笼。" }
  ],
  "timeline": [
    { "date": "2024.8", "text": "一个月，抖音 0 → 2 万粉" },
    { "date": "2024.11", "text": "第一次系统化地梳理自己的人生" },
    { "date": "2025", "text": "北京，开始做 AI + 内容的事" },
    { "date": "2026", "text": "此刻，在这里" }
  ],
  "thoughtPieces": [
    {
      "title": "我为什么要建知识系统",
      "body": "建立知识管理系统不只是 GTD 工具，它是我应对\"失去\"的方式。意识到人会消失 → 用复盘和记录对抗遗忘。所以我的 Obsidian 不是为了 productivity，而是为了\"被完整记住\"。这也是为什么我一次次重构系统——不是系统本身，是背后对遗忘的恐惧。"
    },
    {
      "title": "AI 时代我的能力本质",
      "body": "在思考一个根本问题：我现在的所有优势——故事型营销、视频剪辑、选题敏感度、系统化能力——到底有多少来自 AI 的放大，有多少是我自己的？\"有自己产品的人被 AI 取代门槛低\"，这句话击中我了。我在做的 AI 真探马克，算不算在建自己的\"产品 + 实操路径\"？还是又是一个追热点的账号？这个问题我得想透。"
    }
  ],
  "dataMetrics": [
    { "value": "16,384", "label": "月成交订单（2026.02）" },
    { "value": "100 万+", "label": "月 GMV" },
    { "value": "5,248", "label": "单条最高出单" },
    { "value": "303 万", "label": "累计广告预算" }
  ],
  "works": [
    {
      "title": "代表作品 · 01",
      "metric": "出单 5,248 · ROI 0.16",
      "requestUrl": "mailto:751661335@qq.com?subject=想看你的代表作品"
    },
    {
      "title": "代表作品 · 02",
      "metric": "出单 536 · ROI 0.36",
      "requestUrl": "mailto:751661335@qq.com?subject=想看你的代表作品"
    },
    {
      "title": "代表作品 · 03",
      "metric": "单月产出 114 条",
      "requestUrl": "mailto:751661335@qq.com?subject=想看你的代表作品"
    }
  ],
  "knowledgeSystem": {
    "stats": [
      "2,338 篇 Obsidian 笔记",
      "308 层目录",
      "13 个自定义 AI Skill"
    ],
    "tagline": "这不是我的简历，是我的思考操作系统。"
  },
  "footer": {
    "quote": "我缺的不是技能，是让独特性被看见的放大器。",
    "contact": {
      "wechat": "ASI_Mark",
      "email": "751661335@qq.com"
    }
  }
}
```

**Step 2: Commit**

```bash
git add content/static.json
git commit -m "feat: add static content (hook, beliefs, timeline, thoughts, works)"
```

---

### Task 6: Create recent.json with initial seed

**Files:**
- Create: `content/recent.json`

**Step 1: Create file**

```json
{
  "updatedAt": "2026-04-10",
  "items": [
    {
      "date": "2026-04-07",
      "source": "flomo",
      "text": "在跟 AI 交互的 gap 时间，我应该做点什么呢？不是填满所有时间，而是这段时间本来就有，怎么用更高效。"
    },
    {
      "date": "2026-04-07",
      "source": "flomo",
      "text": "为什么现在才对 OpenClaw 进行评价？因为我觉得没有使用就没有发言权。我现在已经不看大多数的 AI 博主了，因为他们有些说的话都是甲方让他们说的话。"
    },
    {
      "date": "2026-03-28",
      "source": "成长教练",
      "text": "选题灵感：做 CLI 科普——从是什么，到能干嘛，到怎么用。倒逼自己研究一下这玩意。"
    },
    {
      "date": "2026-03-24",
      "source": "flomo",
      "text": "越会盲目使用 AI 会让你越来越平庸。你越会用 AI 你就会越来越忙。不断试错、找到\"不要做\"的那件事情，会变得越来越重要。"
    }
  ]
}
```

**Step 2: Commit**

```bash
git add content/recent.json
git commit -m "feat: seed recent thoughts with initial 4 items"
```

---

## Phase 3 · UI Components (5 Layers)

### Task 7: Hero component (Layer 1)

**Files:**
- Create: `components/Hero.tsx`

**Step 1: Create file**

```typescript
import staticContent from "@/content/static.json";
import type { StaticContent } from "@/lib/types";

const content = staticContent as StaticContent;

export default function Hero() {
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
            {line}
          </p>
        ))}
      </div>

      <div className="mt-24 text-sm font-sans text-muted tracking-widest">
        马泽闰 Mark · 2026
      </div>

      <a
        href="#works"
        aria-label="向下探索"
        className="mt-16 text-muted hover:text-ink transition-colors"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M12 5v14M5 12l7 7 7-7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </a>
    </section>
  );
}
```

**Step 2: Commit**

```bash
git add components/Hero.tsx
git commit -m "feat: add Hero component (Layer 1)"
```

---

### Task 8: Nav component (sticky top)

**Files:**
- Create: `components/Nav.tsx`

**Step 1: Create file**

```typescript
const NAV_ITEMS = [
  { href: "#hero", label: "门面" },
  { href: "#works", label: "作品" },
  { href: "#mind", label: "思想" },
  { href: "#timeline", label: "底色" },
  { href: "#recent", label: "生长" },
];

export default function Nav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-sm bg-bg/70 border-b border-line">
      <div className="max-w-prose mx-auto px-6 py-4 flex justify-center gap-8 text-sm font-sans text-muted">
        {NAV_ITEMS.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="hover:text-ink transition-colors tracking-widest"
          >
            {item.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
```

**Step 2: Commit**

```bash
git add components/Nav.tsx
git commit -m "feat: add Nav (sticky top with 5 anchors)"
```

---

### Task 9: Works component (Layer 2)

**Files:**
- Create: `components/Works.tsx`

**Step 1: Create file**

```typescript
import staticContent from "@/content/static.json";
import type { StaticContent } from "@/lib/types";

const content = staticContent as StaticContent;

export default function Works() {
  return (
    <section id="works" className="py-32 px-6">
      <div className="max-w-prose mx-auto">
        <h2 className="font-sans text-xs text-muted tracking-widest uppercase mb-4">
          我做过什么
        </h2>
        <p className="font-serif text-lg text-ink mb-16 leading-relaxed">
          这一年，一个人 + AI + 3 个伙伴。
        </p>

        {/* 数据卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-20">
          {content.dataMetrics.map((m, i) => (
            <div key={i} className="text-center">
              <div className="font-serif text-3xl md:text-4xl text-ink font-medium">
                {m.value}
              </div>
              <div className="mt-2 font-sans text-xs text-muted tracking-wide">
                {m.label}
              </div>
            </div>
          ))}
        </div>

        {/* 代表作品 */}
        <div className="space-y-6">
          {content.works.map((w, i) => (
            <a
              key={i}
              href={w.requestUrl}
              className="block border-t border-line pt-6 group"
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
                  点击申请 →
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
```

**Step 2: Commit**

```bash
git add components/Works.tsx
git commit -m "feat: add Works component (Layer 2) with data cards + request-based portfolio"
```

---

### Task 10: Beliefs component (Layer 3 top)

**Files:**
- Create: `components/Beliefs.tsx`

**Step 1: Create file**

```typescript
import staticContent from "@/content/static.json";
import type { StaticContent } from "@/lib/types";

const content = staticContent as StaticContent;

export default function Beliefs() {
  return (
    <section className="py-32 px-6">
      <div className="max-w-prose mx-auto">
        <h2 className="font-sans text-xs text-muted tracking-widest uppercase mb-16 text-center">
          我相信什么
        </h2>
        <div className="space-y-20">
          {content.beliefs.map((b, i) => (
            <blockquote
              key={i}
              className="font-serif text-2xl md:text-3xl text-ink text-center leading-relaxed"
            >
              {b.text}
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}
```

**Step 2: Commit**

```bash
git add components/Beliefs.tsx
git commit -m "feat: add Beliefs component (Layer 3 top)"
```

---

### Task 11: Thoughts component (Layer 3 mid)

**Files:**
- Create: `components/Thoughts.tsx`

**Step 1: Create file**

```typescript
import staticContent from "@/content/static.json";
import type { StaticContent } from "@/lib/types";

const content = staticContent as StaticContent;

export default function Thoughts() {
  return (
    <section id="mind" className="py-32 px-6">
      <div className="max-w-prose mx-auto">
        <h2 className="font-sans text-xs text-muted tracking-widest uppercase mb-16 text-center">
          我怎么想事情
        </h2>
        <div className="space-y-20">
          {content.thoughtPieces.map((t, i) => (
            <article key={i}>
              <h3 className="font-serif text-xl text-ink mb-6">
                {t.title}
              </h3>
              <p className="font-serif text-base text-ink leading-loose">
                {t.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
```

**Step 2: Commit**

```bash
git add components/Thoughts.tsx
git commit -m "feat: add Thoughts component (Layer 3 mid)"
```

---

### Task 12: SystemCard component (Layer 3 bottom)

**Files:**
- Create: `components/SystemCard.tsx`

**Step 1: Create file**

```typescript
import staticContent from "@/content/static.json";
import type { StaticContent } from "@/lib/types";

const content = staticContent as StaticContent;

export default function SystemCard() {
  return (
    <section className="py-20 px-6">
      <div className="max-w-prose mx-auto border border-line rounded-sm p-10 text-center">
        <div className="flex flex-wrap justify-center gap-8 mb-6">
          {content.knowledgeSystem.stats.map((s, i) => (
            <div key={i} className="font-serif text-lg text-ink">
              {s}
            </div>
          ))}
        </div>
        <p className="font-sans text-sm text-muted tracking-wide">
          {content.knowledgeSystem.tagline}
        </p>
      </div>
    </section>
  );
}
```

**Step 2: Commit**

```bash
git add components/SystemCard.tsx
git commit -m "feat: add SystemCard (knowledge system evidence)"
```

---

### Task 13: Timeline component (Layer 4)

**Files:**
- Create: `components/Timeline.tsx`

**Step 1: Create file**

```typescript
import staticContent from "@/content/static.json";
import type { StaticContent } from "@/lib/types";

const content = staticContent as StaticContent;

export default function Timeline() {
  return (
    <section id="timeline" className="py-32 px-6">
      <div className="max-w-prose mx-auto">
        <h2 className="font-sans text-xs text-muted tracking-widest uppercase mb-4 text-center">
          塑造今天的我的四个节点
        </h2>
        <p className="font-serif text-sm text-muted mb-20 text-center">
          不是完整的履历
        </p>

        <ol className="space-y-16">
          {content.timeline.map((node, i) => (
            <li key={i} className="flex gap-8 md:gap-12">
              <div className="font-sans text-sm text-muted tracking-wide w-20 shrink-0 pt-1">
                {node.date}
              </div>
              <div className="font-serif text-lg md:text-xl text-ink leading-relaxed">
                {node.text}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
```

**Step 2: Commit**

```bash
git add components/Timeline.tsx
git commit -m "feat: add Timeline (Layer 4 · four nodes)"
```

---

### Task 14: RecentThinking component (Layer 5)

**Files:**
- Create: `components/RecentThinking.tsx`

**Step 1: Create file**

```typescript
import recentContent from "@/content/recent.json";
import type { RecentContent } from "@/lib/types";

const content = recentContent as RecentContent;

export default function RecentThinking() {
  return (
    <section id="recent" className="py-32 px-6">
      <div className="max-w-prose mx-auto">
        <h2 className="font-sans text-xs text-muted tracking-widest uppercase mb-4 text-center">
          最近在想
        </h2>
        <p className="font-serif text-sm text-muted mb-16 text-center">
          这个版本更新于 {content.updatedAt}
        </p>

        <ul className="space-y-12">
          {content.items.map((item, i) => (
            <li key={i} className="border-t border-line pt-6">
              <div className="font-sans text-xs text-muted tracking-wide mb-3">
                {item.date} · {item.source}
              </div>
              <p className="font-serif text-base text-ink leading-loose">
                {item.text}
              </p>
            </li>
          ))}
        </ul>

        <p className="mt-24 font-sans text-xs text-muted text-center tracking-wide">
          这个板块会持续更新。下次见面时，可能你会看到不一样的我。
        </p>
      </div>
    </section>
  );
}
```

**Step 2: Commit**

```bash
git add components/RecentThinking.tsx
git commit -m "feat: add RecentThinking (Layer 5 · dynamic)"
```

---

### Task 15: Footer component

**Files:**
- Create: `components/Footer.tsx`

**Step 1: Create file**

```typescript
import staticContent from "@/content/static.json";
import type { StaticContent } from "@/lib/types";

const content = staticContent as StaticContent;

export default function Footer() {
  return (
    <footer className="py-16 px-6 border-t border-line">
      <div className="max-w-prose mx-auto text-center space-y-8">
        <blockquote className="font-serif text-base text-ink italic">
          "{content.footer.quote}"
        </blockquote>
        <div className="font-sans text-xs text-muted space-x-6">
          <span>微信 · {content.footer.contact.wechat}</span>
          <span>·</span>
          <span>{content.footer.contact.email}</span>
        </div>
        <div className="font-sans text-[10px] text-muted tracking-widest">
          马泽闰 · 2026 · 最后更新 {new Date().toISOString().slice(0, 10)}
        </div>
      </div>
    </footer>
  );
}
```

**Step 2: Commit**

```bash
git add components/Footer.tsx
git commit -m "feat: add Footer"
```

---

### Task 16: Compose page.tsx

**Files:**
- Modify: `app/page.tsx`

**Step 1: Replace with composition**

```typescript
import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import Works from "@/components/Works";
import Beliefs from "@/components/Beliefs";
import Thoughts from "@/components/Thoughts";
import SystemCard from "@/components/SystemCard";
import Timeline from "@/components/Timeline";
import RecentThinking from "@/components/RecentThinking";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main>
      <Nav />
      <Hero />
      <Works />
      <Beliefs />
      <Thoughts />
      <SystemCard />
      <Timeline />
      <RecentThinking />
      <Footer />
    </main>
  );
}
```

**Step 2: Local dev test**

```bash
npm run dev
```
Open http://localhost:3000, verify all 5 layers render. Press Ctrl+C to stop.

**Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat: compose all 5 layers into homepage"
```

---

## Phase 4 · Sync Scripts (TDD)

### Task 17: Install Vitest for script testing

**Files:**
- Modify: `package.json`

**Step 1: Install**

```bash
npm install --save-dev vitest
```

**Step 2: Add scripts to package.json**

Edit `package.json` scripts section to add:
```json
"test": "vitest run",
"test:watch": "vitest"
```

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add vitest for script testing"
```

---

### Task 18: Create scripts/config.js

**Files:**
- Create: `scripts/config.js`

**Step 1: Create file**

```javascript
// scripts/config.js
// 所有路径、过滤规则、时间窗口都在这里配置

export const OBSIDIAN_ROOT =
  "/Users/mark/Obsidian/Obsidian/AI与知识管理体系";

export const SCAN_SOURCES = [
  {
    name: "flomo",
    path: `${OBSIDIAN_ROOT}/25岁的马克的人生地图/每日发现日志/flomo`,
    strategy: "fullFile",
  },
  {
    name: "daily-log",
    path: `${OBSIDIAN_ROOT}/25岁的马克的人生地图/每日发现日志/2026`,
    strategy: "fullFile",
  },
  {
    name: "coach",
    path: `${OBSIDIAN_ROOT}/OpenClaw对话存档/成长教练`,
    strategy: "sections",
    sections: ["认知突破", "核心洞察", "元能力觉察", "思维纹理"],
  },
  {
    name: "content-engine",
    path: `${OBSIDIAN_ROOT}/OpenClaw对话存档/内容引擎专家`,
    strategy: "sections",
    sections: ["核心洞察", "对马克"],
  },
  {
    name: "claude-archive",
    path: `${OBSIDIAN_ROOT}/Claude对话存档`,
    strategy: "whitelist-then-sections",
    filenameWhitelist: [
      "规划", "复盘", "反思", "思考", "成长", "教练",
      "选题", "策划", "拆素材", "搭框架", "找故事",
      "萃取", "洞察", "口播", "脚本", "文章", "稿件", "稿子",
      "小红书", "公众号", "视频号", "AI真探马克", "自媒体",
    ],
    filenameBlacklist: [
      "日常产出", "批量", "产出_0", "续接", "迭代", "文案缝合",
      "提示词", "Skill", "搭建", "配置", "调试", "工具", "API",
    ],
    sections: ["认知突破", "核心洞察", "思维纹理", "马克的"],
  },
];

export const BANNED_KEYWORDS = [
  // a 家人
  "爷爷", "奶奶", "爸妈", "妈妈", "爸爸", "父亲", "母亲", "家里",
  // b 感情
  "实习生", "暧昧", "前女友", "孤独", "想她", "分手", "喜欢她",
  // c 公司 / 老板 / 同事
  "洋哥", "老板", "林杰", "杰哥", "猫哥", "腾云猫", "公司", "离职",
  // d 健康
  "抑郁", "压抑", "崩溃", "哭", "补牙", "医保",
  // e 金钱
  "工资", "薪资", "存款", "提成", "底薪",
  // f 朋友圈人名
  "潘达", "裕鑫", "皮特", "超哥", "卡总",
];

export const TIME_WINDOW_DAYS = 30;

export const CANDIDATES_OUTPUT_DIR =
  `${OBSIDIAN_ROOT}/25岁的马克的人生地图/网站候选`;

export const SITE_ROOT = "/Users/mark/Code/mark-portfolio";
```

**Step 2: Commit**

```bash
git add scripts/config.js
git commit -m "feat: sync script config (paths, banned keywords, whitelist)"
```

---

### Task 19: Test-first — banned keyword filter

**Files:**
- Create: `scripts/filter.js`
- Create: `scripts/filter.test.js`

**Step 1: Write failing test**

```javascript
// scripts/filter.test.js
import { describe, it, expect } from "vitest";
import { containsBannedKeyword, filterByBannedKeywords } from "./filter.js";

describe("containsBannedKeyword", () => {
  it("returns true when text contains banned keyword", () => {
    expect(containsBannedKeyword("今天和爷爷聊天", ["爷爷"])).toBe(true);
  });

  it("returns false when text is clean", () => {
    expect(containsBannedKeyword("在思考 AI 和内容", ["爷爷"])).toBe(false);
  });

  it("is case-insensitive for English but exact for Chinese", () => {
    expect(containsBannedKeyword("Like Mama", ["mama"])).toBe(true);
  });
});

describe("filterByBannedKeywords", () => {
  it("filters out candidates containing any banned keyword", () => {
    const input = [
      { text: "AI 工作流设计" },
      { text: "今天老板说了什么" },
      { text: "为什么我要建系统" },
    ];
    const result = filterByBannedKeywords(input, ["老板"]);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.text)).toEqual([
      "AI 工作流设计",
      "为什么我要建系统",
    ]);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- filter.test.js
```
Expected: FAIL with "Cannot find module ./filter.js"

**Step 3: Implement**

```javascript
// scripts/filter.js
export function containsBannedKeyword(text, bannedKeywords) {
  const lowerText = text.toLowerCase();
  return bannedKeywords.some((kw) => lowerText.includes(kw.toLowerCase()));
}

export function filterByBannedKeywords(candidates, bannedKeywords) {
  return candidates.filter(
    (c) => !containsBannedKeyword(c.text, bannedKeywords)
  );
}
```

**Step 4: Run test to verify pass**

```bash
npm test -- filter.test.js
```
Expected: PASS 4/4

**Step 5: Commit**

```bash
git add scripts/filter.js scripts/filter.test.js
git commit -m "feat(scan): banned keyword filter (TDD)"
```

---

### Task 20: Test-first — time window filter

**Files:**
- Create: `scripts/timeWindow.js`
- Create: `scripts/timeWindow.test.js`

**Step 1: Write failing test**

```javascript
// scripts/timeWindow.test.js
import { describe, it, expect } from "vitest";
import { withinDays, filterByTimeWindow } from "./timeWindow.js";

describe("withinDays", () => {
  it("returns true when date is within N days from now", () => {
    const recent = new Date();
    recent.setDate(recent.getDate() - 5);
    expect(withinDays(recent.toISOString().slice(0, 10), 30)).toBe(true);
  });

  it("returns false when date is outside window", () => {
    const old = new Date();
    old.setDate(old.getDate() - 60);
    expect(withinDays(old.toISOString().slice(0, 10), 30)).toBe(false);
  });
});

describe("filterByTimeWindow", () => {
  it("keeps only candidates with date within window", () => {
    const today = new Date().toISOString().slice(0, 10);
    const old = new Date();
    old.setDate(old.getDate() - 100);
    const oldStr = old.toISOString().slice(0, 10);

    const input = [
      { date: today, text: "new" },
      { date: oldStr, text: "old" },
    ];
    const result = filterByTimeWindow(input, 30);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe("new");
  });
});
```

**Step 2: Run test — expect FAIL**

```bash
npm test -- timeWindow.test.js
```

**Step 3: Implement**

```javascript
// scripts/timeWindow.js
export function withinDays(dateStr, days) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= days;
}

export function filterByTimeWindow(candidates, days) {
  return candidates.filter((c) => withinDays(c.date, days));
}
```

**Step 4: Run tests — expect PASS**

```bash
npm test -- timeWindow.test.js
```

**Step 5: Commit**

```bash
git add scripts/timeWindow.js scripts/timeWindow.test.js
git commit -m "feat(scan): time window filter (TDD)"
```

---

### Task 21: Test-first — flomo file parser

**Files:**
- Create: `scripts/parsers/flomo.js`
- Create: `scripts/parsers/flomo.test.js`

**Step 1: Write failing test**

```javascript
// scripts/parsers/flomo.test.js
import { describe, it, expect } from "vitest";
import { parseFlomoFilename, parseFlomoContent } from "./flomo.js";

describe("parseFlomoFilename", () => {
  it("extracts YYYY-MM-DD from filename prefix", () => {
    const fn = "2026-02-16 我觉得人不能活一辈子，最后只有两个字.md";
    expect(parseFlomoFilename(fn)).toEqual({
      date: "2026-02-16",
      preview: "我觉得人不能活一辈子，最后只有两个字",
    });
  });

  it("returns null for filenames without date prefix", () => {
    expect(parseFlomoFilename("README.md")).toBeNull();
  });
});

describe("parseFlomoContent", () => {
  it("returns body trimmed", () => {
    expect(parseFlomoContent("  hello world  \n\n")).toBe("hello world");
  });
});
```

**Step 2: Run — expect FAIL**

```bash
npm test -- flomo.test.js
```

**Step 3: Implement**

```javascript
// scripts/parsers/flomo.js
export function parseFlomoFilename(filename) {
  const match = filename.match(/^(\d{4}-\d{2}-\d{2})\s+(.+?)(?:\s*\(\d+\))?\.md$/);
  if (!match) return null;
  return {
    date: match[1],
    preview: match[2].trim(),
  };
}

export function parseFlomoContent(content) {
  return content.trim();
}
```

**Step 4: Run — expect PASS**

```bash
npm test -- flomo.test.js
```

**Step 5: Commit**

```bash
git add scripts/parsers/flomo.js scripts/parsers/flomo.test.js
git commit -m "feat(scan): flomo parser (TDD)"
```

---

### Task 22: Test-first — section extractor (for 成长教练 / 内容引擎 / Claude对话存档)

**Files:**
- Create: `scripts/parsers/sections.js`
- Create: `scripts/parsers/sections.test.js`

**Step 1: Write failing test**

```javascript
// scripts/parsers/sections.test.js
import { describe, it, expect } from "vitest";
import { extractSections } from "./sections.js";

describe("extractSections", () => {
  it("extracts content under matching H2 headers", () => {
    const md = `
# Title

## 事件记录
今天做了什么

## 认知突破
这是一个洞察内容

## 核心洞察
另一个洞察
`;
    const result = extractSections(md, ["认知突破", "核心洞察"]);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      section: "认知突破",
      body: "这是一个洞察内容",
    });
    expect(result[1]).toEqual({
      section: "核心洞察",
      body: "另一个洞察",
    });
  });

  it("returns empty array when no matching sections", () => {
    const md = "## 事件记录\n内容";
    expect(extractSections(md, ["认知突破"])).toEqual([]);
  });

  it("matches H3 sections starting with keyword too (for ## 马克的...)", () => {
    const md = "## 马克的评估结论\n这是结论";
    const result = extractSections(md, ["马克的"]);
    expect(result).toHaveLength(1);
    expect(result[0].body).toBe("这是结论");
  });
});
```

**Step 2: Run — expect FAIL**

```bash
npm test -- sections.test.js
```

**Step 3: Implement**

```javascript
// scripts/parsers/sections.js
export function extractSections(markdown, sectionKeywords) {
  const lines = markdown.split("\n");
  const results = [];

  let currentSection = null;
  let currentBody = [];

  const flush = () => {
    if (currentSection) {
      const body = currentBody.join("\n").trim();
      if (body) {
        results.push({ section: currentSection, body });
      }
    }
    currentSection = null;
    currentBody = [];
  };

  for (const line of lines) {
    const h2Match = line.match(/^##\s+(.+?)\s*$/);
    if (h2Match) {
      flush();
      const title = h2Match[1];
      const matched = sectionKeywords.find((kw) => title.includes(kw));
      if (matched) {
        currentSection = title;
      }
      continue;
    }
    if (currentSection) {
      currentBody.push(line);
    }
  }
  flush();

  return results;
}
```

**Step 4: Run — expect PASS**

```bash
npm test -- sections.test.js
```

**Step 5: Commit**

```bash
git add scripts/parsers/sections.js scripts/parsers/sections.test.js
git commit -m "feat(scan): section extractor (TDD)"
```

---

### Task 23: Test-first — filename whitelist filter

**Files:**
- Create: `scripts/parsers/whitelist.js`
- Create: `scripts/parsers/whitelist.test.js`

**Step 1: Write failing test**

```javascript
// scripts/parsers/whitelist.test.js
import { describe, it, expect } from "vitest";
import { shouldScanFilename } from "./whitelist.js";

describe("shouldScanFilename", () => {
  const whitelist = ["规划", "复盘", "选题"];
  const blacklist = ["日常产出", "提示词", "配置"];

  it("returns true when name contains whitelist keyword", () => {
    expect(shouldScanFilename("20260310_人生规划对话.md", whitelist, blacklist)).toBe(true);
  });

  it("returns false when name contains blacklist keyword", () => {
    expect(shouldScanFilename("20260310_文案日常产出.md", whitelist, blacklist)).toBe(false);
  });

  it("blacklist takes precedence over whitelist", () => {
    expect(
      shouldScanFilename("20260310_选题_日常产出.md", whitelist, blacklist)
    ).toBe(false);
  });

  it("returns false when name matches neither", () => {
    expect(shouldScanFilename("20260310_random.md", whitelist, blacklist)).toBe(false);
  });
});
```

**Step 2: Run — expect FAIL**

```bash
npm test -- whitelist.test.js
```

**Step 3: Implement**

```javascript
// scripts/parsers/whitelist.js
export function shouldScanFilename(filename, whitelist, blacklist) {
  if (blacklist.some((kw) => filename.includes(kw))) return false;
  return whitelist.some((kw) => filename.includes(kw));
}
```

**Step 4: Run — expect PASS**

```bash
npm test -- whitelist.test.js
```

**Step 5: Commit**

```bash
git add scripts/parsers/whitelist.js scripts/parsers/whitelist.test.js
git commit -m "feat(scan): filename whitelist/blacklist (TDD)"
```

---

### Task 24: Main scan.js orchestration

**Files:**
- Create: `scripts/scan.js`

**Step 1: Create main scanner**

```javascript
// scripts/scan.js
import fs from "node:fs";
import path from "node:path";
import {
  SCAN_SOURCES,
  BANNED_KEYWORDS,
  TIME_WINDOW_DAYS,
  CANDIDATES_OUTPUT_DIR,
} from "./config.js";
import { filterByBannedKeywords } from "./filter.js";
import { filterByTimeWindow } from "./timeWindow.js";
import { parseFlomoFilename } from "./parsers/flomo.js";
import { extractSections } from "./parsers/sections.js";
import { shouldScanFilename } from "./parsers/whitelist.js";

function walkDir(dir, recurse = true) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory() && recurse) {
      files.push(...walkDir(p, recurse));
    } else if (e.isFile() && e.name.endsWith(".md")) {
      files.push(p);
    }
  }
  return files;
}

function dateFromFilename(filename) {
  // Match YYYY-MM-DD or YYYYMMDD prefix
  const m1 = filename.match(/(\d{4}-\d{2}-\d{2})/);
  if (m1) return m1[1];
  const m2 = filename.match(/(\d{4})(\d{2})(\d{2})/);
  if (m2) return `${m2[1]}-${m2[2]}-${m2[3]}`;
  return null;
}

function truncate(text, max = 200) {
  if (text.length <= max) return text;
  return text.slice(0, max).trim() + "…";
}

function scanFullFile(source) {
  const files = walkDir(source.path);
  return files
    .map((file) => {
      const date = dateFromFilename(path.basename(file));
      if (!date) return null;
      const content = fs.readFileSync(file, "utf-8").trim();
      if (!content) return null;
      return { date, source: source.name, text: truncate(content) };
    })
    .filter(Boolean);
}

function scanSections(source) {
  const files = walkDir(source.path);
  const results = [];
  for (const file of files) {
    const date = dateFromFilename(path.basename(file));
    if (!date) continue;
    const content = fs.readFileSync(file, "utf-8");
    const sections = extractSections(content, source.sections);
    for (const s of sections) {
      results.push({
        date,
        source: `${source.name} · ${s.section}`,
        text: truncate(s.body),
      });
    }
  }
  return results;
}

function scanWhitelistThenSections(source) {
  const files = walkDir(source.path);
  const results = [];
  for (const file of files) {
    const fn = path.basename(file);
    if (!shouldScanFilename(fn, source.filenameWhitelist, source.filenameBlacklist)) {
      continue;
    }
    const date = dateFromFilename(fn);
    if (!date) continue;
    const content = fs.readFileSync(file, "utf-8");
    const sections = extractSections(content, source.sections);
    for (const s of sections) {
      results.push({
        date,
        source: `${source.name} · ${s.section}`,
        text: truncate(s.body),
      });
    }
  }
  return results;
}

function main() {
  console.log("🔍 扫描开始...");
  let all = [];

  for (const source of SCAN_SOURCES) {
    console.log(`  → ${source.name}`);
    let items = [];
    if (source.strategy === "fullFile") items = scanFullFile(source);
    else if (source.strategy === "sections") items = scanSections(source);
    else if (source.strategy === "whitelist-then-sections")
      items = scanWhitelistThenSections(source);
    console.log(`    抓到 ${items.length} 条`);
    all.push(...items);
  }

  console.log(`\n合计 ${all.length} 条候选`);

  // 时间窗口过滤
  all = filterByTimeWindow(all, TIME_WINDOW_DAYS);
  console.log(`时间窗口过滤后 (${TIME_WINDOW_DAYS} 天): ${all.length} 条`);

  // 禁区词过滤
  all = filterByBannedKeywords(all, BANNED_KEYWORDS);
  console.log(`禁区词过滤后: ${all.length} 条`);

  // 排序（日期倒序）
  all.sort((a, b) => b.date.localeCompare(a.date));

  // 写入候选文件
  if (!fs.existsSync(CANDIDATES_OUTPUT_DIR)) {
    fs.mkdirSync(CANDIDATES_OUTPUT_DIR, { recursive: true });
  }
  const today = new Date().toISOString().slice(0, 10);
  const outputFile = path.join(CANDIDATES_OUTPUT_DIR, `网站候选_${today}.md`);

  const header = `# 网站候选 · ${today}

扫描完毕。请在想保留的前面打 [x]，不要的保持 [ ]。
完成后跑：\`npm run publish\`

---

`;
  const body = all
    .map(
      (c) => `- [ ] ${c.date} · ${c.source} · ${c.text.replace(/\n/g, " ")}`
    )
    .join("\n");

  fs.writeFileSync(outputFile, header + body);
  console.log(`\n✅ 候选文件已生成: ${outputFile}`);
}

main();
```

**Step 2: Dry run**

```bash
cd ~/Code/mark-portfolio && node scripts/scan.js
```
Expected: console output showing counts from each source, final candidates file path.

**Step 3: Verify file created**

```bash
ls "/Users/mark/Obsidian/Obsidian/AI与知识管理体系/25岁的马克的人生地图/网站候选/" | tail -1
```

**Step 4: Commit**

```bash
git add scripts/scan.js
git commit -m "feat(scan): main orchestration script"
```

---

### Task 25: publish.js

**Files:**
- Create: `scripts/publish.js`

**Step 1: Create file**

```javascript
// scripts/publish.js
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { CANDIDATES_OUTPUT_DIR, SITE_ROOT } from "./config.js";

function findLatestCandidateFile() {
  const files = fs
    .readdirSync(CANDIDATES_OUTPUT_DIR)
    .filter((f) => f.startsWith("网站候选_") && f.endsWith(".md"))
    .sort()
    .reverse();
  if (files.length === 0) {
    throw new Error("没有候选文件。请先运行 npm run sync");
  }
  return path.join(CANDIDATES_OUTPUT_DIR, files[0]);
}

function parseChecked(markdown) {
  const lines = markdown.split("\n");
  const items = [];
  for (const line of lines) {
    // 匹配 - [x] YYYY-MM-DD · source · text
    const m = line.match(/^- \[x\] (\d{4}-\d{2}-\d{2}) · (.+?) · (.+)$/);
    if (!m) continue;
    items.push({
      date: m[1],
      source: m[2].trim(),
      text: m[3].trim(),
    });
  }
  return items;
}

function main() {
  const candidateFile = findLatestCandidateFile();
  console.log(`📖 读取候选: ${candidateFile}`);

  const content = fs.readFileSync(candidateFile, "utf-8");
  const items = parseChecked(content);

  if (items.length === 0) {
    console.log("⚠️  没有勾选任何条目。退出。");
    process.exit(0);
  }

  console.log(`✅ 勾选了 ${items.length} 条`);

  const recentJson = {
    updatedAt: new Date().toISOString().slice(0, 10),
    items,
  };

  const recentPath = path.join(SITE_ROOT, "content/recent.json");
  fs.writeFileSync(recentPath, JSON.stringify(recentJson, null, 2) + "\n");
  console.log(`📝 已写入 ${recentPath}`);

  // Git commit & push
  console.log("🚀 Git commit + push...");
  try {
    execSync(`git -C "${SITE_ROOT}" add content/recent.json`, { stdio: "inherit" });
    execSync(
      `git -C "${SITE_ROOT}" commit -m "content: update recent thoughts (${recentJson.updatedAt})"`,
      { stdio: "inherit" }
    );
    execSync(`git -C "${SITE_ROOT}" push`, { stdio: "inherit" });
    console.log("\n✅ 发布完成。Vercel 会在 1-2 分钟内自动部署。");
  } catch (err) {
    console.error("⚠️  Git 操作失败，可能尚未配置远程仓库。内容已写入本地文件。");
  }
}

main();
```

**Step 2: Commit**

```bash
git add scripts/publish.js
git commit -m "feat(scan): publish script"
```

---

### Task 26: Wire up npm scripts

**Files:**
- Modify: `package.json`

**Step 1: Add scripts**

In `package.json`, ensure the scripts section contains:
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "vitest run",
    "sync": "node scripts/scan.js",
    "publish": "node scripts/publish.js"
  },
  "type": "module"
}
```

**Important:** Add `"type": "module"` at the root of package.json so the scripts/*.js files can use ES module `import`.

**Step 2: Verify sync works**

```bash
npm run sync
```

**Step 3: Commit**

```bash
git add package.json
git commit -m "chore: wire npm run sync + publish"
```

---

## Phase 5 · Deployment

### Task 27: Add photo + favicon

**Files:**
- Copy: `public/photo.jpg` from `/Users/mark/Obsidian/Obsidian/AI与知识管理体系/25岁的马克的人生地图/职业探索文件夹/2026/04-Bonjour投递/微信图片_20260401212057_617_456.jpg`

**Step 1: Copy**

```bash
cp "/Users/mark/Obsidian/Obsidian/AI与知识管理体系/25岁的马克的人生地图/职业探索文件夹/2026/04-Bonjour投递/微信图片_20260401212057_617_456.jpg" ~/Code/mark-portfolio/public/photo.jpg
```

**Step 2: Commit**

```bash
git add public/photo.jpg
git commit -m "chore: add profile photo"
```

---

### Task 28: Final local test

**Step 1: Run dev server**

```bash
npm run dev
```

**Step 2: Visual check**

Open http://localhost:3000. Verify:
- Hero shows the 3-line hook with proper line breaks
- Scroll down: works → beliefs → thoughts → system card → timeline → recent → footer
- Nav stays at top, all anchor links work
- Mobile view (resize browser to 375px width): everything readable
- Color scheme: warm white bg, black text, minimal red accents only on hover

**Step 3: Stop server** (Ctrl+C)

**Step 4: Production build test**

```bash
npm run build
```
Expected: build succeeds with no errors.

**Step 5: Commit if any tweaks were needed**

---

### Task 29: GitHub repo + Vercel deploy

**Step 1: Create GitHub repo**

```bash
cd ~/Code/mark-portfolio
gh repo create mark-portfolio --private --source=. --remote=origin --push
```

If `gh` not authed, the command will prompt — follow the browser auth flow.

**Step 2: Go to Vercel**

Manually in browser:
1. Visit https://vercel.com/new
2. Import the `mark-portfolio` GitHub repo
3. Accept all defaults
4. Click Deploy
5. Wait 2-3 minutes
6. Copy the assigned URL (e.g., `mark-portfolio-xxx.vercel.app`)

**Step 3: Verify live site**

Open the URL in browser. Check same things as Task 28.

**Step 4: Add URL to README**

Create `README.md`:

```markdown
# Mark Portfolio

个人数字门厅 · https://[YOUR_VERCEL_URL].vercel.app

## 日常维护

```bash
npm run sync      # 扫描 Obsidian/flomo，生成候选文件
# 在 Obsidian 打开候选文件，勾选要发布的内容
npm run publish   # 发布到网站
```

## 设计文档

详见 [`docs/plans/2026-04-10-mark-portfolio-design.md`](docs/plans/2026-04-10-mark-portfolio-design.md)
```

**Step 5: Commit + push**

```bash
git add README.md
git commit -m "docs: add README with deploy URL"
git push
```

---

## Done · Success Criteria

- [ ] `npm run dev` shows full site locally
- [ ] `npm run test` passes all unit tests (filter, timeWindow, parsers)
- [ ] `npm run sync` generates candidate file in Obsidian
- [ ] `npm run publish` parses checked items and updates recent.json + git push
- [ ] Banned keyword filter verified by sample run (privacy safe)
- [ ] Site deployed to Vercel, publicly accessible
- [ ] Mobile responsive (375px width)
- [ ] Hero, all 5 layers, nav, footer all visually clean

## Appendix · Running a Full Dry Loop

After deploy, run a full end-to-end loop to verify the sync pipeline:

1. `npm run sync` → check candidate file exists in Obsidian
2. Open the candidate file in Obsidian, manually check 2-3 items
3. Save the file
4. `npm run publish` → verify git push succeeds
5. Wait 2 minutes
6. Refresh the Vercel URL → verify "最近在想" section shows new items

If any step fails, fix and re-run before declaring V1 complete.
