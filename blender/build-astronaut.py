"""
Build a chibi-style astronaut character programmatically in Blender.
Reference: public/avatar-nobg.png

Proportions (chibi):
- Head: ~40% of total height
- Torso: ~35%
- Legs: ~25%
Total height: ~2.0 units (origin at feet)

Run: blender --background --python blender/build-astronaut.py
"""

import bpy
import bmesh
import math
from mathutils import Vector

# ---------------------------------------------------------------------------
# Cleanup
# ---------------------------------------------------------------------------
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete()
for col in bpy.data.collections:
    if col.name != 'Scene Collection':
        bpy.data.collections.remove(col)
for mesh in bpy.data.meshes:
    bpy.data.meshes.remove(mesh)
for mat in bpy.data.materials:
    bpy.data.materials.remove(mat)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def create_material(name, color, roughness=0.5, metallic=0.0):
    """Create a simple Principled BSDF material."""
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*hex_to_rgb(color), 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    return mat

def hex_to_rgb(hex_str):
    """Convert hex color string to (r, g, b) floats in linear space."""
    hex_str = hex_str.lstrip('#')
    srgb = tuple(int(hex_str[i:i+2], 16) / 255.0 for i in (0, 2, 4))
    # sRGB to linear
    return tuple(((c / 12.92) if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4) for c in srgb)

def add_smooth(obj, level=2):
    """Add subdivision surface modifier and shade smooth."""
    mod = obj.modifiers.new("Subsurf", 'SUBSURF')
    mod.levels = level
    mod.render_levels = level
    obj.data.polygons.foreach_set("use_smooth", [True] * len(obj.data.polygons))
    obj.data.update()

def create_sphere(name, radius, location, material, segments=32):
    """Create a UV sphere with material."""
    bpy.ops.mesh.primitive_uv_sphere_add(
        radius=radius, segments=segments, ring_count=16, location=location
    )
    obj = bpy.context.active_object
    obj.name = name
    obj.data.materials.append(material)
    bpy.ops.object.shade_smooth()
    return obj

def create_cylinder(name, radius, depth, location, material, vertices=32):
    """Create a cylinder with material."""
    bpy.ops.mesh.primitive_cylinder_add(
        radius=radius, depth=depth, vertices=vertices, location=location
    )
    obj = bpy.context.active_object
    obj.name = name
    obj.data.materials.append(material)
    bpy.ops.object.shade_smooth()
    return obj

def create_cube(name, size, location, scale, material):
    """Create a cube with given scale and material."""
    bpy.ops.mesh.primitive_cube_add(size=size, location=location)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(scale=True)
    obj.data.materials.append(material)
    return obj

def create_torus(name, major_r, minor_r, location, material):
    """Create a torus with material."""
    bpy.ops.mesh.primitive_torus_add(
        major_radius=major_r, minor_radius=minor_r, location=location
    )
    obj = bpy.context.active_object
    obj.name = name
    obj.data.materials.append(material)
    bpy.ops.object.shade_smooth()
    return obj

