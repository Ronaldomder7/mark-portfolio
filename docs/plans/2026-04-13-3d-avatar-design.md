# 3D 太空服角色 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the 2D AvatarCompanion with a 3D astronaut character built in Blender, loaded via React Three Fiber, with 5 animations and scroll-based zone triggers.

**Architecture:** Blender Python script generates the full character model with armature and 5 baked animations, exports as compressed .glb. A new `Avatar3D` component loads it via R3F with orthographic camera on transparent canvas. The existing `AvatarChat` wrapper stays unchanged — just swaps `AvatarCompanion` → `Avatar3D`. State machine logic (mouse follow, idle timers, zone triggers) lives in a custom hook.

**Tech Stack:** Blender 4.x (bpy scripting), @react-three/fiber, @react-three/drei, Three.js, gltfpack (compression)

---

## Phase 1: Environment Setup

### Task 1: Install Blender

**Step 1: Install Blender via Homebrew**

Run: `brew install --cask blender`

**Step 2: Verify Blender CLI**

Run: `blender --version`
Expected: Blender 4.x

**Step 3: Verify headless Python scripting works**

Run: `blender --background --python-expr "import bpy; print('OK:', bpy.app.version_string)"`
Expected: prints `OK: 4.x.x`

---

### Task 2: Install React Three Fiber dependencies

**Step 1: Install packages**

Run:
```bash
cd ~/Code/mark-portfolio
npm install three @react-three/fiber @react-three/drei
npm install -D @types/three
```

**Step 2: Verify build still works**

Run: `npm run build`
Expected: Build succeeds with no errors.

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "deps: add three.js, react-three-fiber, drei for 3D avatar"
```

---

## Phase 2: Blender Character Model

### Task 3: Write Blender modeling script — body structure

Create: `~/Code/mark-portfolio/blender/build-astronaut.py`

This script builds the full character programmatically. Due to complexity, build incrementally and preview.

**Step 1: Write base body script**

Create `blender/build-astronaut.py` with:
- Clear scene
- Helper functions: `create_material(name, color, roughness, metallic)`, `add_subdivision(obj, levels)`
- **Head**: UV Sphere (radius 0.35), subdivision 2, skin-color material (#E8C4A0)
- **Eyes**: Two smaller spheres (radius 0.06) positioned on face, white material with brown iris (inner sphere #5C3A1A)
- **Eyebrows**: Flattened cubes, dark brown (#2A1A0A)
- **Mouth**: Tiny flattened sphere, slightly darker skin tone
- **Hair**: Multiple overlapping spheres/metaballs in black (#1A1A1A), with one elongated sphere angled up-right for the signature flip
- **Neck ring**: Torus (major 0.25, minor 0.06), white-gray material (#E0DCD8)
- **Torso**: Cylinder (radius 0.3, depth 0.6), rounded with subdivision, white-gray (#E8E4E0)
- **Chest plate**: Flattened cube layered on front of torso, gray (#6B6B6B) with blue accent (#7BA7C9)
- **"Mark" text**: Text object, extruded slightly, positioned on chest, gold-ish (#B8A070)
- **Pug badge**: Small circle mesh on chest, brown material (#8B6914)
- **Shoulder pads**: Half-spheres on each shoulder, blue-gray (#7BA7C9)
- **Upper arms**: Cylinders, gray (#6B6B6B)
- **Forearms**: Cylinders, lighter gray with blue stripe
- **Hands/gloves**: Spheres with small cylinder fingers, dark gray (#3A3A3A)
- **Hip section**: Slightly wider cylinder
- **Tubes/pipes**: 3 Bezier curves with bevel (radius 0.015) from hip area, gray metallic
- **Upper legs**: Cylinders, white-gray
- **Lower legs**: Cylinders, white-gray with blue knee detail
- **Boots**: Rounded cubes, dark gray (#4A4A4A)
- Parent all parts to a single Empty named "Astronaut"
- Set origin to feet bottom

**Step 2: Run and preview**

Run:
```bash
blender --background --python ~/Code/mark-portfolio/blender/build-astronaut.py
# Then open to inspect:
blender /tmp/astronaut-preview.blend
```

Script should save to `/tmp/astronaut-preview.blend` at the end for visual inspection.

**Step 3: Iterate on proportions**

Adjust dimensions until the character matches avatar-nobg.png proportions:
- Large head (~40% of total height) — chibi/cartoon ratio
- Short legs (~25% of height)
- Compact torso (~35% of height)

---

### Task 4: Add armature (skeleton) and skinning

**Step 1: Extend script — add armature**

Add to `build-astronaut.py`:

```python
# Armature
bpy.ops.object.armature_add()
armature = bpy.context.object
armature.name = "AstronautArmature"

