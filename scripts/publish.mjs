import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { CANDIDATES_OUTPUT_DIR, SITE_ROOT } from "./config.mjs";

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
