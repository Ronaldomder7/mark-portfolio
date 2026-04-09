import { describe, it, expect } from "vitest";
import { extractSections } from "./sections.mjs";

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
    const result = extractSections(md, ["认知突破", "核心洞察"], { levels: [2] });
    expect(result).toHaveLength(2);
    expect(result[0].section).toBe("认知突破");
    expect(result[0].body).toBe("这是一个洞察内容");
    expect(result[0].level).toBe(2);
    expect(result[1].section).toBe("核心洞察");
    expect(result[1].body).toBe("另一个洞察");
  });

  it("returns empty array when no matching sections", () => {
    const md = "## 事件记录\n内容";
    expect(extractSections(md, ["认知突破"], { levels: [2] })).toEqual([]);
  });

  it("matches H2 sections with keyword prefix (for ## 马克的...)", () => {
    const md = "## 马克的评估结论\n这是结论";
    const result = extractSections(md, ["马克的"], { levels: [2] });
    expect(result).toHaveLength(1);
    expect(result[0].body).toBe("这是结论");
  });

  it("extracts H3 sections when levels includes 3", () => {
    const md = `
## 晚间反思

### 今天的认知变化
我意识到 AI 不是万能的

### 今天最重要的一件事
完成了网站

### 其他
skip this
`;
    const result = extractSections(
      md,
      ["今天的认知变化", "今天最重要的一件事"],
      { levels: [3] }
    );
    expect(result).toHaveLength(2);
    expect(result[0].body).toBe("我意识到 AI 不是万能的");
    expect(result[1].body).toBe("完成了网站");
  });

  it("supports mixed H2 and H3 levels", () => {
    const md = `
## 💫 每日金句
今天的金句

## 晚间反思

### 今天的认知变化
新的认知
`;
    const result = extractSections(
      md,
      ["每日金句", "今天的认知变化"],
      { levels: [2, 3] }
    );
    expect(result).toHaveLength(2);
    expect(result.map(r => r.body)).toEqual(["今天的金句", "新的认知"]);
  });

  it("H3 section stops at next H2 (not at next H3 only)", () => {
    const md = `
### 今天的认知变化
我意识到
paragraph 2

## 下一章
other content
`;
    const result = extractSections(md, ["今天的认知变化"], { levels: [3] });
    expect(result).toHaveLength(1);
    expect(result[0].body).toBe("我意识到\nparagraph 2");
  });

  it("backward compat: default levels is [2]", () => {
    const md = "## title\ncontent";
    const result = extractSections(md, ["title"]);
    expect(result).toHaveLength(1);
  });
});
