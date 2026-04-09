import staticContent from "@/content/static.json";
import type { StaticContent } from "@/lib/types";

const content = staticContent as StaticContent;

export default function SystemCard() {
  return (
    <section className="py-20 px-6">
      <div className="max-w-prose mx-auto border border-line rounded-sm p-10 text-center">
        <div className="flex flex-wrap justify-center gap-8 mb-6">
          {content.knowledgeSystem.stats.map((s, i) => (
            <div key={i} className="font-serif text-lg text-ink">
              {s}
            </div>
          ))}
        </div>
        <p className="font-sans text-sm text-muted tracking-wide">
          {content.knowledgeSystem.tagline}
        </p>
      </div>
    </section>
  );
}
