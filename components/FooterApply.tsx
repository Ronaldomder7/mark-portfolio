import Image from "next/image";

export default function FooterApply() {
  return (
    <section id="apply" className="border-t border-line px-6 py-24">
      <div className="max-w-prose mx-auto text-center">
        <h2 className="font-sans text-xs text-muted tracking-widest uppercase mb-4">
          想看完整作品集？ / APPLY
        </h2>
        <p className="font-serif text-lg text-ink mb-6 leading-relaxed">
          作品集为申请制。
        </p>
        <p className="font-sans text-xs text-muted mb-10 tracking-wide leading-relaxed whitespace-pre-line">
          {"微信加我，告诉我你是谁、想看什么。\n我同意后发送完整作品链接。"}
        </p>

        <div className="flex justify-center mb-6">
          <Image
            src="/wechat-qr.jpg"
            alt="马克的微信二维码"
            width={240}
            height={240}
            className="rounded-sm"
          />
        </div>

        <p className="font-sans text-xs text-muted tracking-widest uppercase">
          微信号 · ASI_Mark
        </p>
      </div>
    </section>
  );
}