# ---------------------------------------------------------------------------
# Materials
# ---------------------------------------------------------------------------
mat_skin       = create_material("Skin",        "#E8C4A0", roughness=0.6)
mat_hair       = create_material("Hair",        "#1A1A1A", roughness=0.8)
mat_eye_white  = create_material("EyeWhite",    "#F5F5F0", roughness=0.3)
mat_eye_iris   = create_material("EyeIris",     "#5C3A1A", roughness=0.4)
mat_eye_pupil  = create_material("EyePupil",    "#0A0A0A", roughness=0.3)
mat_eyebrow    = create_material("Eyebrow",     "#2A1A0A", roughness=0.8)
mat_mouth      = create_material("Mouth",       "#C4957A", roughness=0.6)
mat_suit_white = create_material("SuitWhite",   "#E8E4E0", roughness=0.4, metallic=0.1)
mat_suit_gray  = create_material("SuitGray",    "#6B6B6B", roughness=0.3, metallic=0.2)
mat_suit_dark  = create_material("SuitDark",    "#3A3A3A", roughness=0.3, metallic=0.3)
mat_accent_blue= create_material("AccentBlue",  "#7BA7C9", roughness=0.3, metallic=0.1)
mat_neck_ring  = create_material("NeckRing",    "#E0DCD8", roughness=0.3, metallic=0.4)
mat_gold       = create_material("Gold",        "#B8A070", roughness=0.3, metallic=0.6)
mat_badge      = create_material("Badge",       "#8B6914", roughness=0.5, metallic=0.1)
mat_boot       = create_material("Boot",        "#4A4A4A", roughness=0.4, metallic=0.2)
mat_pipe       = create_material("Pipe",        "#888888", roughness=0.2, metallic=0.6)
mat_red_light  = create_material("RedLight",    "#CC3333", roughness=0.2, metallic=0.3)
mat_blue_light = create_material("BlueLight",   "#5599DD", roughness=0.2, metallic=0.3)

# ---------------------------------------------------------------------------
# Dimensions  (total height ~2.0, origin will be moved to feet)
# ---------------------------------------------------------------------------
# Feet at Y=0, head top at Y~2.0
FOOT_Y     = 0.0
BOOT_H     = 0.14
LOWER_LEG  = 0.22
UPPER_LEG  = 0.22
HIP_Y      = FOOT_Y + BOOT_H + LOWER_LEG + UPPER_LEG  # 0.58
TORSO_H    = 0.50
CHEST_Y    = HIP_Y + TORSO_H * 0.5  # ~0.83
NECK_Y     = HIP_Y + TORSO_H        # 1.08
HEAD_R     = 0.40  # large but not extreme
HEAD_Y     = NECK_Y + HEAD_R + 0.02  # ~1.50

all_objects = []

# ---------------------------------------------------------------------------
# HEAD
# ---------------------------------------------------------------------------
head = create_sphere("Head", HEAD_R, (0, 0, HEAD_Y), mat_skin)
# Slightly flatten top-to-bottom for chibi look
head.scale = (1.0, 0.95, 1.0)
bpy.ops.object.transform_apply(scale=True)
all_objects.append(head)

# --- Eyes ---
eye_y_offset = -0.28   # forward
eye_x_offset = 0.13
eye_z = HEAD_Y + 0.02

for side, sx in [("L", -1), ("R", 1)]:
    # White
    ew = create_sphere(f"EyeWhite.{side}", 0.08,
                       (sx * eye_x_offset, eye_y_offset, eye_z), mat_eye_white, 24)
    ew.scale = (0.8, 0.5, 0.9)
    bpy.ops.object.transform_apply(scale=True)
    all_objects.append(ew)

    # Iris
    ei = create_sphere(f"EyeIris.{side}", 0.055,
                       (sx * eye_x_offset, eye_y_offset - 0.03, eye_z), mat_eye_iris, 20)
    ei.scale = (0.7, 0.4, 0.8)
    bpy.ops.object.transform_apply(scale=True)
    all_objects.append(ei)

    # Pupil
    ep = create_sphere(f"EyePupil.{side}", 0.03,
                       (sx * eye_x_offset, eye_y_offset - 0.05, eye_z), mat_eye_pupil, 16)
    ep.scale = (0.6, 0.3, 0.7)
    bpy.ops.object.transform_apply(scale=True)
    all_objects.append(ep)

# --- Eyebrows ---
for side, sx in [("L", -1), ("R", 1)]:
    eb = create_cube(f"Eyebrow.{side}", 0.1,
                     (sx * 0.13, -0.26, HEAD_Y + 0.12),
                     (1.2, 0.3, 0.25), mat_eyebrow)
    # Slight angle
    eb.rotation_euler = (0, 0, sx * -0.1)
    bpy.ops.object.transform_apply(rotation=True)
    all_objects.append(eb)

