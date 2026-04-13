"use client";

import { useState, useEffect, useRef, useCallback, useReducer } from "react";

// --- Pure reducer (testable without DOM) ---

export type Animation = "idle" | "walk" | "wave" | "sit" | "sleep";
export type Zone = "beliefs" | "footer" | null;

export interface AvatarStateData {
  animation: Animation;
  posX: number;
  posY: number;
  targetX: number;
  targetY: number;
  facingLeft: boolean;
  activeZone: Zone;
}

export type AvatarAction =
  | { type: "MOUSE_MOVE"; x: number; y: number }
  | { type: "TICK" }
  | { type: "IDLE_TIMEOUT" }
  | { type: "SIT_TIMEOUT" }
  | { type: "SLEEP_TIMEOUT" }
  | { type: "CLICK" }
  | { type: "WAVE_DONE" }
  | { type: "ZONE_ENTER"; zone: "beliefs" | "footer" }
  | { type: "ZONE_EXIT" };

const SPEED = 6;
const CLOSE_ENOUGH = 48;

export function initialState(): AvatarStateData {
  return {
    animation: "idle",
    posX: 0,
    posY: 0,
    targetX: 0,
    targetY: 0,
    facingLeft: false,
    activeZone: null,
  };
}

const ZONE_ANIMATION: Record<string, Animation> = {
  beliefs: "sit",
  footer: "sleep",
};

export function avatarReducer(
  state: AvatarStateData,
  action: AvatarAction
): AvatarStateData {
  switch (action.type) {
    case "MOUSE_MOVE": {
      const facingLeft = action.x < state.posX;
      return {
        ...state,
        animation: "walk",
        targetX: action.x,
        targetY: action.y,
        facingLeft,
        // Mouse movement clears zone override
        activeZone: null,
      };
    }

    case "TICK": {
      if (state.animation !== "walk") return state;

      const dx = state.targetX - state.posX;
      const dy = state.targetY - state.posY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= CLOSE_ENOUGH) {
        // Close enough, don't move
        return state;
      }

      return {
        ...state,
        posX: state.posX + (dx / dist) * SPEED,
        posY: state.posY + (dy / dist) * SPEED,
      };
    }

    case "IDLE_TIMEOUT":
      if (state.animation === "wave") return state;
      return { ...state, animation: "idle" };

    case "SIT_TIMEOUT":
      if (state.animation !== "idle") return state;
      return { ...state, animation: "sit" };

    case "SLEEP_TIMEOUT":
      if (state.animation !== "sit" && state.animation !== "idle") return state;
      return { ...state, animation: "sleep" };

    case "CLICK":
      if (state.animation === "wave") return state;
      return { ...state, animation: "wave" };

    case "WAVE_DONE":
      return { ...state, animation: "idle" };

    case "ZONE_ENTER": {
      // Only override if currently idle/sit/sleep (not walking or waving)
      if (state.animation === "walk" || state.animation === "wave")
        return { ...state, activeZone: action.zone };
      const anim = ZONE_ANIMATION[action.zone] || "idle";
      return { ...state, animation: anim, activeZone: action.zone };
    }

    case "ZONE_EXIT":
      if (state.animation === "walk" || state.animation === "wave")
        return { ...state, activeZone: null };
      return { ...state, animation: "idle", activeZone: null };

    default:
      return state;
  }
}

// --- React hook (uses reducer + DOM side effects) ---

interface UseAvatarStateOptions {
  onChatOpen: () => void;
  chatOpen: boolean;
  enabled: boolean;
}

export interface AvatarStateResult {
  animation: Animation;
  posX: number;
  posY: number;
  facingLeft: boolean;
  onAvatarClick: () => void;
}

export function useAvatarState({
  onChatOpen,
  chatOpen,
  enabled,
}: UseAvatarStateOptions): AvatarStateResult {
  const [state, dispatch] = useReducer(avatarReducer, undefined, initialState);
  const [mounted, setMounted] = useState(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sleepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Initialize position
  useEffect(() => {
    setMounted(true);
    const startX = window.innerWidth - 120;
    const startY = window.innerHeight - 120;
    dispatch({ type: "MOUSE_MOVE", x: startX, y: startY });
    // Immediately go idle (the MOUSE_MOVE sets walk, so correct it)
    dispatch({ type: "IDLE_TIMEOUT" });
  }, []);

  // Mouse tracking
  useEffect(() => {
    if (!mounted || !enabled) return;

    function clearTimers() {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (sitTimerRef.current) clearTimeout(sitTimerRef.current);
      if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
    }

    function onMouseMove(e: MouseEvent) {
      dispatch({ type: "MOUSE_MOVE", x: e.clientX - 32, y: e.clientY - 32 });

      clearTimers();

      // 2s → idle
      idleTimerRef.current = setTimeout(() => {
        dispatch({ type: "IDLE_TIMEOUT" });

        // If in a zone, apply zone animation
        const z = stateRef.current.activeZone;
        if (z) {
          dispatch({ type: "ZONE_ENTER", zone: z });
          return;
        }

        // 6s more → sit (8s total)
        sitTimerRef.current = setTimeout(() => {
          dispatch({ type: "SIT_TIMEOUT" });

          // 7s more → sleep (15s total)
          sleepTimerRef.current = setTimeout(() => {
            dispatch({ type: "SLEEP_TIMEOUT" });
          }, 7000);
        }, 6000);
      }, 2000);
    }

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      clearTimers();
    };
  }, [mounted, enabled]);

  // Animation loop for movement
  useEffect(() => {
    if (!mounted || !enabled) return;

    let animId: number;
    let lastTime = 0;

    function tick(timestamp: number) {
      animId = requestAnimationFrame(tick);
      if (timestamp - lastTime < 50) return; // ~20fps for position updates
      lastTime = timestamp;
      dispatch({ type: "TICK" });
    }

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [mounted, enabled]);

  // Zone detection via IntersectionObserver
  useEffect(() => {
    if (!mounted) return;

    const zones: { id: string; zone: "beliefs" | "footer" }[] = [
      { id: "beliefs", zone: "beliefs" },
    ];

    const observers: IntersectionObserver[] = [];

    // Observe named sections
    for (const { id, zone } of zones) {
      const el = document.getElementById(id);
      if (!el) continue;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            dispatch({ type: "ZONE_ENTER", zone });
          } else if (stateRef.current.activeZone === zone) {
            dispatch({ type: "ZONE_EXIT" });
          }
        },
        { threshold: 0.3 }
      );
      obs.observe(el);
      observers.push(obs);
    }

    // Footer zone
    const footer = document.querySelector("footer");
    if (footer) {
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            dispatch({ type: "ZONE_ENTER", zone: "footer" });
          } else if (stateRef.current.activeZone === "footer") {
            dispatch({ type: "ZONE_EXIT" });
          }
        },
        { threshold: 0.3 }
      );
      obs.observe(footer);
      observers.push(obs);
    }

    return () => observers.forEach((obs) => obs.disconnect());
  }, [mounted]);

  // Click handler
  const onAvatarClick = useCallback(() => {
    dispatch({ type: "CLICK" });
    // Wave for 1.5s, then open chat
    setTimeout(() => {
      dispatch({ type: "WAVE_DONE" });
      onChatOpen();
    }, 1500);
  }, [onChatOpen]);

  return {
    animation: state.animation,
    posX: state.posX,
    posY: state.posY,
    facingLeft: state.facingLeft,
    onAvatarClick,
  };
}
