"use client";

import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import {
  HandLandmarker,
  FilesetResolver,
} from "@mediapipe/tasks-vision";

export interface HandState {
  x: number; // 0..1 normalized x of palm center (MIRRORED: left in real life = left on screen)
  y: number; // 0..1 normalized y of palm center
  isFist: boolean;
  isOk: boolean; // thumb tip touching index tip
}

export type HandTrackingStatus =
  | "idle"
  | "loading-wasm"
  | "loading-model"
  | "awaiting-camera"
  | "running"
  | "error";

export interface UseHandTrackingResult {
  hand: HandState | null;
  status: HandTrackingStatus;
  error: string | null;
  videoRef: RefObject<HTMLVideoElement | null>;
}

// Pin versions for cache predictability and to avoid @latest resolution lag
const WASM_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

export function useHandTracking(enabled: boolean): UseHandTrackingResult {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [hand, setHand] = useState<HandState | null>(null);
  const [status, setStatus] = useState<HandTrackingStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setStatus("idle");
      return;
    }

    let landmarker: HandLandmarker | null = null;
    let rafId = 0;
    let stream: MediaStream | null = null;
    let stopped = false;

    async function setup() {
      try {
        setStatus("loading-wasm");
        const vision = await FilesetResolver.forVisionTasks(WASM_URL);
        if (stopped) return;

        setStatus("loading-model");
        landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL_URL },
          runningMode: "VIDEO",
          numHands: 1,
        });
        if (stopped) return;

        setStatus("awaiting-camera");
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240 },
        });
        if (stopped) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setStatus("running");

        const tick = () => {
          if (stopped || !landmarker || !videoRef.current) return;
          if (
            videoRef.current.readyState >= 2 &&
            videoRef.current.videoWidth > 0
          ) {
            const now = performance.now();
            const result = landmarker.detectForVideo(videoRef.current, now);
            const landmarks = result.landmarks[0];
            if (landmarks) {
              const palm = landmarks[9];
              const wrist = landmarks[0];
              const tips = [8, 12, 16, 20].map((i) => landmarks[i]);
              const avgDist =
                tips.reduce(
                  (sum, t) => sum + Math.hypot(t.x - wrist.x, t.y - wrist.y),
                  0
                ) / tips.length;
              const isFist = avgDist < 0.18;

              // OK gesture: thumb tip (4) pinched to index tip (8),
              // while middle/ring/pinky are still extended (not fist).
              const thumbTip = landmarks[4];
              const indexTip = landmarks[8];
              const pinchDist = Math.hypot(
                thumbTip.x - indexTip.x,
                thumbTip.y - indexTip.y
              );
              const isOk = !isFist && pinchDist < 0.06;

              setHand({ x: 1 - palm.x, y: palm.y, isFist, isOk });
            } else {
              setHand(null);
            }
          }
          rafId = requestAnimationFrame(tick);
        };
        tick();
      } catch (e) {
        if (!stopped) {
          setStatus("error");
          setError(e instanceof Error ? e.message : String(e));
        }
      }
    }

    setup();

    return () => {
      stopped = true;
      if (rafId) cancelAnimationFrame(rafId);
      landmarker?.close();
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [enabled]);

  return { hand, status, error, videoRef };
}
