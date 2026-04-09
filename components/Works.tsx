"use client";

import { useState } from "react";
import Image from "next/image";
import staticContent from "@/content/static.json";
import type { StaticContent } from "@/lib/types";

const content = staticContent as StaticContent;

export default function Works() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
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
              <button
                key={i}
                type="button"
                onClick={() => setModalOpen(true)}
                className="block w-full text-left border-t border-line pt-6 group cursor-pointer"
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
              </button>
            ))}
          </div>
        </div>
      </section>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 backdrop-blur-sm px-6"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="bg-bg border border-line rounded-sm max-w-md w-full p-10 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-serif text-lg text-ink mb-2">
              作品集为申请制
            </p>
            <p className="font-sans text-xs text-muted mb-8 tracking-wide leading-relaxed">
              微信加我，告诉我你是谁、想看什么<br />
              我同意后发送完整作品链接
            </p>

            <div className="flex justify-center mb-6">
              <Image
                src="/wechat-qr.jpg"
                alt="马克的微信二维码"
                width={280}
                height={280}
                className="rounded-sm"
              />
            </div>

            <p className="font-sans text-xs text-muted tracking-widest">
              微信号 · ASI_Mark
            </p>

            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="mt-8 font-sans text-xs text-muted hover:text-ink transition-colors tracking-widest"
            >
              关闭
            </button>
          </div>
        </div>
      )}
    </>
  );
}