# --- Mouth ---
mouth = create_sphere("Mouth", 0.04, (0, -0.32, HEAD_Y - 0.1), mat_mouth, 16)
mouth.scale = (1.5, 0.5, 0.6)
bpy.ops.object.transform_apply(scale=True)
all_objects.append(mouth)

# --- Hair ---
# Main hair cap — sits on top of head like a helmet of hair
hair_cap = create_sphere("HairCap", HEAD_R + 0.03, (0, 0.02, HEAD_Y + 0.06), mat_hair)
hair_cap.scale = (1.02, 1.0, 0.82)
bpy.ops.object.transform_apply(scale=True)
all_objects.append(hair_cap)

# Front fringe — hangs over forehead slightly
hair_fringe = create_sphere("HairFringe", 0.32, (0, -0.2, HEAD_Y + 0.18), mat_hair, 24)
hair_fringe.scale = (1.2, 0.45, 0.55)
bpy.ops.object.transform_apply(scale=True)
all_objects.append(hair_fringe)

# Side volume — subtle, no protruding pieces
hair_right = create_sphere("HairRight", 0.2, (0.2, -0.02, HEAD_Y + 0.12), mat_hair, 16)
hair_right.scale = (0.6, 0.7, 0.7)
bpy.ops.object.transform_apply(scale=True)
all_objects.append(hair_right)

hair_left = create_sphere("HairLeft", 0.2, (-0.2, -0.02, HEAD_Y + 0.12), mat_hair, 16)
hair_left.scale = (0.6, 0.7, 0.7)
bpy.ops.object.transform_apply(scale=True)
all_objects.append(hair_left)

# ---------------------------------------------------------------------------
# NECK RING (thick space suit collar — like helmet base in reference)
# ---------------------------------------------------------------------------
# Outer collar — thick torus
neck_ring = create_torus("NeckRing", 0.34, 0.09, (0, 0, NECK_Y + 0.04), mat_neck_ring)
all_objects.append(neck_ring)

# Top rim
neck_rim = create_torus("NeckRim", 0.32, 0.04, (0, 0, NECK_Y + 0.12), mat_suit_white)
all_objects.append(neck_rim)

# Inner collar cylinder (the dark hole visible in reference)
collar_inner = create_cylinder("CollarInner", 0.28, 0.18, (0, 0, NECK_Y + 0.04), mat_suit_gray)
all_objects.append(collar_inner)

# ---------------------------------------------------------------------------
# TORSO
# ---------------------------------------------------------------------------
torso = create_cylinder("Torso", 0.32, TORSO_H, (0, 0, HIP_Y + TORSO_H / 2), mat_suit_white)
add_smooth(torso, 2)
all_objects.append(torso)

# Chest plate (front)
chest_plate = create_cube("ChestPlate", 0.3,
                          (0, -0.2, CHEST_Y),
                          (1.3, 0.3, 1.0), mat_suit_gray)
add_smooth(chest_plate, 1)
all_objects.append(chest_plate)

# Blue accent strip on chest
accent_strip = create_cube("AccentStrip", 0.1,
                           (0.15, -0.28, CHEST_Y + 0.05),
                           (0.4, 0.2, 1.5), mat_accent_blue)
all_objects.append(accent_strip)

# "Mark" text
bpy.ops.object.text_add(location=(0.08, -0.30, CHEST_Y + 0.08))
mark_text = bpy.context.active_object
mark_text.name = "MarkText"
mark_text.data.body = "Mark"
mark_text.data.size = 0.06
mark_text.data.extrude = 0.005
mark_text.data.materials.append(mat_gold)
mark_text.rotation_euler = (math.pi / 2, 0, 0)
all_objects.append(mark_text)

