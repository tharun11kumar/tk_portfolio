"""
Renders the deck's keycaps as transparent PNGs, one per key.
Run with:  blender -b -P render_keys.py -- <out_dir>
Each cap is a tapered, rounded block, its label
printed on the face, lit like a small studio shot and seen from a little
above and in front (orthographic, so every key lines up on the grid).
"""
import bpy, bmesh, math, sys, os
from mathutils import Vector

OUT = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else "//keys"
os.makedirs(OUT, exist_ok=True)
FONT = "C:/Windows/Fonts/segoeuib.ttf"   # static bold; variable fonts render with holes

U = 1.0            # one key unit
GAP = 0.04         # space between neighbouring caps
H = 0.52           # cap height
PX_PER_U = 240     # render resolution per key unit

# name, label, width in units, colour key
KEYS = [
    ("home", "HOME", 1.75, "black"), ("work", "WORK", 1, "frost"), ("ig", "IG", 1, "sunset"),
    ("at", "@", 1, "sand"), ("hire", "HIRE ME", 1.75, "black"), ("in", "IN", 1, "black"),
    ("photos", "PHOTOS", 1.75, "black"), ("about", "ABOUT", 1, "candy"), ("roles", "ROLES", 1, "cobalt"),
]

def hexc(h, a=1.0):
    h = h.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    # sRGB to linear for Blender colour sockets
    c = [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c]
    return (*c, a)

# colour: base, ink, roughness, transmission (frosted keys let light through)
STYLE = {
    "black":  ("#1c1c20", "#f2efe8", 0.32, 0.0),
    "frost":  ("#bcdcff", "#3a6fc0", 0.25, 0.4),
    "sand":   ("#e5bd7f", "#3d2b14", 0.4, 0.0),
    "candy":  ("#f59be0", "#9a2f8c", 0.34, 0.0),
    "cobalt": ("#2b42f2", "#f4f6ff", 0.3, 0.0),
    "sunset": (None,      "#ffffff", 0.3, 0.0),
}

# ---------------- scene ----------------
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = "CYCLES"
sc.cycles.samples = 64
sc.cycles.use_denoising = True
sc.render.film_transparent = True
sc.render.image_settings.file_format = "PNG"
sc.render.image_settings.color_mode = "RGBA"
# Standard keeps the plastic's colours saturated (AgX washes bright colours out)
sc.view_settings.view_transform = "Standard"
sc.view_settings.look = "Medium High Contrast"

world = bpy.data.worlds.new("w"); sc.world = world
world.use_nodes = True
world.node_tree.nodes["Background"].inputs[0].default_value = hexc("#0b0b0d")
world.node_tree.nodes["Background"].inputs[1].default_value = 0.25

def area(name, loc, rot, size, energy, color="#ffffff"):
    d = bpy.data.lights.new(name, "AREA"); d.size = size; d.energy = energy; d.color = hexc(color)[:3]
    o = bpy.data.objects.new(name, d); o.location = loc; o.rotation_euler = [math.radians(a) for a in rot]
    sc.collection.objects.link(o)

# a big soft key light above and in front, a cool fill, and a rim from behind
area("key", (0, -1.6, 3.4), (25, 0, 0), 3.0, 75)
area("fill", (-3, -1, 1.4), (70, 0, -60), 3.0, 18, "#dfe8ff")
area("rim", (0, 2.6, 1.8), (-60, 0, 0), 2.5, 30)

# the camera: orthographic, looking down about 32 degrees from the front
cam_d = bpy.data.cameras.new("cam"); cam_d.type = "ORTHO"
cam = bpy.data.objects.new("cam", cam_d); sc.collection.objects.link(cam); sc.camera = cam
TILT = math.radians(30)  # from straight down

# the shadow under the cap: an invisible floor that only catches shadow
bpy.ops.mesh.primitive_plane_add(size=20, location=(0, 0, 0))
floor = bpy.context.active_object; floor.is_shadow_catcher = True

