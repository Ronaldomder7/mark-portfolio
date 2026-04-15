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
}

export interface UseHandTrackingResult {
  hand: HandState | null;
  error: string | null;
  videoRef: RefObject<HTMLVideoElement | null>;
}

export function useHandTracking(enabled: boolean): UseHandTrackingResult {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [hand, setHand] = useState<HandState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let landmarker: HandLandmarker | null = null;
    let rafId = 0;
    let stream: MediaStream | null = null;
    let stopped = false;

    async function setup() {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );
        landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
          },
          runningMode: "VIDEO",
          numHands: 1,
        });

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

        const tick = () => {
          if (stopped || !landmarker || !videoRef.current) return;
          // Guard: only detect when video has valid dimensions
          if (videoRef.current.readyState >= 2 && videoRef.current.videoWidth > 0) {
            const now = performance.now();
            const result = landmarker.detectForVideo(videoRef.current, now);
            const landmarks = result.landmarks[0];
            if (landmarks) {
              // Palm center = landmark 9 (middle finger MCP)
              const palm = landmarks[9];
              // Fist detection: average distance of fingertips (8,12,16,20) to wrist (0)
              const wrist = landmarks[0];
              const tips = [8, 12, 16, 20].map((i) => landmarks[i]);
              const avgDist =
                tips.reduce(
                  (sum, t) => sum + Math.hypot(t.x - wrist.x, t.y - wrist.y),
                  0
                ) / tips.length;
              const isFist = avgDist < 0.15;
              // Mirror x so that left in real life = left on screen (natural mirror UX)
              setHand({ x: 1 - palm.x, y: palm.y, isFist });
            } else {
              setHand(null);
            }
          }
          rafId = requestAnimationFrame(tick);
        };
        tick();
      } catch (e) {
        setError(String(e));
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

  return { hand, error, videoRef };
}