# Pug badge (small circle)
pug_badge = create_cylinder("PugBadge", 0.04, 0.01,
                            (-0.08, -0.30, CHEST_Y + 0.08), mat_badge, 24)
pug_badge.rotation_euler = (math.pi / 2, 0, 0)
bpy.ops.object.transform_apply(rotation=True)
all_objects.append(pug_badge)

# Red indicator light (left chest)
red_light = create_sphere("RedLight", 0.02, (-0.2, -0.25, CHEST_Y - 0.1), mat_red_light, 12)
all_objects.append(red_light)

# Blue indicator light (right chest)
blue_light = create_sphere("BlueLight", 0.025, (0.12, -0.27, CHEST_Y - 0.08), mat_blue_light, 12)
all_objects.append(blue_light)

# ---------------------------------------------------------------------------
# SHOULDER PADS
# ---------------------------------------------------------------------------
for side, sx in [("L", -1), ("R", 1)]:
    sp = create_sphere(f"ShoulderPad.{side}", 0.12,
                       (sx * 0.35, 0, NECK_Y - 0.05), mat_accent_blue, 20)
    sp.scale = (1.0, 0.8, 0.7)
    bpy.ops.object.transform_apply(scale=True)
    all_objects.append(sp)

# ---------------------------------------------------------------------------
# ARMS
# ---------------------------------------------------------------------------
for side, sx in [("L", -1), ("R", 1)]:
    arm_x = sx * 0.40

    # Upper arm
    ua = create_cylinder(f"UpperArm.{side}", 0.09, 0.22,
                         (arm_x, 0, NECK_Y - 0.18), mat_suit_gray)
    add_smooth(ua, 1)
    all_objects.append(ua)

    # Elbow joint
    ej = create_sphere(f"Elbow.{side}", 0.09,
                       (arm_x, 0, NECK_Y - 0.30), mat_suit_gray, 16)
    all_objects.append(ej)

    # Lower arm
    la = create_cylinder(f"LowerArm.{side}", 0.08, 0.20,
                         (arm_x, 0, NECK_Y - 0.42), mat_suit_white)
    add_smooth(la, 1)
    all_objects.append(la)

    # Blue stripe on lower arm
    arm_stripe = create_cylinder(f"ArmStripe.{side}", 0.085, 0.03,
                                 (arm_x, 0, NECK_Y - 0.36), mat_accent_blue, 20)
    all_objects.append(arm_stripe)

    # Hand/glove
    hand = create_sphere(f"Hand.{side}", 0.08,
                         (arm_x, 0, NECK_Y - 0.55), mat_suit_dark, 16)
    hand.scale = (0.9, 0.7, 1.0)
    bpy.ops.object.transform_apply(scale=True)
    all_objects.append(hand)

# Arm equipment box (right forearm)
arm_box = create_cube("ArmEquipment", 0.05,
                      (0.45, -0.05, NECK_Y - 0.45),
                      (1.0, 0.6, 0.8), mat_suit_gray)
all_objects.append(arm_box)

# ---------------------------------------------------------------------------
# HIP / BELT
# ---------------------------------------------------------------------------
hip = create_cylinder("Hip", 0.33, 0.12, (0, 0, HIP_Y), mat_suit_gray)
add_smooth(hip, 1)
all_objects.append(hip)

# Belt
belt = create_torus("Belt", 0.33, 0.025, (0, 0, HIP_Y + 0.02), mat_suit_dark)
all_objects.append(belt)

# ---------------------------------------------------------------------------
# TUBES / PIPES (from hip area)
# ---------------------------------------------------------------------------
for i, x_off in enumerate([-0.08, 0.0, 0.08]):
    # Simple cylinders curved forward as approximation
    pipe = create_cylinder(f"Pipe.{i}", 0.015, 0.18,
                           (x_off, -0.25, HIP_Y - 0.05), mat_pipe, 12)
    pipe.rotation_euler = (0.5, 0, i * 0.15 - 0.15)
    bpy.ops.object.transform_apply(rotation=True)
    all_objects.append(pipe)

