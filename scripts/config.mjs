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
    strategy: "sections",
    sectionLevels: [2, 3],
    sections: [
      "今天的认知变化",
      "今天最重要的一件事",
      "一个待解决的问题",
      "灵感闪现",
      "今日思考",
      "每日金句",
    ],
  },
  {
    name: "coach",
    path: `${OBSIDIAN_ROOT}/OpenClaw对话存档/成长教练`,
    strategy: "sections",
    sectionLevels: [2],
    sections: [
      "教练观察",
      "元能力触发",
      "认知变化",
      "认知突破",
      "核心洞察",
    ],
  },
  {
    name: "claude-archive",
    path: `${OBSIDIAN_ROOT}/Claude对话存档`,
    strategy: "whitelist-then-sections",
    sectionLevels: [2, 3],
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
    sections: [
      "认知突破", "核心洞察", "思维纹理", "马克的",
      "今天的认知变化", "灵感闪现", "今日思考",
    ],
  },
];

export const BANNED_KEYWORDS = [
  // a 家人
  "爷爷", "奶奶", "爸妈", "妈妈", "爸爸", "父亲", "母亲", "家里", "家人",
  // b 感情
  "实习生", "暧昧", "前女友", "前任", "孤独", "想她", "分手", "喜欢她",
  "女朋友", "男朋友", "恋爱", "恋人", "约会", "表白",
  // c 公司 / 老板 / 同事
  "洋哥", "老板", "领导", "林杰", "杰哥", "猫哥", "腾云猫", "公司",
  "离职", "辞职", "签约", "MCN", "老大", "同事", "被吊", "吊了",
  "开会", "会议室", "跳槽", "面试",
  // d 健康
  "抑郁", "压抑", "崩溃", "哭", "补牙", "医保", "医院", "看牙",
  "根管", "牙疼", "生病", "药", "哮喘", "发烧", "吃药",
  // e 金钱
  "工资", "薪资", "存款", "提成", "底薪", "税", "房租", "水电",
  "月入", "月薪", "年薪", "五位数",
  // f 朋友圈人名
  "潘达", "裕鑫", "皮特", "超哥", "卡总", "继刚", "李继刚",
  "卡兹克",
  // g 其他敏感
  "报销", "补录",
];

export const TIME_WINDOW_DAYS = 30;

export const CANDIDATES_OUTPUT_DIR =
  `${OBSIDIAN_ROOT}/25岁的马克的人生地图/网站候选`;

export const SITE_ROOT = "/Users/mark/Code/mark-portfolio";
