import staticContent from "@/content/static.json";
import type { StaticContent } from "@/lib/types";

const content = staticContent as StaticContent;

export default function Works() {
  return (
    <section id="works" className="py-32 px-6">
      <div className="max-w-prose mx-auto">
        <h2 className="font-sans text-xs text-muted tracking-widest uppercase mb-4">
          我做过什么
        </h2>
        <p className="font-serif text-lg text-ink mb-16 leading-relaxed">
          这一年，一个人 + AI + 3 个伙伴。
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-20">
          {content.dataMetrics.map((m, i) => (
            <div key={i} className="text-center">
              <div className="font-serif text-3xl md:text-4xl text-ink font-medium">
                {m.value}
              </div>
              <div className="mt-2 font-sans text-xs text-muted tracking-wide">
                {m.label}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-6">
          {content.works.map((w, i) => (
            <a
              key={i}
              href={w.requestUrl}
              className="block border-t border-line pt-6 group"
            >
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="font-serif text-lg text-ink group-hover:text-accent transition-colors">
                    {w.title}
                  </div>
                  <div className="font-sans text-xs text-muted mt-1 tracking-wide">
                    {w.metric}
                  </div>
                </div>
                <div className="font-sans text-xs text-muted group-hover:text-accent transition-colors">
                  点击申请 →
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
