"""
Renders the body of the deck the page ends on, in three pieces that sit side by
side: the left end (key well, status slot, badge), a middle strip of grille
that the page stretches to any width, and the right end (the scope plate).
Run with:  blender -b -P render_deck.py -- <out_dir>
Also writes layout.json: where the overlays go (status text, badge, key block,
scope screen), in key units from each piece's top-left corner.
The camera and lights match render_keys.py, so the keys sit in it naturally.
"""
import bpy, bmesh, math, sys, os, json
from mathutils import Vector

OUT = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else "//deck"
os.makedirs(OUT, exist_ok=True)
PX = 240                       # pixels per key unit, as for the keys
T = math.radians(30)           # camera tilt from straight down, as for the keys
D = 4.15                       # depth of the deck's top surface, front to back
TOP_MARGIN = 0.28              # room above the back edge
RIGHT = Vector((1, 0, 0)); UP = Vector((0, math.cos(T), math.sin(T)))
FWD = Vector((0, math.sin(T), -math.cos(T)))

# the pieces, by x range of the model
LEFT_X = (-0.18, 4.3); MID_X = (4.3, 4.9); RIGHT_X = (4.9, 9.53)
SLAB_X = (0.0, 9.35)
WELL = (0.18, 4.12, 0.08, 3.2)          # x0, x1, y0, y1 of the key well
LCD = (0.3, 3.5, 3.42, 3.82)            # the status slot
BADGE = (3.86, 3.62, 0.21)              # x, y, radius
GRILLE = (4.12, 5.42, 0.42, 3.3)        # grooves run across x, stacked in y
PLATE_C = 7.38; PLATE_S = 3.38          # the scope plate: centre x, size

def hexc(h):
    h = h.lstrip("#"); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple([x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c] + [1.0])

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = "CYCLES"; sc.cycles.samples = 64; sc.cycles.use_denoising = True
sc.render.film_transparent = True
sc.render.image_settings.file_format = "PNG"; sc.render.image_settings.color_mode = "RGBA"
sc.view_settings.view_transform = "Standard"; sc.view_settings.look = "Medium High Contrast"
world = bpy.data.worlds.new("w"); sc.world = world; world.use_nodes = True
world.node_tree.nodes["Background"].inputs[0].default_value = hexc("#0b0b0d")
world.node_tree.nodes["Background"].inputs[1].default_value = 0.25

def area(name, loc, rot, size, energy, color="#ffffff"):
    d = bpy.data.lights.new(name, "AREA"); d.size = size; d.energy = energy; d.color = hexc(color)[:3]
    o = bpy.data.objects.new(name, d); o.location = loc; o.rotation_euler = [math.radians(a) for a in rot]
    sc.collection.objects.link(o)

# the same rig as the keys, stretched along the deck, plus green light from the glow behind
for i, x in enumerate((1.5, 4.6, 7.7)):
    area(f"key{i}", (x, -1.6, 3.4), (25, 0, 0), 3.0, 120)
area("fill", (-3, -1, 1.4), (70, 0, -60), 3.0, 18, "#dfe8ff")
for i, x in enumerate((1.5, 4.6, 7.7)):
    area(f"rim{i}", (x, D + 2.6, 1.8), (-60, 0, 0), 3.0, 22, "#d4f7df")

# ---------------- materials ----------------
def mat(name, color, rough, metal=0.0, spec=0.5):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = hexc(color)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    b.inputs["Specular IOR Level"].default_value = spec
    return m
BODY = mat("body", "#252529", 0.42, 0.15)
DARK = mat("dark", "#0c0c0e", 0.5)
GLASS = mat("glass", "#050806", 0.08, 0.0, 0.8)
LCDG = mat("lcdglass", "#0a120c", 0.12, 0.0, 0.7)
STEEL = mat("steel", "#9a98a0", 0.28, 1.0)
BEZEL = mat("bezel", "#0e0e10", 0.3, 0.2)

def link(o): sc.collection.objects.link(o); return o

def rounded_box(name, x0, x1, y0, y1, z0, z1, r, seg=6, material=None):
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co = Vector(((x1 if v.co.x > 0 else x0), (y1 if v.co.y > 0 else y0), (z1 if v.co.z > 0 else z0)))
    bm.to_mesh(me); bm.free()
    o = link(bpy.data.objects.new(name, me))
    if r:
        b = o.modifiers.new("bevel", "BEVEL"); b.width = r; b.segments = seg; b.limit_method = "NONE"
    if material: o.data.materials.append(material)
    for p in o.data.polygons: p.use_smooth = True
    return o

