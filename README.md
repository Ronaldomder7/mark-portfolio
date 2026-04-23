# Mark Portfolio

> 马泽闰（Mark）的个人数字门厅 · 线上：[asi-mark.cn](https://asi-mark.cn)

这不是一份简历，是我用代码搭的 live 版履历。代码就是内容，内容就是代码。

## 这是什么

访客打开 asi-mark.cn 之后会看到：

- 需要用鼠标"扫光"才能看到全文的 Hero
- 一个能直接对话的 AI 数字分身
- 一张粒子动画版的中国地图，标出我去过的城市
- 一段可以用摄像头手势互动的 3D 形象
- 一个留言板，最后留下一句话再走

## 核心特性

- **手电筒式 Hero** — 黑屏 + 鼠标光圈逐步揭示文字，90% 覆盖率后才完整显示（`components/Hero.tsx`）
- **AI 数字分身（AvatarChat）** — Cloudflare Worker 代理 DashScope qwen，带个性化 system prompt，把我的履历、思考方式、价值观喂进去，访客可以直接和"另一个我"对话（`components/AvatarChat.tsx` + `worker/chat-worker.js`）
- **粒子中国地图** — Three.js + react-globe.gl 渲染，支持拖拽（`components/ChinaParticleMap.tsx`）
- **3D Avatar 手势互动** — MediaPipe 手部追踪驱动的 3D 形象（`components/Avatar3D.tsx` + `components/useHandTracking.ts`）
- **Obsidian → Web 同步管线** — 自建 Node 脚本扫描 Obsidian vault，用 Markdown 复选框做发布灰度（`scripts/scan.mjs` + `scripts/publish.mjs`）

## 技术栈

| 层 | 选型 |
|----|------|
| Framework | Next.js 16 (App Router) · React 19 · TypeScript |
| 3D / 可视化 | Three.js · @react-three/fiber · @react-three/drei · react-globe.gl |
| 交互 / 动画 | Framer Motion · MediaPipe（手势识别） |
| 样式 | Tailwind CSS v4 |
| 后端 | Cloudflare Worker（AI 代理）· Formspree（留言） |
| 测试 | Vitest |
| 内容管线 | 自建 Node 脚本 |

## 为什么这样做

**1. 代码即内容。** 我的履历就是这个 repo，每一个 commit 都是我对"怎么表达自己"的一次思考。

**2. 不做 CMS，做管线。** 我已经有 Obsidian 作为知识大脑，不需要再搞一个 headless CMS。`npm run sync` 扫一遍 vault 生成当天候选文件，勾选 `[x]` 的条目由 `npm run publish` 发布到 `content/*.json`——比任何 CMS 都轻。

**3. AI 分身不是玩具。** 把我的思考方式、价值观、经历整理成 system prompt 喂给模型，访客遇到不想读的段落直接问它就行。这里也解决了一个具体工程问题：Cloudflare `workers.dev` 在中国被屏蔽，所以用了自定义域名 `chat.asi-mark.cn` 做代理。

## 本地开发

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # 生产构建
npm test        # 单测
```

## 内容发布

```bash
# 1. 扫描 Obsidian + flomo，生成当天候选清单
npm run sync

# 2. 在 Obsidian 打开 "网站候选/网站候选_YYYY-MM-DD.md"，勾选 [x] 想发布的条目

# 3. 发布到 content/*.json
npm run publish
```

## 文档

- [设计文档](docs/plans/2026-04-10-mark-portfolio-design.md)
- [实施计划](docs/plans/2026-04-10-mark-portfolio-implementation.md)
- [3D Avatar 设计](docs/plans/2026-04-13-3d-avatar-design.md)
- [V3 features 设计](docs/plans/2026-04-15-v3-features-design.md)
- [V3 features 计划](docs/plans/2026-04-15-v3-features-plan.md)

## 作者

马泽闰（Mark）· 内容、代码、设计全部自作 · [asi-mark.cn](https://asi-mark.cn)