# Edit mode: build bone hierarchy
# Root (at hip) → Spine → Chest → Neck → Head
# Chest → Shoulder.L → UpperArm.L → LowerArm.L → Hand.L
# Chest → Shoulder.R → UpperArm.R → LowerArm.R → Hand.R
# Root → Hip.L → UpperLeg.L → LowerLeg.L → Foot.L
# Root → Hip.R → UpperLeg.R → LowerLeg.R → Foot.R
```

Bone positions derived from mesh positions. Use `edit_bones.new()` for each bone, set head/tail coordinates, set parent.

**Step 2: Skin mesh to armature**

- Join all mesh parts into single mesh object (except armature)
- Add Armature modifier to mesh
- Use vertex groups (named same as bones) with weight painting via `vertex_group.add()` — assign vertices of each body part to corresponding bone

**Step 3: Run and test — verify bones move mesh parts**

Run script, open in Blender, enter Pose Mode, rotate a bone to verify skinning works.

---

### Task 5: Create 5 animations

**Step 1: Add animations to script**

For each animation, create an Action and insert keyframes:

**idle** (frames 1-48, 2s at 24fps, loop):
- Slight Y translate on Root: 0 → +0.02 → 0 (breathing float)
- Subtle chest rotation: 0° → 2° → 0° (breathing)

**walk** (frames 1-24, 1s at 24fps, loop):
- Root Y bounce: 0 → +0.03 → 0 per step
- UpperLeg.L rotation: -20° → +20° (opposite phase to R)
- UpperLeg.R rotation: +20° → -20°
- UpperArm.L rotation: +15° → -15° (opposite to same-side leg)
- UpperArm.R rotation: -15° → +15°
- Spine slight tilt left/right: -3° → +3°

**wave** (frames 1-36, 1.5s at 24fps, single):
- UpperArm.R rotation Z: 0° → -120° (raise arm)
- LowerArm.R rotation: -30° (bend elbow)
- Hand.R rotation Z: oscillate -20° → +20° three times (wave motion)
- Return to rest

**sit** (frames 1-48, 2s at 24fps, loop):
- UpperLeg L/R rotation: -90° (seated)
- LowerLeg L/R rotation: +90° (feet forward)
- Spine slight forward lean: 5°
- Head slow rotation Y: -5° → +5° (looking around)

**sleep** (frames 1-48, 2s at 24fps, loop):
- Based on sit pose
- Head forward tilt: 20° (nodding off)
- Spine: slow 1° breathing rise/fall
- Arms relaxed at sides

**Step 2: Push each action to NLA track**

```python
track = armature.animation_data.nla_tracks.new()
track.name = "idle"
track.strips.new("idle", 1, idle_action)
```

**Step 3: Run and preview each animation in Blender**

---

### Task 6: Export .glb and compress

**Step 1: Add glTF export to script**

```python
bpy.ops.export_scene.gltf(
    filepath="~/Code/mark-portfolio/public/astronaut.glb",
    export_format='GLB',
    export_animations=True,
    export_skins=True,
    export_apply=True,
)
```

**Step 2: Run full script end-to-end**

Run: `blender --background --python ~/Code/mark-portfolio/blender/build-astronaut.py`
Expected: `public/astronaut.glb` created

**Step 3: Compress with gltfpack (if available)**

```bash
# Install if needed
npm install -g gltfpack
# Compress
gltfpack -i public/astronaut.glb -o public/astronaut-opt.glb -cc -tc
```

Target: < 300KB

**Step 4: Commit**

```bash
git add blender/build-astronaut.py public/astronaut.glb
git commit -m "feat: add 3D astronaut model with 5 animations"
```

---

## Phase 3: React Three Fiber Integration

### Task 7: Write the state machine hook

Create: `components/useAvatarState.ts`

This is pure logic, testable without 3D.

**Step 1: Write failing test**

Create: `components/__tests__/useAvatarState.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Test the state machine transitions
describe('Avatar State Machine', () => {
  it('starts in idle state', () => {
    // Initial state should be idle
  });

  it('transitions to walking when mouse moves', () => {
    // Simulate mouse move → state becomes "walk"
  });

  it('transitions to idle after 2s of no mouse movement', () => {
    // Simulate mouse stop → wait 2s → state becomes "idle"
  });

  it('transitions to sit after 8s idle', () => {
    // idle for 8s → state becomes "sit"
  });

  it('transitions to sleep after 15s idle', () => {
    // idle for 15s → state becomes "sleep"
  });

  it('wakes up from sleep on mouse move', () => {
    // sleeping → mouse move → state becomes "walk"
  });

  it('triggers wave on click', () => {
    // click → state becomes "wave" → after 1.5s → back to idle
  });

  it('tracks facing direction based on mouse delta', () => {
    // mouse moves left → facingLeft = true
    // mouse moves right → facingLeft = false
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd ~/Code/mark-portfolio && npx vitest run components/__tests__/useAvatarState.test.ts`

**Step 3: Implement the hook**

Create: `components/useAvatarState.ts`

```typescript
"use client";
import { useState, useEffect, useRef, useCallback } from "react";

export type AvatarState = "idle" | "walk" | "wave" | "sit" | "sleep";

interface AvatarStateResult {
  state: AvatarState;
  position: { x: number; y: number };
  facingLeft: boolean;
  onAvatarClick: () => void;
}

interface Options {
  onChatOpen: () => void;
  chatOpen: boolean;
  enabled: boolean;
}

export function useAvatarState({ onChatOpen, chatOpen, enabled }: Options): AvatarStateResult {
  // ... state machine logic extracted from current AvatarCompanion
  // Extended with sit (8s) and sleep (15s) timers
  // Mouse following logic (screen coords)
  // Click → wave animation → after 1.5s → onChatOpen()
  // Zone detection based on scroll position
}
```

Key logic:
- `position`: screen-space {x, y}, updated via requestAnimationFrame
- Mouse follow: same SPEED=6, CLOSE_ENOUGH=48 as current
- Timers: mouse stop → 2s idle → 8s sit → 15s sleep
- Click: set state="wave", setTimeout 1.5s → onChatOpen()
- Zone awareness: `IntersectionObserver` on page sections, override state when in view

**Step 4: Run tests, make them pass**

**Step 5: Commit**

```bash
git add components/useAvatarState.ts components/__tests__/useAvatarState.test.ts
git commit -m "feat: add avatar state machine hook with tests"
```

---

### Task 8: Create Avatar3D component

Create: `components/Avatar3D.tsx`

**Step 1: Write the component**

```tsx
"use client";
import { Suspense, useRef, useEffect, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, useAnimations, OrthographicCamera } from "@react-three/drei";
import { useAvatarState, AvatarState } from "./useAvatarState";
import * as THREE from "three";

// Inner component that renders inside Canvas
function AstronautModel({ state, position, facingLeft }: {
  state: AvatarState;
  position: { x: number; y: number };
  facingLeft: boolean;
}) {
  const { scene, animations } = useGLTF("/astronaut.glb");
  const group = useRef<THREE.Group>(null);
  const { actions } = useAnimations(animations, group);

  // Switch animation based on state
  useEffect(() => {
    // Fade out all, fade in current
    Object.values(actions).forEach(a => a?.fadeOut(0.3));
    const current = actions[state];
    if (current) {
      current.reset().fadeIn(0.3).play();
      if (state === "wave") {
        current.setLoop(THREE.LoopOnce, 1);
        current.clampWhenFinished = true;
      }
    }
  }, [state, actions]);

  // Convert screen position to 3D world coords
  const { viewport, camera } = useThree();
  useFrame(() => {
    if (!group.current) return;
    // Map screen px to world units using orthographic camera
    const worldX = (position.x / window.innerWidth - 0.5) * viewport.width;
    const worldY = -(position.y / window.innerHeight - 0.5) * viewport.height;
    group.current.position.x = worldX;
    group.current.position.y = worldY;
    group.current.rotation.y = facingLeft ? Math.PI : 0;
  });

  return <primitive ref={group} object={scene} scale={0.5} />;
}

// Preload model
useGLTF.preload("/astronaut.glb");

interface Avatar3DProps {
  onChatOpen: () => void;
  chatOpen: boolean;
}

export default function Avatar3D({ onChatOpen, chatOpen }: Avatar3DProps) {
  const { state, position, facingLeft, onAvatarClick } = useAvatarState({
    onChatOpen,
    chatOpen,
    enabled: !chatOpen,
  });

  if (chatOpen) return null;

  // Responsive size
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  return (
    <div
      className="fixed inset-0 z-50 pointer-events-none"
      onClick={onAvatarClick}
      style={{ pointerEvents: "none" }}
    >
      <Canvas
        style={{ background: "transparent" }}
        gl={{ alpha: true, antialias: true }}
      >
        <OrthographicCamera
          makeDefault
          zoom={isMobile ? 64 : 120}
          position={[0, 0, 10]}
        />
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} />
        <Suspense fallback={null}>
          <AstronautModel
            state={state}
            position={position}
            facingLeft={facingLeft}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
```

**Step 2: Verify it renders**

Run: `npm run dev`
Open browser, check that the 3D model appears and follows mouse.

**Step 3: Commit**

```bash
git add components/Avatar3D.tsx
git commit -m "feat: add Avatar3D component with R3F integration"
```

---

### Task 9: Integrate into AvatarChat

Modify: `components/AvatarChat.tsx`

**Step 1: Swap AvatarCompanion → Avatar3D**

```diff
- import AvatarCompanion from "@/components/AvatarCompanion";
+ import Avatar3D from "@/components/Avatar3D";
```

```diff
-      <AvatarCompanion onChatOpen={() => setOpen(true)} chatOpen={open} />
+      <Avatar3D onChatOpen={() => setOpen(true)} chatOpen={open} />
```

**Step 2: Verify full flow works**

Run: `npm run dev`
Test: avatar walks, click opens chat, chat works, escape closes.

**Step 3: Build check**

Run: `npm run build`
Expected: Succeeds.

**Step 4: Commit**

```bash
git add components/AvatarChat.tsx
git commit -m "feat: swap 2D avatar for 3D avatar in chat wrapper"
```

---

## Phase 4: Zone Triggers & Polish

### Task 10: Add scroll-based zone detection

Modify: `components/useAvatarState.ts`

**Step 1: Add IntersectionObserver for page sections**

Observe these elements by ID/selector:
- `#beliefs` (思想区域) → override to "sit"
- `footer` element (页面底部) → override to "sleep"
- Others → normal state machine

The zone override has lower priority than mouse interaction — if user moves mouse, resume following. Zone kicks in during idle.

**Step 2: Test zone transitions**

Scroll to beliefs section → avatar should sit down.
Scroll to bottom → avatar should sleep.
Move mouse → avatar wakes up and follows.

**Step 3: Commit**

```bash
git add components/useAvatarState.ts
git commit -m "feat: add scroll-based zone triggers for sit/sleep"
```

---

### Task 11: Click-to-chat interaction on 3D model

**Step 1: Add raycasting click detection**

In Avatar3D, the Canvas needs pointer events on the model only:

```tsx
// In AstronautModel, add onClick to the primitive
<primitive
  ref={group}
  object={scene}
  scale={0.5}
  onClick={(e) => {
    e.stopPropagation();
    onAvatarClick();
  }}
  onPointerOver={() => document.body.style.cursor = "pointer"}
  onPointerOut={() => document.body.style.cursor = ""}
/>
```

The parent Canvas div needs `pointer-events: auto` but only for the 3D click area. Use R3F's built-in raycasting.

**Step 2: Test click → wave → chat opens**

**Step 3: Commit**

---

### Task 12: Speech bubble overlay

**Step 1: Add HTML speech bubble positioned relative to 3D model**

Use drei's `Html` component to attach a DOM element to the 3D character:

```tsx
import { Html } from "@react-three/drei";

// Inside AstronautModel, above the primitive:
{showBubble && state !== "sleep" && (
  <Html position={[0, 1.2, 0]} center>
    <div className="pointer-events-none" style={{...bubble styles from current...}}>
      点击我聊天 👋
    </div>
  </Html>
)}
```

**Step 2: Commit**

---

### Task 13: Responsive sizing and mobile fallback

**Step 1: Add responsive zoom**

```tsx
// In Avatar3D, use window resize listener to update camera zoom
useEffect(() => {
  const onResize = () => setZoom(window.innerWidth < 768 ? 64 : 120);
  window.addEventListener("resize", onResize);
  return () => window.removeEventListener("resize", onResize);
}, []);
```

**Step 2: Add 2D fallback for low-end devices**

```tsx
// Detect WebGL support
const hasWebGL = typeof window !== "undefined" &&
  !!document.createElement("canvas").getContext("webgl2");

if (!hasWebGL) {
  return <AvatarCompanion onChatOpen={onChatOpen} chatOpen={chatOpen} />;
}
```

Keep old `AvatarCompanion.tsx` as fallback — don't delete it.

**Step 3: Suspense fallback shows 2D while loading**

```tsx
<Suspense fallback={<AvatarCompanion onChatOpen={onChatOpen} chatOpen={chatOpen} />}>
```

**Step 4: Build and commit**

```bash
npm run build
git add -A
git commit -m "feat: responsive sizing and 2D fallback for 3D avatar"
```

---

### Task 14: Final polish and deploy

**Step 1: Verify .glb size**

Run: `ls -lh public/astronaut.glb`
Target: < 300KB. If larger, run gltfpack compression.

**Step 2: Full test pass**

Run: `npm run test && npm run build`

**Step 3: Manual testing checklist**

- [ ] Avatar appears on page load
- [ ] Follows mouse cursor
- [ ] Transitions: walk → idle → sit → sleep
- [ ] Mouse wakes from sleep
- [ ] Click triggers wave then chat
- [ ] Chat works (send message, get reply)
- [ ] Escape closes chat, avatar reappears
- [ ] Scroll to 思想 → avatar sits
- [ ] Scroll to bottom → avatar sleeps
- [ ] Mobile: smaller avatar, works on touch
- [ ] No WebGL: falls back to 2D
- [ ] Build succeeds, no errors

**Step 4: Commit and push**

```bash
git add -A
git commit -m "feat: 3D astronaut avatar companion with animations and zone triggers"
git push
```
