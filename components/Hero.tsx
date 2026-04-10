import staticContent from "@/content/static.json";
import type { StaticContent } from "@/lib/types";

const content = staticContent as StaticContent;

export default function Hero() {
  return (
    <section
      id="hero"
      className="min-h-screen flex flex-col justify-center items-center px-6 text-center"
    >
      <div className="space-y-3">
        {content.hook.lines.map((line, i) => (
          <p
            key={i}
            className="font-serif text-3xl md:text-5xl text-ink leading-relaxed tracking-wide"
          >
            {line}
          </p>
        ))}
      </div>

      <div className="mt-24 text-sm font-sans text-muted tracking-widest">
        马泽闰 Mark · 2026
      </div>

    </section>
  );
}
