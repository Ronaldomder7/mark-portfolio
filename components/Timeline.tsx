import staticContent from "@/content/static.json";
import type { StaticContent } from "@/lib/types";

const content = staticContent as StaticContent;

export default function Timeline() {
  return (
    <section id="timeline" className="py-32 px-6">
      <div className="max-w-prose mx-auto">
        <h2 className="font-sans text-xs text-muted tracking-widest uppercase mb-4 text-center">
          塑造今天的我的四个节点
        </h2>
        <p className="font-serif text-sm text-muted mb-20 text-center">
          不是完整的履历
        </p>

        <ol className="space-y-16">
          {content.timeline.map((node, i) => (
            <li key={i} className="flex gap-8 md:gap-12">
              <div className="font-sans text-sm text-muted tracking-wide w-20 shrink-0 pt-1">
                {node.date}
              </div>
              <div className="font-serif text-lg md:text-xl text-ink leading-relaxed">
                {node.text}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
