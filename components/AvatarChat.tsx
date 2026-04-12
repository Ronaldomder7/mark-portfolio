"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";

interface Message {
  role: "user" | "assistant";
  content: string;
}

// Worker URL — will be updated after deploying the Cloudflare Worker
const CHAT_API = "https://mark-chat.mazerun660.workers.dev";

export default function AvatarChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [greeted, setGreeted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Show greeting on first open
  useEffect(() => {
    if (open && !greeted) {
      setMessages([
        {
          role: "assistant",
          content:
            "你好，我是马克的数字分身。\n\n你可以问我关于马克的任何事——他做过什么、怎么想问题、在找什么样的机会。",
        },
      ]);
      setGreeted(true);
    }
  }, [open, greeted]);

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

      if (data.error) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.error },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.reply },
        ]);
      }
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
      {/* Floating avatar button — bottom right */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 group cursor-pointer"
        style={{ filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.15))" }}
        aria-label="和马克的数字分身聊天"
      >
        <div
          className="relative rounded-full overflow-hidden transition-transform duration-300"
          style={{
            width: 60,
            height: 60,
            border: open
              ? "2px solid rgba(139, 46, 46, 0.6)"
              : "2px solid rgba(26, 26, 26, 0.1)",
            transform: open ? "scale(0.9)" : "scale(1)",
          }}
        >
          <Image
            src="/avatar.png"
            alt="马克的数字分身"
            width={60}
            height={60}
            className="object-cover object-top"
          />
        </div>

        {/* Tooltip — only show when chat is closed */}
        {!open && (
          <span
            className="absolute -top-10 right-0 whitespace-nowrap font-sans text-xs text-ink bg-bg border border-line rounded-sm px-3 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
            style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
          >
            和我的数字分身聊聊
          </span>
        )}

        {/* Pulse ring when closed */}
        {!open && (
          <span
            className="absolute inset-0 rounded-full"
            style={{
              border: "2px solid rgba(139, 46, 46, 0.3)",
              animation: "avatarPulse 2s ease-out infinite",
            }}
          />
        )}
      </button>

      {/* Chat window */}
      {open && (
        <div
          className="fixed bottom-24 right-6 z-50 flex flex-col"
          style={{
            width: "min(380px, calc(100vw - 48px))",
            height: "min(520px, calc(100vh - 140px))",
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
            className="flex items-center gap-3 px-5 py-4"
            style={{ borderBottom: "1px solid #E8E6E1" }}
          >
            <div className="w-8 h-8 rounded-full overflow-hidden shrink-0">
              <Image
                src="/avatar.png"
                alt=""
                width={32}
                height={32}
                className="object-cover object-top"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-serif text-sm text-ink">马克的数字分身</p>
              <p className="font-sans text-xs text-muted">
                基于马克的 2,338 篇笔记训练
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-muted hover:text-ink transition-colors text-lg leading-none"
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

            {/* Loading indicator */}
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
                    <span
                      className="w-2 h-2 rounded-full bg-muted/50 animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    />
                    <span
                      className="w-2 h-2 rounded-full bg-muted/50 animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    />
                    <span
                      className="w-2 h-2 rounded-full bg-muted/50 animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    />
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div
            className="px-4 py-3"
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
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="font-sans text-xs px-4 py-2 rounded-lg transition-colors disabled:opacity-30"
                style={{
                  background: "#1A1A1A",
                  color: "#FAFAF8",
                }}
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