# Pipe connectors (small spheres at ends)
for i, x_off in enumerate([-0.08, 0.0, 0.08]):
    pc = create_sphere(f"PipeEnd.{i}", 0.02,
                       (x_off, -0.32, HIP_Y - 0.12), mat_suit_dark, 10)
    all_objects.append(pc)

# ---------------------------------------------------------------------------
# LEGS
# ---------------------------------------------------------------------------
for side, sx in [("L", -1), ("R", 1)]:
    leg_x = sx * 0.14

    # Upper leg
    ul = create_cylinder(f"UpperLeg.{side}", 0.11, UPPER_LEG,
                         (leg_x, 0, HIP_Y - UPPER_LEG / 2), mat_suit_white)
    add_smooth(ul, 1)
    all_objects.append(ul)

    # Knee joint
    kj = create_sphere(f"Knee.{side}", 0.10,
                       (leg_x, 0, HIP_Y - UPPER_LEG), mat_suit_gray, 16)
    all_objects.append(kj)

    # Blue knee detail
    kd = create_cylinder(f"KneeDetail.{side}", 0.105, 0.02,
                         (leg_x, -0.02, HIP_Y - UPPER_LEG), mat_accent_blue, 16)
    all_objects.append(kd)

    # Lower leg
    ll = create_cylinder(f"LowerLeg.{side}", 0.10, LOWER_LEG,
                         (leg_x, 0, FOOT_Y + BOOT_H + LOWER_LEG / 2), mat_suit_white)
    add_smooth(ll, 1)
    all_objects.append(ll)

    # Boot
    boot = create_cube(f"Boot.{side}", 0.20,
                       (leg_x, -0.02, FOOT_Y + BOOT_H / 2),
                       (1.0, 1.3, 0.8), mat_boot)
    add_smooth(boot, 1)
    all_objects.append(boot)

# ---------------------------------------------------------------------------
# JOIN all mesh objects into one
# ---------------------------------------------------------------------------
# Convert text to mesh first
for obj in all_objects:
    if obj.type == 'FONT':
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        bpy.ops.object.convert(target='MESH')
        obj.select_set(False)

# Select all mesh objects and join
bpy.ops.object.select_all(action='DESELECT')
mesh_objects = [o for o in all_objects if o.type == 'MESH']
for obj in mesh_objects:
    obj.select_set(True)
bpy.context.view_layer.objects.active = mesh_objects[0]
bpy.ops.object.join()
body_mesh = bpy.context.active_object
body_mesh.name = "AstronautBody"

# Apply all modifiers
for mod in body_mesh.modifiers[:]:
    try:
        bpy.ops.object.modifier_apply(modifier=mod.name)
    except:
        body_mesh.modifiers.remove(mod)

bpy.ops.object.select_all(action='DESELECT')

# ---------------------------------------------------------------------------
# ARMATURE (skeleton)
# ---------------------------------------------------------------------------
ARM_X = 0.40
LEG_X = 0.14

