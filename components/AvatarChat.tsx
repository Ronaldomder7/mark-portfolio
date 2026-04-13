"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import AvatarCompanion from "@/components/AvatarCompanion";

interface Message {
  role: "user" | "assistant";
  content: string;
}

// Worker URL
const CHAT_API = "https://mark-chat.mazerun660.workers.dev";

export default function AvatarChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [greeted, setGreeted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (open && !greeted) {
      setMessages([
        {
          role: "assistant",
          content:
            "你好，我是马克的数字分身 👋\n\n你可以问我任何关于马克的事——他做过什么、怎么想问题、在找什么样的机会。",
        },
      ]);
      setGreeted(true);
    }
  }, [open, greeted]);

  // Escape to close
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && open) setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(CHAT_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: messages.slice(-6),
        }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply || data.error || "出了点问题" },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "网络不太好，稍后再试试？" },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Floating avatar companion — shows on page, hides when chat open */}
      <AvatarCompanion onChatOpen={() => setOpen(true)} chatOpen={open} />

      {/* Chat window */}
      {open && (
        <div
          className="fixed bottom-6 right-6 z-50 flex flex-col"
          style={{
            width: "min(380px, calc(100vw - 48px))",
            height: "min(520px, calc(100vh - 80px))",
            background: "#FAFAF8",
            border: "1px solid #E8E6E1",
            borderRadius: "16px",
            boxShadow:
              "0 20px 60px rgba(0,0,0,0.12), 0 8px 20px rgba(0,0,0,0.08)",
            animation: "fadeUp 0.25s ease-out",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center gap-3 px-5 py-4 shrink-0"
            style={{ borderBottom: "1px solid #E8E6E1" }}
          >
            <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 bg-bg">
              <Image
                src="/avatar-nobg.png"
                alt=""
                width={36}
                height={36}
                className="object-contain object-top"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-serif text-sm text-ink">马克的数字分身</p>
              <p className="font-sans text-xs text-muted">
                基于 2,338 篇笔记
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-muted hover:text-ink transition-colors text-lg leading-none px-1"
            >
              ×
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className="max-w-[85%] px-4 py-3 rounded-2xl font-serif text-sm leading-relaxed"
                  style={
                    msg.role === "user"
                      ? {
                          background: "#1A1A1A",
                          color: "#FAFAF8",
                          borderBottomRightRadius: "4px",
                        }
                      : {
                          background: "#F0EEEA",
                          color: "#1A1A1A",
                          borderBottomLeftRadius: "4px",
                        }
                  }
                >
                  {msg.content.split("\n").map((line, j) => (
                    <p key={j} className={j > 0 ? "mt-2" : ""}>
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div
                  className="px-4 py-3 rounded-2xl"
                  style={{
                    background: "#F0EEEA",
                    borderBottomLeftRadius: "4px",
                  }}
                >
                  <span className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-muted/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 rounded-full bg-muted/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 rounded-full bg-muted/50 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div
            className="px-4 py-3 shrink-0"
            style={{ borderTop: "1px solid #E8E6E1" }}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="问我任何事..."
                maxLength={500}
                className="flex-1 bg-transparent font-serif text-sm text-ink placeholder:text-muted/40 focus:outline-none"
                disabled={loading}
                autoFocus
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="font-sans text-xs px-4 py-2 rounded-lg transition-all disabled:opacity-30"
                style={{ background: "#1A1A1A", color: "#FAFAF8" }}
              >
                发送
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
