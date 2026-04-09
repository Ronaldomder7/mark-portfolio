# Mark Portfolio

马泽闰（Mark）的个人数字门厅。

## 日常维护

```bash
# 扫描 Obsidian + flomo，生成候选文件
npm run sync

# 在 Obsidian 打开 "网站候选/网站候选_YYYY-MM-DD.md"
# 勾选想发布的内容（[x]），保存

# 发布到网站
npm run publish
```

## 开发

```bash
npm run dev     # 本地预览
npm run build   # 生产构建
npm test        # 运行同步脚本单测
```

## 文档

- [设计文档](docs/plans/2026-04-10-mark-portfolio-design.md)
- [实施计划](docs/plans/2026-04-10-mark-portfolio-implementation.md)

## 留言板配置（一次性）

留言板使用 [Formspree](https://formspree.io/) 免费服务。首次配置：

1. 去 https://formspree.io/ 注册一个免费账号（用 GitHub 登录最快）
2. 创建一个新表单，复制它的 endpoint URL，形如 `https://formspree.io/f/xyzabcde`
3. 编辑 `components/Guestbook.tsx`，把 `FORMSPREE_ENDPOINT` 的值替换为你的真实 URL
4. 提交并推送，Vercel 会自动重新部署

免费版：每月 50 条留言，超过需升级。留言会直接发到你注册 Formspree 时用的邮箱。
