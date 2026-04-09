import fs from "node:fs";
import path from "node:path";
import {
  SCAN_SOURCES,
  BANNED_KEYWORDS,
  TIME_WINDOW_DAYS,
  CANDIDATES_OUTPUT_DIR,
} from "./config.mjs";
import { filterByBannedKeywords } from "./filter.mjs";
import { filterByTimeWindow } from "./timeWindow.mjs";
import { extractSections } from "./parsers/sections.mjs";
import { shouldScanFilename } from "./parsers/whitelist.mjs";
import { stripHtmlComments } from "./strip.mjs";
import { stripAIAnnotations } from "./stripAI.mjs";
import { isMeaningful } from "./meaningful.mjs";
import { parseFlomoBody } from "./parsers/flomoBody.mjs";

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
      const rawContent = fs.readFileSync(file, "utf-8");
      const parsed =
        source.name === "flomo" ? parseFlomoBody(rawContent) : rawContent;
      const content = stripAIAnnotations(stripHtmlComments(parsed));
      if (!content) return null;
      if (!isMeaningful(content)) return null;
      const limit = source.name === "flomo" ? 400 : 200;
      return { date, source: source.name, text: truncate(content, limit) };
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
    const sections = extractSections(content, source.sections, { levels: source.sectionLevels || [2] });
    for (const s of sections) {
      const cleaned = stripAIAnnotations(stripHtmlComments(s.body));
      if (!cleaned) continue;
      if (!isMeaningful(cleaned)) continue;
      results.push({
        date,
        source: `${source.name} · ${s.section}`,
        text: truncate(cleaned),
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
    const sections = extractSections(content, source.sections, { levels: source.sectionLevels || [2] });
    for (const s of sections) {
      const cleaned = stripAIAnnotations(stripHtmlComments(s.body));
      if (!cleaned) continue;
      if (!isMeaningful(cleaned)) continue;
      results.push({
        date,
        source: `${source.name} · ${s.section}`,
        text: truncate(cleaned),
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
    const before = items.length;
    const window =
      source.timeWindow === undefined ? TIME_WINDOW_DAYS : source.timeWindow;
    if (window !== null) {
      items = filterByTimeWindow(items, window);
    }
    console.log(
      `    抓到 ${before} 条 → 时间窗 ${window === null ? "∞" : window + "天"}: ${items.length} 条`
    );
    all.push(...items);
  }

  console.log(`\n合计 ${all.length} 条候选`);

  all = filterByBannedKeywords(all, BANNED_KEYWORDS);
  console.log(`禁区词过滤后: ${all.length} 条`);

  all.sort((a, b) => b.date.localeCompare(a.date));

  // Dedupe by first 50 chars of normalized text
  const seen = new Set();
  all = all.filter((item) => {
    const key = item.text.replace(/\s+/g, "").slice(0, 50);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  console.log(`去重后: ${all.length} 条`);

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