# Bone positions (head, tail) — "head" is root end, "tail" is tip
bone_defs = {
    # Core spine
    "Root":       ((0, 0, HIP_Y),          (0, 0, HIP_Y + 0.15)),
    "Spine":      ((0, 0, HIP_Y + 0.15),   (0, 0, CHEST_Y)),
    "Chest":      ((0, 0, CHEST_Y),         (0, 0, NECK_Y)),
    "Neck":       ((0, 0, NECK_Y),          (0, 0, NECK_Y + 0.1)),
    "Head":       ((0, 0, NECK_Y + 0.1),    (0, 0, HEAD_Y + HEAD_R)),
    # Left arm
    "Shoulder.L": ((0, 0, NECK_Y - 0.02),   (-ARM_X * 0.5, 0, NECK_Y - 0.05)),
    "UpperArm.L": ((-ARM_X * 0.5, 0, NECK_Y - 0.05), (-ARM_X, 0, NECK_Y - 0.18)),
    "LowerArm.L": ((-ARM_X, 0, NECK_Y - 0.18), (-ARM_X, 0, NECK_Y - 0.42)),
    "Hand.L":     ((-ARM_X, 0, NECK_Y - 0.42), (-ARM_X, 0, NECK_Y - 0.55)),
    # Right arm
    "Shoulder.R": ((0, 0, NECK_Y - 0.02),   (ARM_X * 0.5, 0, NECK_Y - 0.05)),
    "UpperArm.R": ((ARM_X * 0.5, 0, NECK_Y - 0.05), (ARM_X, 0, NECK_Y - 0.18)),
    "LowerArm.R": ((ARM_X, 0, NECK_Y - 0.18), (ARM_X, 0, NECK_Y - 0.42)),
    "Hand.R":     ((ARM_X, 0, NECK_Y - 0.42), (ARM_X, 0, NECK_Y - 0.55)),
    # Left leg
    "Hip.L":      ((0, 0, HIP_Y),           (-LEG_X, 0, HIP_Y - 0.02)),
    "UpperLeg.L": ((-LEG_X, 0, HIP_Y - 0.02), (-LEG_X, 0, HIP_Y - UPPER_LEG)),
    "LowerLeg.L": ((-LEG_X, 0, HIP_Y - UPPER_LEG), (-LEG_X, 0, FOOT_Y + BOOT_H)),
    "Foot.L":     ((-LEG_X, 0, FOOT_Y + BOOT_H), (-LEG_X, -0.08, FOOT_Y)),
    # Right leg
    "Hip.R":      ((0, 0, HIP_Y),           (LEG_X, 0, HIP_Y - 0.02)),
    "UpperLeg.R": ((LEG_X, 0, HIP_Y - 0.02), (LEG_X, 0, HIP_Y - UPPER_LEG)),
    "LowerLeg.R": ((LEG_X, 0, HIP_Y - UPPER_LEG), (LEG_X, 0, FOOT_Y + BOOT_H)),
    "Foot.R":     ((LEG_X, 0, FOOT_Y + BOOT_H), (LEG_X, -0.08, FOOT_Y)),
}

# Parent relationships
bone_parents = {
    "Spine": "Root", "Chest": "Spine", "Neck": "Chest", "Head": "Neck",
    "Shoulder.L": "Chest", "UpperArm.L": "Shoulder.L", "LowerArm.L": "UpperArm.L", "Hand.L": "LowerArm.L",
    "Shoulder.R": "Chest", "UpperArm.R": "Shoulder.R", "LowerArm.R": "UpperArm.R", "Hand.R": "LowerArm.R",
    "Hip.L": "Root", "UpperLeg.L": "Hip.L", "LowerLeg.L": "UpperLeg.L", "Foot.L": "LowerLeg.L",
    "Hip.R": "Root", "UpperLeg.R": "Hip.R", "LowerLeg.R": "UpperLeg.R", "Foot.R": "LowerLeg.R",
}

# Create armature
bpy.ops.object.armature_add(location=(0, 0, 0))
armature_obj = bpy.context.active_object
armature_obj.name = "AstronautArmature"
armature = armature_obj.data
armature.name = "AstronautArmature"

# Edit mode: create bones
bpy.ops.object.mode_set(mode='EDIT')

# Remove the default bone
armature.edit_bones.remove(armature.edit_bones[0])

# Create all bones
for bone_name, (head_pos, tail_pos) in bone_defs.items():
    bone = armature.edit_bones.new(bone_name)
    bone.head = Vector(head_pos)
    bone.tail = Vector(tail_pos)

# Set parent relationships
for child_name, parent_name in bone_parents.items():
    armature.edit_bones[child_name].parent = armature.edit_bones[parent_name]

