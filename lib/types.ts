// lib/types.ts
export interface Hook {
  lines: string[];
}

export interface Belief {
  text: string;
}

export interface TimelineNode {
  date: string;
  text: string;
}

export interface ThoughtPiece {
  title: string;
  body: string;
}

export interface DataMetric {
  value: string;
  label: string;
}

export interface Work {
  title: string;
  metric: string;
  thumbnail?: string;
  requestUrl?: string;
}

export interface KnowledgeSystem {
  stats: string[];
  tagline: string;
}

export interface ExperienceWork {
  title: string;
  metric: string;
}

export interface ExperienceProject {
  num: string;
  period: string;
  title: string;
  titleEn: string;
  summary: string;
  highlights: string[];
  assets: string[];
  works?: ExperienceWork[];
}

export interface StaticContent {
  hook: Hook;
  beliefs: Belief[];
  timeline: TimelineNode[];
  thoughtPieces: ThoughtPiece[];
  dataMetrics: DataMetric[];
  works: Work[];
  experience: ExperienceProject[];
  knowledgeSystem: KnowledgeSystem;
  footer: { quote: string; contact: { wechat: string; email: string } };
}

export interface RecentThought {
  date: string;
  source: string;
  text: string;
}

export interface RecentContent {
  updatedAt: string;
  items: RecentThought[];
}
