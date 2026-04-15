"use client";

import { useState, useEffect } from "react";

interface Props {
  onAllow: () => void;
  onDeny: () => void;
}

export default function MapGesturePrompt({ onAllow, onDeny }: Props) {
  const [visible, setVisible] = useState(false);

  // Only show once per session
  useEffect(() => {
    const dismissed = sessionStorage.getItem("map-gesture-dismissed");
    if (!dismissed) setVisible(true);
  }, []);

  if (!visible) return null;

  function dismiss() {
    sessionStorage.setItem("map-gesture-dismissed", "1");
    setVisible(false);
  }

  return (
    <div className="absolute top-4 right-4 z-10 bg-bg border border-line rounded-sm p-4 max-w-xs font-sans text-xs">
      <p className="text-ink mb-3 leading-relaxed">
        打开摄像头，用手势浏览地图？
      </p>
      <p className="text-muted mb-4 leading-relaxed">
        挥手滑地图，握拳展开城市照片。
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            dismiss();
            onAllow();
          }}
          className="px-3 py-1.5 bg-ink text-bg tracking-wide hover:opacity-80 transition-opacity"
        >
          允许
        </button>
        <button
          type="button"
          onClick={() => {
            dismiss();
            onDeny();
          }}
          className="px-3 py-1.5 border border-line text-muted tracking-wide hover:text-ink transition-colors"
        >
          用鼠标就行
        </button>
      </div>
    </div>
  );
}
