"use client";

import { useState } from "react";

const FORMSPREE_ENDPOINT = "https://formspree.io/f/xaqlzalv";

export default function Guestbook() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");

    const form = e.currentTarget;
    const data = new FormData(form);

    try {
      const res = await fetch(FORMSPREE_ENDPOINT, {
        method: "POST",
        body: data,
        headers: { Accept: "application/json" },
      });
      if (res.ok) {
        setStatus("sent");
        form.reset();
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  return (
    <section id="guestbook" className="py-32 px-6">
      <div className="max-w-prose mx-auto">
        <h2 className="font-sans text-xs text-muted tracking-widest uppercase mb-4 text-center">
          留一句话 / GUESTBOOK
        </h2>
        <p className="font-serif text-sm text-muted mb-16 text-center">
          看完网站的你，想对我说什么
        </p>

        {status === "sent" ? (
          <div className="text-center py-12">
            <p className="font-serif text-lg text-ink mb-2">收到了</p>
            <p className="font-sans text-xs text-muted tracking-wide">谢谢你愿意停下来，留下一句话。</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="name"
                className="block font-sans text-xs text-muted tracking-widest mb-2"
              >
                你是谁
              </label>
              <input
                id="name"
                type="text"
                name="name"
                required
                placeholder="叫我什么都行"
                className="w-full bg-transparent border-b border-line py-3 font-serif text-base text-ink placeholder:text-muted/50 focus:outline-none focus:border-ink transition-colors"
              />
            </div>

            <div>
              <label
                htmlFor="message"
                className="block font-sans text-xs text-muted tracking-widest mb-2"
              >
                想说的话
              </label>
              <textarea
                id="message"
                name="message"
                required
                rows={5}
                placeholder="短短几行就好"
                className="w-full bg-transparent border-b border-line py-3 font-serif text-base text-ink leading-loose placeholder:text-muted/50 focus:outline-none focus:border-ink transition-colors resize-none"
              />
            </div>

            <div className="pt-4 flex items-center justify-between">
              <p className="font-sans text-xs text-muted tracking-wide">
                {status === "error" && "发送失败，稍后再试"}
                {status === "sending" && "正在发送..."}
                {status === "idle" && "只会发到马克的邮箱"}
              </p>
              <button
                type="submit"
                disabled={status === "sending"}
                className="font-sans text-xs text-ink tracking-widest uppercase border border-ink px-6 py-3 hover:bg-ink hover:text-bg transition-colors disabled:opacity-50"
              >
                寄出 →
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