def cutter(o): o.hide_render = True; o.display_type = "WIRE"; return o

def subtract(target, tool):
    m = target.modifiers.new("cut_" + tool.name, "BOOLEAN"); m.object = tool; m.operation = "DIFFERENCE"; m.solver = "EXACT"

# ---------------- the slab ----------------
# a thick block; its front runs past the bottom of the picture, its back edge and
# outer corners are rounded
slab = rounded_box("slab", SLAB_X[0], SLAB_X[1], -1.5, D, -1.2, 0.0, 0.24, 8, BODY)

# the key well: a rounded pocket the keys sit in
subtract(slab, cutter(rounded_box("well", WELL[0], WELL[1], WELL[2], WELL[3], -0.16, 0.5, 0.12, 6)))
# the status slot: a long rounded pocket with dark glass in it
subtract(slab, cutter(rounded_box("lcd", LCD[0], LCD[1], LCD[2], LCD[3], -0.07, 0.5, 0.19, 8)))
lcd_glass = rounded_box("lcdglass", LCD[0] + 0.02, LCD[1] - 0.02, LCD[2] + 0.02, LCD[3] - 0.02, -0.08, -0.05, 0.16, 6, LCDG)
# the badge: a round pocket with a domed dark cap
bpy.ops.mesh.primitive_cylinder_add(radius=BADGE[2], depth=1, location=(BADGE[0], BADGE[1], 0.4), vertices=64)
subtract(slab, cutter(bpy.context.active_object))
bpy.ops.mesh.primitive_uv_sphere_add(radius=BADGE[2] - 0.025, location=(BADGE[0], BADGE[1], -0.09), segments=48, ring_count=24)
badge = bpy.context.active_object; badge.scale.z = 0.45; badge.data.materials.append(BEZEL)
for p in badge.data.polygons: p.use_smooth = True

# the grille: grooves across the middle, rounded at both ends
bm = bmesh.new(); n = 15; pitch = (GRILLE[3] - GRILLE[2]) / n
for i in range(n):
    y0 = GRILLE[2] + i * pitch + pitch * 0.32
    r = bmesh.ops.create_cube(bm, size=1.0)
    for v in r["verts"]:
        v.co = Vector(((GRILLE[1] if v.co.x > 0 else GRILLE[0]), (y0 + pitch * 0.62 if v.co.y > 0 else y0), (0.5 if v.co.z > 0 else -0.14)))
me = bpy.data.meshes.new("grooves"); bm.to_mesh(me); bm.free()
grooves = link(bpy.data.objects.new("grooves", me))
gb = grooves.modifiers.new("bevel", "BEVEL"); gb.width = pitch * 0.25; gb.segments = 4; gb.limit_method = "NONE"
subtract(slab, cutter(grooves))
# soften the rims the cuts left
rim = slab.modifiers.new("rims", "BEVEL"); rim.width = 0.014; rim.segments = 3; rim.limit_method = "ANGLE"; rim.angle_limit = math.radians(50)

# ---------------- the scope plate ----------------
# stood up so its face looks straight at the camera; its bottom edge rests on the deck
half = PLATE_S / 2
zc = half * math.sin(T)
plate_sy = 1.86                       # where the plate's centre sits on the screen
yc = (plate_sy - zc * math.sin(T)) / math.cos(T)

plate = rounded_box("plate", -half, half, -half, half, -0.5, 0.0, 0.16, 8, BODY)
plate.rotation_euler = (T, 0, 0); plate.location = (PLATE_C, yc, zc)

