import { describe, it, expect } from "vitest";
import { stripAIAnnotations } from "./stripAI.mjs";

describe("stripAIAnnotations", () => {
  it("removes single-line [教练观察] annotations", () => {
    const input = "我的思考\n\n[教练观察] 这是AI的观察\n- bullet\n- bullet\n\n另一段思考";
    const result = stripAIAnnotations(input);
    expect(result).toBe("我的思考\n\n另一段思考");
  });

  it("removes multi-line AI block with sub-bullets", () => {
    const input = `马克写的原话
[教练观察] 任务调整:
- 原计划: X
- 实际: Y
- 评价: Z

接下来马克写的`;
    const result = stripAIAnnotations(input);
    expect(result).toContain("马克写的原话");
    expect(result).toContain("接下来马克写的");
    expect(result).not.toContain("教练观察");
    expect(result).not.toContain("原计划");
  });

  it("removes P0/P1/P2 element triggers", () => {
    const input = "思考\n[P0 边界触发] 说明\n\n接下来";
    const result = stripAIAnnotations(input);
    expect(result).not.toContain("P0");
  });

  it("keeps regular content with brackets that are not AI markers", () => {
    const input = "我觉得 [重要] 的是这个";
    expect(stripAIAnnotations(input)).toBe("我觉得 [重要] 的是这个");
  });

  it("empty input returns empty", () => {
    expect(stripAIAnnotations("")).toBe("");
  });
});