bpy.ops.object.mode_set(mode='OBJECT')

print("✅ Armature created with", len(bone_defs), "bones")

# ---------------------------------------------------------------------------
# SKINNING — assign vertex groups by proximity to bones
# ---------------------------------------------------------------------------
# Parent mesh to armature with automatic weights
bpy.ops.object.select_all(action='DESELECT')
body_mesh.select_set(True)
armature_obj.select_set(True)
bpy.context.view_layer.objects.active = armature_obj
bpy.ops.object.parent_set(type='ARMATURE_AUTO')

print("✅ Mesh skinned to armature with automatic weights")

# ---------------------------------------------------------------------------
# ANIMATIONS (Blender 5.x layered action API)
# ---------------------------------------------------------------------------

# Ensure armature is active and set pose bone rotation mode
bpy.context.view_layer.objects.active = armature_obj
bpy.ops.object.mode_set(mode='POSE')
for pb in armature_obj.pose.bones:
    pb.rotation_mode = 'XYZ'
bpy.ops.object.mode_set(mode='OBJECT')

if armature_obj.animation_data is None:
    armature_obj.animation_data_create()

def create_anim_action(name):
    """Create a Blender 5.x layered action with slot and channelbag."""
    action = bpy.data.actions.new(name)
    action.use_fake_user = True
    slot = action.slots.new(id_type='OBJECT', name=f"OB{armature_obj.name}")
    layer = action.layers.new(name=name)
    strip = layer.strips.new(type='KEYFRAME')
    cb = strip.channelbags.new(slot=slot)
    return action, slot, cb

def key_bone(cb, bone_name, prop, idx, frame, value):
    """Insert keyframe into a channelbag."""
    data_path = f'pose.bones["{bone_name}"].{prop}'
    fc = cb.fcurves.find(data_path, index=idx)
    if fc is None:
        fc = cb.fcurves.new(data_path, index=idx)
    kf = fc.keyframe_points.insert(frame, value)
    kf.interpolation = 'BEZIER'

def key_loc(cb, bone, axis, frame, val):
    key_bone(cb, bone, 'location', axis, frame, val)

def key_rot(cb, bone, axis, frame, deg):
    key_bone(cb, bone, 'rotation_euler', axis, frame, math.radians(deg))

# --- IDLE (2s loop, frames 1-48) ---
idle_action, idle_slot, idle_cb = create_anim_action("idle")
for f in [1, 24, 48]:
    key_loc(idle_cb, "Root", 2, f, 0.02 if f == 24 else 0.0)
    key_rot(idle_cb, "Chest", 0, f, 2.0 if f == 24 else 0.0)
    key_rot(idle_cb, "Head", 1, f, 3.0 if f == 24 else 0.0)
print("✅ idle animation created")

# --- WALK (1s loop, frames 1-24) ---
walk_action, walk_slot, walk_cb = create_anim_action("walk")
for f in [1, 6, 12, 18, 24]:
    key_loc(walk_cb, "Root", 2, f, 0.03 if f in [6, 18] else 0.0)
for f in [1, 12, 24]:
    l_ang = -20.0 if f == 12 else 20.0
    key_rot(walk_cb, "UpperLeg.L", 0, f, l_ang)
    key_rot(walk_cb, "UpperLeg.R", 0, f, -l_ang)
    key_rot(walk_cb, "UpperArm.L", 0, f, -l_ang * 0.75)
    key_rot(walk_cb, "UpperArm.R", 0, f, l_ang * 0.75)
    key_rot(walk_cb, "Spine", 2, f, 3.0 if f == 12 else -3.0)
print("✅ walk animation created")

# --- WAVE (1.5s single, frames 1-36) ---
wave_action, wave_slot, wave_cb = create_anim_action("wave")
for f, ang in [(1, 0), (6, -120), (30, -120), (36, 0)]:
    key_rot(wave_cb, "UpperArm.R", 2, f, ang)