# the bezel: a thick black ring standing off the face, the glass sunk inside it
GLASS_R = 1.16
bpy.ops.mesh.primitive_cylinder_add(radius=GLASS_R + 0.24, depth=0.22, vertices=128)
ring = bpy.context.active_object; ring.data.materials.append(BEZEL)
bpy.ops.mesh.primitive_cylinder_add(radius=GLASS_R, depth=1, vertices=128)
hole = cutter(bpy.context.active_object)
m = ring.modifiers.new("hole", "BOOLEAN"); m.object = hole; m.operation = "DIFFERENCE"; m.solver = "EXACT"
rb = ring.modifiers.new("bevel", "BEVEL"); rb.width = 0.05; rb.segments = 5; rb.limit_method = "ANGLE"
bpy.ops.mesh.primitive_cylinder_add(radius=GLASS_R + 0.02, depth=0.02, vertices=128)
glass = bpy.context.active_object; glass.data.materials.append(GLASS)
# a thin steel lip round the glass
bpy.ops.mesh.primitive_torus_add(major_radius=GLASS_R + 0.02, minor_radius=0.025, major_segments=128, minor_segments=12)
lip = bpy.context.active_object; lip.data.materials.append(STEEL)
for o, z in ((ring, 0.11), (hole, 0.11), (glass, 0.02), (lip, 0.2)):
    o.parent = plate; o.location = (0, 0, z)
    for p in getattr(o.data, "polygons", []): p.use_smooth = True

# four standoff screws in the corners
for sx in (-1, 1):
    for sy in (-1, 1):
        bpy.ops.mesh.primitive_cylinder_add(radius=0.11, depth=0.14, vertices=48)
        post = bpy.context.active_object; post.data.materials.append(BEZEL)
        post.parent = plate; post.location = (sx * (half - 0.25), sy * (half - 0.25), 0.07)
        bpy.ops.mesh.primitive_cylinder_add(radius=0.075, depth=0.06, vertices=6)
        head = bpy.context.active_object; head.data.materials.append(STEEL)
        head.parent = plate; head.location = (sx * (half - 0.25), sy * (half - 0.25), 0.17)
        bw = head.modifiers.new("bevel", "BEVEL"); bw.width = 0.012; bw.segments = 2

# ---------------- camera ----------------
cam_d = bpy.data.cameras.new("cam"); cam_d.type = "ORTHO"; cam_d.sensor_fit = "HORIZONTAL"
cam = link(bpy.data.objects.new("cam", cam_d)); sc.camera = cam
cam.rotation_euler = (T, 0, 0)
SY_TOP = D * math.cos(T) + TOP_MARGIN; SY_BOT = 0.0

def frame(x0, x1):
    w = x1 - x0; h = SY_TOP - SY_BOT
    cx = (x0 + x1) / 2; cy = (SY_TOP + SY_BOT) / 2
    cam.location = RIGHT * cx + UP * cy - FWD * 20
    cam_d.ortho_scale = w
    sc.render.resolution_x = round(w * PX); sc.render.resolution_y = round(h * PX)
    return x0

def to_piece(x0, wx, wy, wz=0.0):
    # a world point to key units from the piece's top-left corner
    p = Vector((wx, wy, wz))
    return (p.dot(RIGHT) - x0, SY_TOP - p.dot(UP))

layout = {"height": SY_TOP - SY_BOT, "left_w": LEFT_X[1] - LEFT_X[0], "mid_w": MID_X[1] - MID_X[0], "right_w": RIGHT_X[1] - RIGHT_X[0]}
lx0 = LEFT_X[0]
a = to_piece(lx0, LCD[0], LCD[3], -0.06); b = to_piece(lx0, LCD[1], LCD[2], -0.06)
layout["lcd"] = {"x": a[0], "y": a[1], "w": b[0] - a[0], "h": b[1] - a[1]}
c = to_piece(lx0, BADGE[0], BADGE[1], 0)
layout["badge"] = {"cx": c[0], "cy": c[1], "r": BADGE[2]}
a = to_piece(lx0, WELL[0], WELL[3], -0.16); b = to_piece(lx0, WELL[1], WELL[2], -0.16)
layout["well"] = {"x": a[0], "y": a[1], "w": b[0] - a[0], "h": b[1] - a[1]}
# the glass faces the camera, so it is a true circle on screen
gc = Vector((PLATE_C, yc, zc)) - FWD * 0.02
g = to_piece(RIGHT_X[0], gc.x, gc.y, gc.z)
layout["glass"] = {"cx": g[0], "cy": g[1], "r": GLASS_R}

for name, (x0, x1) in (("left", LEFT_X), ("mid", MID_X), ("right", RIGHT_X)):
    frame(x0, x1)
    sc.render.filepath = os.path.join(OUT, f"deck-{name}.png")
    bpy.ops.render.render(write_still=True)
    print("rendered", name)

json.dump(layout, open(os.path.join(OUT, "layout.json"), "w"), indent=2)
print(json.dumps(layout))
