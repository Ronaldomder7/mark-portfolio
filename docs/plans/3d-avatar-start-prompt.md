执行 3D 太空服角色的实施计划。

## 计划文件

`docs/plans/2026-04-13-3d-avatar-design.md` — 完整的 14 个 Task 实施计划，从 Task 1 开始逐步执行。

## 项目背景

- 项目路径：`~/Code/mark-portfolio`
- 技术栈：Next.js 16 + React 19 + Tailwind v4 + TypeScript
- 目标：用 Blender Python 脚本建模一个 3D 卡通太空服角色（参考 `public/avatar-nobg.png`），导出 .glb，用 React Three Fiber 加载到网页，替代当前的 2D `AvatarCompanion` 组件
- 角色需要 5 个动画：idle、walk、wave、sit、sleep
- 跟随鼠标走动，点击触发聊天，滚动到不同页面区域有不同动作

## 关键文件

- 当前 2D 组件：`components/AvatarCompanion.tsx`（保留作为 fallback）
- 聊天包装器：`components/AvatarChat.tsx`（最终只需改一行 import）
- 角色参考图：`public/avatar-nobg.png`
- 页面入口：`app/page.tsx`

## 执行要求

- 按 Task 顺序执行，每个 Task 完成后 commit
- Task 3（Blender 建模）是核心，要高度还原 avatar-nobg.png 的太空服细节
- 每个阶段完成后暂停，截图/预览让我确认再继续
- Blender 没装，Task 1 先装