for f, ang in [(1, 0), (6, -30), (30, -30), (36, 0)]:
    key_rot(wave_cb, "LowerArm.R", 0, f, ang)
key_rot(wave_cb, "Hand.R", 2, 1, 0)
for i, f in enumerate([8, 12, 16, 20, 24, 28]):
    key_rot(wave_cb, "Hand.R", 2, f, 20.0 if i % 2 == 0 else -20.0)
key_rot(wave_cb, "Hand.R", 2, 36, 0)
print("✅ wave animation created")

# --- SIT (2s loop, frames 1-48) ---
sit_action, sit_slot, sit_cb = create_anim_action("sit")
for side in ["L", "R"]:
    for f in [1, 48]:
        key_rot(sit_cb, f"UpperLeg.{side}", 0, f, -90)
        key_rot(sit_cb, f"LowerLeg.{side}", 0, f, 90)
for f in [1, 48]:
    key_rot(sit_cb, "Spine", 0, f, 5)
    key_loc(sit_cb, "Root", 2, f, -0.15)
key_rot(sit_cb, "Head", 1, 1, -5)
key_rot(sit_cb, "Head", 1, 24, 5)
key_rot(sit_cb, "Head", 1, 48, -5)
key_rot(sit_cb, "Chest", 0, 1, 5)
key_rot(sit_cb, "Chest", 0, 24, 6)
key_rot(sit_cb, "Chest", 0, 48, 5)
print("✅ sit animation created")

# --- SLEEP (2s loop, frames 1-48) ---
sleep_action, sleep_slot, sleep_cb = create_anim_action("sleep")
for side in ["L", "R"]:
    for f in [1, 48]:
        key_rot(sleep_cb, f"UpperLeg.{side}", 0, f, -90)
        key_rot(sleep_cb, f"LowerLeg.{side}", 0, f, 90)
        key_rot(sleep_cb, f"UpperArm.{side}", 0, f, 10)
for f in [1, 48]:
    key_loc(sleep_cb, "Root", 2, f, -0.15)
    key_rot(sleep_cb, "Head", 0, f, 20)
key_rot(sleep_cb, "Spine", 0, 1, 8)
key_rot(sleep_cb, "Spine", 0, 24, 9)
key_rot(sleep_cb, "Spine", 0, 48, 8)
print("✅ sleep animation created")

# --- Push all actions to NLA tracks ---
all_actions = [
    ("idle", idle_action, idle_slot),
    ("walk", walk_action, walk_slot),
    ("wave", wave_action, wave_slot),
    ("sit", sit_action, sit_slot),
    ("sleep", sleep_action, sleep_slot),
]

for track_name, action, slot in all_actions:
    track = armature_obj.animation_data.nla_tracks.new()
    track.name = track_name
    strip = track.strips.new(track_name, 1, action)
    strip.action = action
    strip.action_slot = slot

armature_obj.animation_data.action = None
print("✅ All 5 animations pushed to NLA tracks")

# ---------------------------------------------------------------------------
# Save preview
# ---------------------------------------------------------------------------
# ---------------------------------------------------------------------------
# EXPORT glTF
# ---------------------------------------------------------------------------
import os

glb_path = os.path.expanduser("~/Code/mark-portfolio/public/astronaut.glb")

bpy.ops.export_scene.gltf(
    filepath=glb_path,
    export_format='GLB',
    export_animations=True,
    export_skins=True,
    export_apply=True,
    export_nla_strips=True,
    export_extras=False,
    export_cameras=False,
    export_lights=False,
)

file_size = os.path.getsize(glb_path)
print(f"✅ Exported {glb_path} ({file_size / 1024:.0f} KB)")

# Also save .blend for debugging
bpy.ops.wm.save_as_mainfile(filepath="/tmp/astronaut-preview.blend")
print("✅ Done")
