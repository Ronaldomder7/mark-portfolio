// scripts/config.mjs
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
  "爷爷", "奶奶", "爸妈", "妈妈", "爸爸", "父亲", "母亲", "家里",
  "实习生", "暧昧", "前女友", "孤独", "想她", "分手", "喜欢她",
  "洋哥", "老板", "林杰", "杰哥", "猫哥", "腾云猫", "公司", "离职",
  "抑郁", "压抑", "崩溃", "哭", "补牙", "医保",
  "工资", "薪资", "存款", "提成", "底薪",
  "潘达", "裕鑫", "皮特", "超哥", "卡总",
];

export const TIME_WINDOW_DAYS = 30;

export const CANDIDATES_OUTPUT_DIR =
  `${OBSIDIAN_ROOT}/25岁的马克的人生地图/网站候选`;

export const SITE_ROOT = "/Users/mark/Code/mark-portfolio";