# ---------------- materials ----------------
def plastic(name, style):
    base, ink, rough, trans = STYLE[style]
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes["Principled BSDF"]
    b.inputs["Roughness"].default_value = rough
    if trans:
        b.inputs["Transmission Weight"].default_value = trans * 0.6
        b.inputs["Subsurface Weight"].default_value = 0.3
    if base:
        b.inputs["Base Color"].default_value = hexc(base)
    else:
        # sunset: orange to pink to violet, running up and across the cap
        tc = nt.nodes.new("ShaderNodeTexCoord"); sep = nt.nodes.new("ShaderNodeSeparateXYZ")
        mix = nt.nodes.new("ShaderNodeMath"); mix.operation = "MULTIPLY_ADD"
        nt.links.new(tc.outputs["Generated"], sep.inputs[0])
        # factor = 0.5 * (1 - x) + 0.5 * z
        inv = nt.nodes.new("ShaderNodeMath"); inv.operation = "SUBTRACT"; inv.inputs[0].default_value = 1.0
        nt.links.new(sep.outputs["X"], inv.inputs[1])
        nt.links.new(inv.outputs[0], mix.inputs[0]); mix.inputs[1].default_value = 0.5
        half = nt.nodes.new("ShaderNodeMath"); half.operation = "MULTIPLY"; half.inputs[1].default_value = 0.5
        nt.links.new(sep.outputs["Z"], half.inputs[0]); nt.links.new(half.outputs[0], mix.inputs[2])
        ramp = nt.nodes.new("ShaderNodeValToRGB")
        el = ramp.color_ramp.elements
        el[0].position = 0.15; el[0].color = hexc("#7a45ff")
        el[1].position = 0.9; el[1].color = hexc("#ffb04a")
        mid = el.new(0.5); mid.color = hexc("#ff3f7a")
        nt.links.new(mix.outputs[0], ramp.inputs[0])
        nt.links.new(ramp.outputs[0], b.inputs["Base Color"])
    return m

def ink_mat(name, style):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = hexc(STYLE[style][1])
    b.inputs["Roughness"].default_value = 0.5
    return m

# ---------------- the cap ----------------
def make_cap(width_u):
    w = width_u * U - GAP; d = U - GAP
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        x, y, z = v.co
        top = z > 0
        # the top face is smaller than the base: in at the sides, more at the front
        sx = (w / 2 - (0.13 if top else 0)) * (1 if x > 0 else -1)
        if y < 0: sy = -(d / 2 - (0.16 if top else 0))
        else: sy = d / 2 - (0.06 if top else 0)
        # the top leans toward the viewer a little, like a sculpted row
        sz = (H - (0.05 if y < 0 else 0)) if top else 0
        v.co = Vector((sx, sy, sz))
    me = bpy.data.meshes.new("cap"); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new("cap", me); sc.collection.objects.link(o)
    bev = o.modifiers.new("bevel", "BEVEL"); bev.width = 0.11; bev.segments = 8; bev.limit_method = "NONE"
    sub = o.modifiers.new("smooth", "SUBSURF"); sub.levels = 2; sub.render_levels = 2
    for p in o.data.polygons: p.use_smooth = True
    return o, w, d

def make_label(text, w, d):
    cu = bpy.data.curves.new("label", "FONT"); cu.body = text
    cu.font = bpy.data.fonts.load(FONT)
    cu.align_x = "CENTER"; cu.align_y = "CENTER"
    cu.size = 0.29; cu.extrude = 0.004; cu.space_character = 1.08
    o = bpy.data.objects.new("label", cu); sc.collection.objects.link(o)
    # on the top face, tilted with it (its front is 0.05 lower than its back)
    top_d = d - 0.22
    o.location = (0, 0.05, H - 0.025 + 0.002)
    o.rotation_euler = (math.atan2(0.05, top_d), 0, 0)
    return o

def frame_camera(w, d):
    # look at the cap from the front and above; fit it with a margin
    target = Vector((0, 0, H * 0.45))
    dirv = Vector((0, -math.sin(TILT), math.cos(TILT)))
    cam.location = target + dirv * 6
    cam.rotation_euler = (TILT, 0, 0)
    span_x = w + 0.2
    span_y = (d * math.cos(TILT) + H * math.sin(TILT)) + 0.35
    cam_d.ortho_scale = max(span_x, span_y)
    sc.render.resolution_x = int(round(PX_PER_U * span_x))
    sc.render.resolution_y = int(round(PX_PER_U * span_y))
    cam_d.shift_x = 0; cam_d.shift_y = 0
    # ortho_scale covers the larger side; keep the aspect exact
    if span_x >= span_y: cam_d.sensor_fit = "HORIZONTAL"
    else: cam_d.sensor_fit = "VERTICAL"

for name, label, wu, style in KEYS:
    cap, w, d = make_cap(wu)
    cap.data.materials.append(plastic("p_" + name, style))
    lab = make_label(label, w, d)
    lab.data.materials.append(ink_mat("i_" + name, style))
    frame_camera(w, d)
    sc.render.filepath = os.path.join(OUT, f"key-{name}.png")
    bpy.ops.render.render(write_still=True)
    for o in (cap, lab):
        bpy.data.objects.remove(o, do_unlink=True)
    print("rendered", name)
