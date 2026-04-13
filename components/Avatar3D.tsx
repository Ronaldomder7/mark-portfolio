"use client";

import { Suspense, useRef, useEffect, useState, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, useAnimations, Html } from "@react-three/drei";
import { useAvatarState, type Animation } from "./useAvatarState";
import * as THREE from "three";
import AvatarCompanion from "./AvatarCompanion";

// --- Inner 3D model component (renders inside Canvas) ---

function AstronautModel({
  animation,
  posX,
  posY,
  facingLeft,
  onAvatarClick,
  showBubble,
}: {
  animation: Animation;
  posX: number;
  posY: number;
  facingLeft: boolean;
  onAvatarClick: () => void;
  showBubble: boolean;
}) {
  const { scene, animations } = useGLTF("/astronaut.glb");
  const group = useRef<THREE.Group>(null);
  const { actions } = useAnimations(animations, group);
  const { viewport } = useThree();

  // Switch animation based on state
  useEffect(() => {
    // Fade out all current animations
    Object.values(actions).forEach((a) => a?.fadeOut(0.3));

    const current = actions[animation];
    if (current) {
      current.reset().fadeIn(0.3).play();
      if (animation === "wave") {
        current.setLoop(THREE.LoopOnce, 1);
        current.clampWhenFinished = true;
      } else {
        current.setLoop(THREE.LoopRepeat, Infinity);
      }
    }
  }, [animation, actions]);

  // Convert screen position to 3D world coords (orthographic)
  useFrame(() => {
    if (!group.current) return;
    // Map screen pixels to world units
    const worldX =
      (posX / window.innerWidth - 0.5) * viewport.width;
    const worldY =
      -(posY / window.innerHeight - 0.5) * viewport.height;

    // Smooth lerp for position
    group.current.position.x +=
      (worldX - group.current.position.x) * 0.15;
    group.current.position.y +=
      (worldY - group.current.position.y) * 0.15;

    // Facing direction
    const targetRotY = facingLeft ? Math.PI : 0;
    group.current.rotation.y +=
      (targetRotY - group.current.rotation.y) * 0.1;
  });

  return (
    <group ref={group}>
      <primitive
        object={scene}
        scale={0.5}
        onClick={(e: any) => {
          e.stopPropagation();
          onAvatarClick();
        }}
        onPointerOver={() => {
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "";
        }}
      />
      {/* Speech bubble attached to 3D model */}
      {showBubble && animation !== "sleep" && (
        <Html position={[0, 1.2, 0]} center>
          <div
            className="pointer-events-none whitespace-nowrap"
            style={{
              background: "#FAFAF8",
              border: "1px solid #E8E6E1",
              borderRadius: 12,
              padding: "6px 12px",
              fontSize: 12,
              fontFamily: "var(--font-sans)",
              color: "#1A1A1A",
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              animation: "fadeUp 0.3s ease-out",
            }}
          >
            点击我聊天 👋
          </div>
        </Html>
      )}
    </group>
  );
}

// Preload model
useGLTF.preload("/astronaut.glb");

// --- Main wrapper component ---

interface Avatar3DProps {
  onChatOpen: () => void;
  chatOpen: boolean;
}

export default function Avatar3D({ onChatOpen, chatOpen }: Avatar3DProps) {
  const [hasWebGL, setHasWebGL] = useState(true);
  const [showBubble, setShowBubble] = useState(true);

  const { animation, posX, posY, facingLeft, onAvatarClick } = useAvatarState({
    onChatOpen,
    chatOpen,
    enabled: !chatOpen,
  });

  // Check WebGL support
  useEffect(() => {
    try {
      const canvas = document.createElement("canvas");
      const gl =
        canvas.getContext("webgl2") || canvas.getContext("webgl");
      if (!gl) setHasWebGL(false);
    } catch {
      setHasWebGL(false);
    }
  }, []);

  // Hide bubble after 5s
  useEffect(() => {
    const t = setTimeout(() => setShowBubble(false), 5000);
    return () => clearTimeout(t);
  }, []);

  // Responsive zoom
  const [zoom, setZoom] = useState(120);
  useEffect(() => {
    const update = () => setZoom(window.innerWidth < 768 ? 64 : 120);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  if (chatOpen) return null;

  // Fallback for no WebGL
  if (!hasWebGL) {
    return <AvatarCompanion onChatOpen={onChatOpen} chatOpen={chatOpen} />;
  }

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      <Suspense
        fallback={
          <AvatarCompanion onChatOpen={onChatOpen} chatOpen={chatOpen} />
        }
      >
        <Canvas
          style={{ background: "transparent", pointerEvents: "auto" }}
          gl={{ alpha: true, antialias: true }}
          orthographic
          camera={{ zoom, position: [0, 0, 10], near: 0.1, far: 100 }}
        >
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 5, 5]} intensity={0.8} />
          <AstronautModel
            animation={animation}
            posX={posX}
            posY={posY}
            facingLeft={facingLeft}
            onAvatarClick={onAvatarClick}
            showBubble={showBubble}
          />
        </Canvas>
      </Suspense>
    </div>
  );
}
