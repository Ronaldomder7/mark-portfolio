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
