"""
Porsche 911 (992 Turbo S) v3 — Panel Lines + Edge Creases + Subdivision L3
Blender 5.1 headless.
"""
import bpy, bmesh, math, os
from mathutils import Vector

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete()
for p in (bpy.data.meshes, bpy.data.materials, bpy.data.cameras, bpy.data.lights):
    for i in list(p): p.remove(i)
col = bpy.context.collection

def link(o): col.objects.link(o); return o
def smooth(o):
    for p in o.data.polygons: p.use_smooth = True
def asgn(o, k): o.data.materials.clear(); o.data.materials.append(M[k])

def mat(n, c, m=0.0, r=0.5):
    x = bpy.data.materials.new(n); x.use_nodes = True
    b = x.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*c, 1.0)
    b.inputs["Metallic"].default_value = m
    b.inputs["Roughness"].default_value = r
    return x

M = {
    'body':      mat("GT3_Silver",   (.68,.70,.73), m=.95, r=.06),
    'panel_gap': mat("PanelGap",     (.015,.015,.015),     r=.92),
    'black':     mat("Satin_Black",  (.04,.04,.04),        r=.55),
    'glass':     mat("Glass",        (.14,.22,.32),        r=.04),
    'chrome':    mat("Chrome",       (.92,.90,.88), m=1.0, r=.02),
    'red':       mat("Taillight",    (.90,.04,.01),        r=.10),
    'amber':     mat("Headlight",    (.95,.80,.25),        r=.08),
    'tire':      mat("Tire",         (.04,.04,.04),        r=.88),
    'rim':       mat("Rim",          (.82,.82,.80), m=.92, r=.08),
    'floor':     mat("Undertray",    (.08,.08,.08),        r=.80),
    'brake':     mat("Caliper",      (.85,.10,.02),        r=.35),
    'rubber':    mat("Rubber",       (.06,.06,.06),        r=.75),
}

# Headlight-specific material helpers
def mat_emit(n, c, strength=3.0):
    x = bpy.data.materials.new(n); x.use_nodes = True
    b = x.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*c, 1.0)
    b.inputs["Roughness"].default_value = 0.02
    for key in ("Emission Color", "Emission"):
        if key in b.inputs: b.inputs[key].default_value = (*c, 1.0); break
    for key in ("Emission Strength",):
        if key in b.inputs: b.inputs[key].default_value = strength; break
    return x

def mat_clear(n, c, alpha=0.22):
    x = bpy.data.materials.new(n); x.use_nodes = True
    b = x.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*c, alpha)
    b.inputs["Roughness"].default_value = 0.04
    for key in ("Transmission Weight", "Transmission"):
        if key in b.inputs: b.inputs[key].default_value = 0.90; break
    try: x.blend_method = 'BLEND'
    except Exception: pass
    return x

M['anthracite'] = mat("Anthracite",  (.08,.09,.10), m=0.30, r=0.40)
M['led_white']  = mat_emit("LED_White",  (.96,.98,1.0), strength=4.0)
M['lens_clear'] = mat_clear("LensClear", (.84,.93,1.0), alpha=0.20)

# 16-vertex ring cross-section (right side +Y, left side -Y)
def make_ring(x, wb, wd, y_h, z_h, y_u, z_u, y_g, y_r, zt):
    zb   = 0.085
    z_st = min(z_h * .50, .30)
    z_dm = min(z_h * .86, .62)
    z_gb = z_u + (zt - z_u) * .42
    v = [
        (x,  wb,   zb    ), (x,  wd,   z_st  ), (x,  wd,   z_dm  ),
        (x,  y_h,  z_h   ), (x,  y_u,  z_u   ), (x,  y_g,  z_gb  ),
        (x,  y_r,  zt    ), (x,  0.0,  zt+.02 ),
        (x, -y_r,  zt    ), (x, -y_g,  z_gb  ), (x, -y_u,  z_u   ),
        (x, -y_h,  z_h   ), (x, -wd,   z_dm  ), (x, -wd,   z_st  ),
        (x, -wb,   zb    ), (x,  0.0,  zb    ),
    ]
    return [Vector(p) for p in v]

# Interpolate all station parameters at an arbitrary x
def lerp_st(x_t, stations):
    for i in range(len(stations) - 1):
        x0, x1 = stations[i][0], stations[i+1][0]
        if x1 <= x_t <= x0:
            t = (x_t - x0) / (x1 - x0)
            return tuple(stations[i][j] + t*(stations[i+1][j]-stations[i][j])
                         for j in range(len(stations[i])))
    return None

def lerp_ring(x_t, stations):
    p = lerp_st(x_t, stations)
    return make_ring(*p) if p else None

# Insert supporting edge-loop stations ±d from each panel break
def add_panel_support(stations, breaks, d=0.003):
    extra = []
    for xp in breaks:
        for s in stations:
            if abs(s[0] - xp) < 0.001:
                pf = lerp_st(xp + d, stations)
                pr = lerp_st(xp - d, stations)
                if pf: extra.append((xp+d,) + pf[1:])
                if pr: extra.append((xp-d,) + pr[1:])
                break
    result = list(stations) + extra
    result.sort(key=lambda s: -s[0])
    return result

# Dark groove ring mesh that simulates a 4mm panel gap shadow
def panel_groove(name, x_pos, base_stations, width=0.004):
    ring = lerp_ring(x_pos, base_stations)
    if ring is None: return
    NV = len(ring)
    # Outer edge: slightly proud of body surface
    ro = [Vector((v.x + width*.6,  v.y*1.0012, v.z*1.0012)) for v in ring]
    # Inner edge: pushed inward ~3mm, simulating gap depth
    ri = [Vector((v.x - width*.4,  v.y*.9968,  v.z*.9968 )) for v in ring]
    me = bpy.data.meshes.new(name)
    ob = link(bpy.data.objects.new(name, me))
    bm2 = bmesh.new()
    vo = [bm2.verts.new(v) for v in ro]
    vi = [bm2.verts.new(v) for v in ri]
    for j in range(NV):
        j2 = (j+1) % NV
        bm2.faces.new([vo[j], vo[j2], vi[j2], vi[j]])
    bmesh.ops.recalc_face_normals(bm2, faces=bm2.faces)
    bm2.to_mesh(me); bm2.free()
    asgn(ob, 'panel_gap')

# BASE STATIONS (x, wb, wd, y_h, z_h, y_u, z_u, y_g, y_r, zt)
ST_BASE = [
    # FRONT BUMPER — egg-shaped
    ( 2.26, .28, .40, .42, .30, .34, .42, .22, .12, .26),
    ( 2.14, .40, .52, .54, .40, .44, .54, .30, .18, .40),
    ( 2.00, .54, .64, .66, .50, .54, .64, .40, .28, .54),  # panel: bumper→hood
    # HOOD
    ( 1.80, .68, .76, .78, .59, .56, .70, .40, .26, .62),
    ( 1.54, .75, .81, .83, .62, .54, .72, .38, .24, .64),
    ( 1.24, .79, .84, .86, .63, .52, .74, .36, .22, .65),
    ( 0.92, .80, .85, .87, .64, .52, .76, .36, .22, .66),  # panel: hood→A-pillar
    # WINDSHIELD + ROOF
    ( 0.62, .80, .85, .87, .64, .79, .88, .73, .66, 1.20),
    ( 0.26, .80, .85, .87, .64, .80, .91, .75, .70, 1.28),
    (-0.10, .80, .85, .87, .64, .80, .91, .75, .70, 1.28),
    (-0.42, .80, .85, .87, .64, .80, .90, .75, .70, 1.25),
    # C-PILLAR FASTBACK
    (-0.68, .81, .86, .89, .64, .82, .88, .75, .70, 1.14),
    (-0.92, .82, .87, .91, .63, .84, .86, .74, .69, 1.00),  # panel: door→rear-qtr
    (-1.14, .84, .87, .95, .63, .86, .84, .73, .67,  .86),
    (-1.32, .85, .87, .99, .62, .88, .82, .71, .65,  .76),
    # REAR HAUNCHES — Turbo wide body
    (-1.46, .86, .87, 1.03, .61, .91, .80, .69, .62,  .72),
    (-1.57, .87, .87, 1.07, .60, .93, .78, .67, .60,  .71),  # panel: qtr→engine-lid
    (-1.67, .86, .86, 1.05, .59, .91, .77, .65, .58,  .70),
    # ENGINE LID — rear-engine hump
    (-1.80, .84, .84,  .99, .56, .88, .73, .61, .53,  .72),
    (-1.94, .80, .80,  .92, .53, .83, .67, .56, .48,  .70),
    (-2.06, .75, .75,  .84, .48, .77, .60, .51, .43,  .62),  # panel: lid→bumper
    # REAR BUMPER
    (-2.18, .62, .64,  .72, .40, .66, .50, .43, .31,  .48),
    (-2.26, .48, .50,  .58, .32, .54, .40, .33, .21,  .34),
]

PANEL_BREAK_X = [2.00, 0.92, -0.92, -1.57, -2.06]

# Enhanced station list with ±3mm supporting loops at every panel break
ST = add_panel_support(ST_BASE, PANEL_BREAK_X, d=0.003)

# ── BODY MESH ─────────────────────────────────────────────────────────────────
NV    = 16
me_b  = bpy.data.meshes.new("P911_Body")
ob_b  = link(bpy.data.objects.new("Porsche_911", me_b))
bm    = bmesh.new()
rings = [[bm.verts.new(p) for p in make_ring(*s)] for s in ST]
NS    = len(rings)
bm.verts.ensure_lookup_table()

for i in range(NS - 1):
    for j in range(NV):
        j2 = (j+1) % NV
        bm.faces.new([rings[i][j], rings[i+1][j], rings[i+1][j2], rings[i][j2]])
bm.faces.new(rings[0])
bm.faces.new(list(reversed(rings[-1])))

bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
bm.to_mesh(me_b); bm.free(); me_b.update()

# ── EDGE CREASES via mesh attributes (Blender 5.x API) ───────────────────────
# In Blender 5.x, crease is stored as a 'FLOAT' attribute named "crease_edge"
try:
    if me_b.attributes.get("crease_edge") is None:
        me_b.attributes.new("crease_edge", 'FLOAT', 'EDGE')
    ca = me_b.attributes["crease_edge"]
    n_creased = 0
    for i, edge in enumerate(me_b.edges):
        x0 = me_b.vertices[edge.vertices[0]].co.x
        x1 = me_b.vertices[edge.vertices[1]].co.x
        if abs(x0 - x1) < 0.004:               # circumferential (same station)
            for xp in PANEL_BREAK_X:
                if abs(x0 - xp) < 0.004:       # at a panel break station
                    ca.data[i].value = 1.0
                    n_creased += 1
                    break
    print(f"[OK] Edge creases: {n_creased} edges at {PANEL_BREAK_X}")
except Exception as ex:
    print(f"[WARN] Crease fallback — {ex}")
    try:
        for edge in me_b.edges:
            x0 = me_b.vertices[edge.vertices[0]].co.x
            x1 = me_b.vertices[edge.vertices[1]].co.x
            if abs(x0 - x1) < 0.004:
                for xp in PANEL_BREAK_X:
                    if abs(x0 - xp) < 0.004:
                        edge.crease = 1.0; break
    except Exception: pass

smooth(ob_b); asgn(ob_b, 'body')

sub = ob_b.modifiers.new("Sub", 'SUBSURF')
sub.levels = 3; sub.render_levels = 3
for attr in ('use_creases', 'use_edge_creases'):
    if hasattr(sub, attr): setattr(sub, attr, True); break

# ── PANEL GAP GROOVE MESHES ───────────────────────────────────────────────────
# Each groove is a dark ~4mm ring at the panel break — mimics real gap shadow
GROOVE_LABELS = {
    2.00: "Gap_BumperHood",
    0.92: "Gap_HoodApillar",
   -0.92: "Gap_DoorRearQtr",
   -1.57: "Gap_QtrEngineLid",
   -2.06: "Gap_LidRearBumper",
}
for xp, lbl in GROOVE_LABELS.items():
    panel_groove(lbl, xp, ST_BASE)

# ── GLASS PANELS ──────────────────────────────────────────────────────────────
def glass_quad(name, pts):
    me = bpy.data.meshes.new(name)
    ob = link(bpy.data.objects.new(name, me))
    bm2 = bmesh.new()
    vs = [bm2.verts.new(v) for v in pts]
    bm2.faces.new(vs)
    bmesh.ops.recalc_face_normals(bm2, faces=bm2.faces)
    bm2.to_mesh(me); bm2.free(); asgn(ob, 'glass')

glass_quad("Windshield", [
    Vector(( .62,  .80, 1.19)), Vector(( .62, -.80, 1.19)),
    Vector(( .92,  .82,  .66)), Vector(( .92, -.82,  .66)),
])
glass_quad("RearScreen", [
    Vector((-.42,  .79, 1.24)), Vector((-.42, -.79, 1.24)),
    Vector((-1.30, .84,  .77)), Vector((-1.30,-.84,  .77)),
])
for sy, sn in ((.86,"Window_L"), (-.86,"Window_R")):
    glass_quad(sn, [
        Vector(( .60, sy, 1.19)), Vector((-.67, sy, 1.22)),
        Vector((-.67, sy, 1.08)), Vector(( .60, sy,  .68)),
    ])

# ── WHEELS — 992 Turbo S 21-inch RS Spyder Design ─────────────────────────────
M['pccb_disc'] = mat("PCCB_Disc",  (.10,.10,.11), r=0.82)
M['yellow_cal'] = mat("YellowCal", (.97,.78,.03), r=0.28)
M['sidewall_w'] = mat("Sidewall_W", (.88,.88,.88), r=0.70)

# Front 9J×21, Rear 11.5J×21 staggered fitment
WHEELS = [
    ( 1.225,  .795, .343, .087, "FL", False),
    ( 1.225, -.795, .343, .087, "FR", False),
    (-1.225,  .826, .361, .094, "RL", True),
    (-1.225, -.826, .361, .094, "RR", True),
]

def add_wheel(wx, wy, r, mr, wname, is_rear):
    sg      = 1 if wy >= 0 else -1
    dep     = 0.295 if is_rear else 0.232     # wheel width (J × 25.4mm)
    r_rim   = 0.264                            # 21" rim radius (fixed)
    r_hub   = 0.052                            # center hub radius
    r_sk_in = r_hub + 0.020                    # spoke inner contact
    r_sk_out = r_rim - 0.018                   # spoke outer contact
    sk_mid  = (r_sk_in + r_sk_out) / 2        # ≈ 0.151m
    sk_len  = r_sk_out - r_sk_in              # ≈ 0.174m spoke length
    sk_w    = 0.020                            # circumferential width
    sk_d    = dep * 0.56                       # axial depth (deep dish)
    face_y  = wy + sg * dep / 2               # outboard rim face Y
    disc_r  = 0.205 if not is_rear else 0.195  # PCCB: 410mm front / 390mm rear
    disc_y  = wy - sg * dep * 0.30            # disc inboard of outboard face

    # ── Tire — slight under-load contact-patch deformation ──
    bpy.ops.mesh.primitive_torus_add(
        major_radius=r, minor_radius=mr,
        major_segments=64, minor_segments=18,
        location=(wx, wy, r), rotation=(math.pi/2, 0, 0))
    t = bpy.context.active_object; t.name = f"Tire_{wname}"
    t.scale = (0.996, 1.0, 0.984)             # subtle sag at contact patch
    bpy.ops.object.transform_apply(scale=True)
    asgn(t, 'tire'); smooth(t)

    # Sidewall lettering strip (Michelin Pilot Sport 4S — raised white strip)
    bpy.ops.mesh.primitive_torus_add(
        major_radius=r - mr * 0.26, minor_radius=0.005,
        major_segments=56, minor_segments=6,
        location=(wx, wy + sg * mr * 0.80, r), rotation=(math.pi/2, 0, 0))
    sw = bpy.context.active_object; sw.name = f"Sidewall_{wname}"
    asgn(sw, 'sidewall_w'); smooth(sw)

    # ── Rim barrel — outer lip (polished face + dark pockets) ──
    bpy.ops.mesh.primitive_cylinder_add(
        radius=r_rim + 0.010, depth=dep + 0.018, vertices=52,
        location=(wx, wy, r), rotation=(math.pi/2, 0, 0))
    rb = bpy.context.active_object; rb.name = f"Rim_Barrel_{wname}"
    asgn(rb, 'rim'); smooth(rb)

    # Outboard rim face disc (polished machined highlight)
    bpy.ops.mesh.primitive_cylinder_add(
        radius=r_rim - 0.004, depth=0.018, vertices=52,
        location=(wx, face_y + sg * 0.009, r), rotation=(math.pi/2, 0, 0))
    rf = bpy.context.active_object; rf.name = f"Rim_Face_{wname}"
    asgn(rf, 'rim'); smooth(rf)

    # Anthracite spoke pockets (dark recessed well between spokes)
    bpy.ops.mesh.primitive_cylinder_add(
        radius=r_rim - 0.015, depth=0.014, vertices=48,
        location=(wx, wy, r), rotation=(math.pi/2, 0, 0))
    pk = bpy.context.active_object; pk.name = f"Rim_Pocket_{wname}"
    asgn(pk, 'anthracite'); smooth(pk)

    # ── 10 spokes — RS Spyder radial layout, 36° spacing ──
    for si in range(10):
        angle = si * math.pi / 5             # 36° per spoke
        d_x   = math.sin(angle)
        d_z   = math.cos(angle)
        scx = wx + sk_mid * d_x
        scz = r  + sk_mid * d_z
        scy = wy + sg * dep / 4.0            # quarter-depth toward outboard face
        bpy.ops.mesh.primitive_cube_add(size=1, location=(scx, scy, scz))
        spk = bpy.context.active_object; spk.name = f"Spoke_{wname}_{si:02d}"
        spk.scale = (sk_len, sk_d, sk_w)
        bpy.ops.object.transform_apply(scale=True)
        spk.rotation_euler = (0, angle - math.pi / 2, 0)
        bpy.ops.object.transform_apply(rotation=True)
        asgn(spk, 'rim'); smooth(spk)

    # ── Center hub ring (chrome) ──
    bpy.ops.mesh.primitive_cylinder_add(
        radius=r_hub, depth=0.030, vertices=24,
        location=(wx, face_y + sg * 0.015, r), rotation=(math.pi/2, 0, 0))
    hb = bpy.context.active_object; hb.name = f"Hub_{wname}"
    asgn(hb, 'chrome'); smooth(hb)

    # Center cap — chrome body + Porsche crest red enamel accent
    bpy.ops.mesh.primitive_cylinder_add(
        radius=r_hub * 0.78, depth=0.008, vertices=20,
        location=(wx, face_y + sg * 0.032, r), rotation=(math.pi/2, 0, 0))
    cc = bpy.context.active_object; cc.name = f"Cap_{wname}"
    asgn(cc, 'chrome'); smooth(cc)
    bpy.ops.mesh.primitive_cylinder_add(
        radius=r_hub * 0.38, depth=0.006, vertices=16,
        location=(wx, face_y + sg * 0.040, r), rotation=(math.pi/2, 0, 0))
    cd = bpy.context.active_object; cd.name = f"Cap_Crest_{wname}"
    asgn(cd, 'red'); smooth(cd)

    # ── 5 lug bolts — 5×130 PCD, 65mm radius ──
    PCD_R = 0.065
    for bi in range(5):
        ba = bi * 2 * math.pi / 5
        lx = wx + PCD_R * math.sin(ba)
        lz = r  + PCD_R * math.cos(ba)
        bpy.ops.mesh.primitive_cylinder_add(
            radius=0.009, depth=0.025, vertices=10,
            location=(lx, face_y + sg * 0.013, lz), rotation=(math.pi/2, 0, 0))
        lb = bpy.context.active_object; lb.name = f"Lug_{wname}_{bi}"
        asgn(lb, 'chrome'); smooth(lb)

    # ── PCCB carbon ceramic brake disc ──
    bpy.ops.mesh.primitive_cylinder_add(
        radius=disc_r, depth=0.034, vertices=40,
        location=(wx, disc_y, r), rotation=(math.pi/2, 0, 0))
    disc = bpy.context.active_object; disc.name = f"Disc_{wname}"
    asgn(disc, 'pccb_disc'); smooth(disc)
    # Disc hat — inner carrier (chrome, connects disc to hub)
    bpy.ops.mesh.primitive_cylinder_add(
        radius=disc_r * 0.42, depth=0.058, vertices=24,
        location=(wx, disc_y + sg * 0.012, r), rotation=(math.pi/2, 0, 0))
    dh = bpy.context.active_object; dh.name = f"DiscHat_{wname}"
    asgn(dh, 'chrome'); smooth(dh)
    # Ventilation torus — suggests cross-drilled / vented hole pattern
    bpy.ops.mesh.primitive_torus_add(
        major_radius=disc_r * 0.76, minor_radius=0.004,
        major_segments=40, minor_segments=6,
        location=(wx, disc_y, r), rotation=(math.pi/2, 0, 0))
    dv = bpy.context.active_object; dv.name = f"DiscVent_{wname}"
    asgn(dv, 'pccb_disc'); smooth(dv)

    # ── PCCB caliper — yellow, 6-piston front / 4-piston rear ──
    cal_angle = math.pi * 0.28               # ~50° from top (≈ 2 o'clock)
    cal_r_pos = disc_r * 0.70
    cax = wx + cal_r_pos * math.sin(cal_angle)
    caz = r  + cal_r_pos * math.cos(cal_angle)
    cal_ly = 0.086 if not is_rear else 0.064  # axial length (Y): wider front
    cal_lz = 0.072 if not is_rear else 0.056  # height (Z)
    bpy.ops.mesh.primitive_cube_add(size=1, location=(cax, disc_y, caz))
    cal = bpy.context.active_object; cal.name = f"Cal_{wname}"
    cal.scale = (0.040, cal_ly, cal_lz)
    bpy.ops.object.transform_apply(scale=True)
    asgn(cal, 'yellow_cal')
    # Piston bumps (chrome, visible through spoke gaps)
    n_row = 3 if not is_rear else 2           # 6-piston = 3 per side, 4-piston = 2
    for pi_i in range(n_row):
        pofs = (pi_i - (n_row - 1) / 2.0) * 0.027
        bpy.ops.mesh.primitive_cylinder_add(
            radius=0.009, depth=0.020, vertices=10,
            location=(cax + pofs, disc_y - sg * 0.048, caz),
            rotation=(math.pi/2, 0, 0))
        pist = bpy.context.active_object; pist.name = f"Piston_{wname}_{pi_i}"
        asgn(pist, 'chrome'); smooth(pist)

for w in WHEELS: add_wheel(*w)

# ── HEADLIGHTS — 992 Turbo S four-point LED DRL (2×2 projector matrix) ────────
def build_headlight_cluster(cx, cy, cz, side):
    sg = 1 if side == 'L' else -1
    proj_r = 0.027
    dly, dlz = 0.033, 0.027          # half-spacing: lateral and vertical
    proj_pos = [
        (cy - sg*dly, cz + dlz),     # top-inner
        (cy + sg*dly, cz + dlz),     # top-outer
        (cy - sg*dly, cz - dlz),     # bot-inner
        (cy + sg*dly, cz - dlz),     # bot-outer
    ]
    # Anthracite housing back plate (dark-tinted inner bezel)
    bpy.ops.mesh.primitive_cube_add(size=1, location=(cx-0.012, cy, cz))
    hb = bpy.context.active_object; hb.name = f"HL_Housing_{side}"
    hb.scale = (0.018, 0.108, 0.085); bpy.ops.object.transform_apply(scale=True)
    asgn(hb, 'anthracite')

    for pi, (pcy, pcz) in enumerate(proj_pos):
        # Reflector bowl — flattened chrome hemisphere
        bpy.ops.mesh.primitive_uv_sphere_add(
            radius=proj_r, segments=12, ring_count=8,
            location=(cx - proj_r*0.5 - 0.005, pcy, pcz))
        bwl = bpy.context.active_object; bwl.name = f"HL_Bowl_{side}_{pi}"
        bwl.scale = (0.38, 1.0, 1.0); bpy.ops.object.transform_apply(scale=True)
        asgn(bwl, 'chrome'); smooth(bwl)
        # Projector lens disc (glass)
        bpy.ops.mesh.primitive_cylinder_add(
            radius=proj_r*0.86, depth=0.005, vertices=20,
            location=(cx - 0.001, pcy, pcz), rotation=(0, math.pi/2, 0))
        plc = bpy.context.active_object; plc.name = f"HL_ProjLens_{side}_{pi}"
        asgn(plc, 'glass'); smooth(plc)
        # DRL ring — the four-point LED signature
        bpy.ops.mesh.primitive_torus_add(
            major_radius=proj_r*0.82, minor_radius=0.0042,
            major_segments=36, minor_segments=8,
            location=(cx + 0.003, pcy, pcz), rotation=(0, math.pi/2, 0))
        drl = bpy.context.active_object; drl.name = f"HL_DRL_{side}_{pi}"
        asgn(drl, 'led_white'); smooth(drl)
        # Chrome projector accent ring
        bpy.ops.mesh.primitive_torus_add(
            major_radius=proj_r*1.04, minor_radius=0.003,
            major_segments=32, minor_segments=6,
            location=(cx + 0.005, pcy, pcz), rotation=(0, math.pi/2, 0))
        arc = bpy.context.active_object; arc.name = f"HL_Ring_{side}_{pi}"
        asgn(arc, 'chrome'); smooth(arc)

    # Chrome H-divider between the four projector cells
    bpy.ops.mesh.primitive_cube_add(size=1, location=(cx-0.004, cy, cz))
    vdiv = bpy.context.active_object; vdiv.name = f"HL_VDiv_{side}"
    vdiv.scale = (0.014, 0.005, 0.070); bpy.ops.object.transform_apply(scale=True)
    asgn(vdiv, 'chrome')
    bpy.ops.mesh.primitive_cube_add(size=1, location=(cx-0.004, cy, cz))
    hdiv = bpy.context.active_object; hdiv.name = f"HL_HDiv_{side}"
    hdiv.scale = (0.014, 0.090, 0.005); bpy.ops.object.transform_apply(scale=True)
    asgn(hdiv, 'chrome')

    # Polycarbonate outer lens cover (clear ellipsoid)
    bpy.ops.mesh.primitive_uv_sphere_add(
        radius=0.058, segments=20, ring_count=14,
        location=(cx + 0.008, cy, cz))
    lco = bpy.context.active_object; lco.name = f"HL_LensCover_{side}"
    lco.scale = (0.148, 1.15, 0.85); bpy.ops.object.transform_apply(scale=True)
    asgn(lco, 'lens_clear'); smooth(lco)

    # Chrome outer bezel frame (oval torus)
    bpy.ops.mesh.primitive_torus_add(
        major_radius=0.058, minor_radius=0.007,
        major_segments=48, minor_segments=8,
        location=(cx + 0.006, cy, cz), rotation=(0, math.pi/2, 0))
    bzo = bpy.context.active_object; bzo.name = f"HL_Bezel_{side}"
    bzo.scale = (1.0, 1.15, 0.85); bpy.ops.object.transform_apply(scale=True)
    asgn(bzo, 'chrome'); smooth(bzo)

build_headlight_cluster(2.16,  0.57, 0.55, 'L')
build_headlight_cluster(2.16, -0.57, 0.55, 'R')

# LED connecting strip across hood leading edge (Matrix LED signature)
bpy.ops.mesh.primitive_cube_add(size=1, location=(2.175, 0, 0.598))
led_s = bpy.context.active_object; led_s.name = "HL_LED_Strip"
led_s.scale = (0.008, 0.82, 0.005); bpy.ops.object.transform_apply(scale=True)
asgn(led_s, 'led_white')

# ── TAILLIGHTS — 992 Turbo S full-width LED light bar ────────────────────────
M['led_red'] = mat_emit("LED_Red",  (.95,.03,.01), strength=3.5)
M['smoked']  = mat_clear("Smoked",  (.04,.04,.04), alpha=0.28)

TL_X  = -2.262   # rear face X
TL_CZ =  0.520   # bar vertical center
TL_CY =  0.640   # round cluster lateral center (each side)

# Full-width smoked polycarbonate cover (background panel)
bpy.ops.mesh.primitive_cube_add(size=1, location=(TL_X - 0.004, 0, TL_CZ))
cov = bpy.context.active_object; cov.name = "TL_SmokedCover"
cov.scale = (0.006, 1.680, 0.168); bpy.ops.object.transform_apply(scale=True)
asgn(cov, 'smoked')

# Round taillight clusters — 3 concentric LED rings + chrome bezel
def build_tail_cluster(cy, side):
    cx = TL_X - 0.005
    # Outer ring: red (brake / tail)
    bpy.ops.mesh.primitive_torus_add(
        major_radius=0.072, minor_radius=0.009,
        major_segments=52, minor_segments=10,
        location=(cx, cy, TL_CZ), rotation=(0, math.pi/2, 0))
    r1 = bpy.context.active_object; r1.name = f"TL_Ring1_{side}"
    asgn(r1, 'led_red'); smooth(r1)
    # Middle ring: red
    bpy.ops.mesh.primitive_torus_add(
        major_radius=0.048, minor_radius=0.008,
        major_segments=48, minor_segments=10,
        location=(cx, cy, TL_CZ), rotation=(0, math.pi/2, 0))
    r2 = bpy.context.active_object; r2.name = f"TL_Ring2_{side}"
    asgn(r2, 'led_red'); smooth(r2)
    # Inner ring: white (reverse light signature)
    bpy.ops.mesh.primitive_torus_add(
        major_radius=0.024, minor_radius=0.007,
        major_segments=36, minor_segments=8,
        location=(cx, cy, TL_CZ), rotation=(0, math.pi/2, 0))
    r3 = bpy.context.active_object; r3.name = f"TL_Ring3_{side}"
    asgn(r3, 'led_white'); smooth(r3)
    # Center reverse spot (solid white disc)
    bpy.ops.mesh.primitive_cylinder_add(
        radius=0.011, depth=0.004, vertices=16,
        location=(cx, cy, TL_CZ), rotation=(0, math.pi/2, 0))
    rv = bpy.context.active_object; rv.name = f"TL_Reverse_{side}"
    asgn(rv, 'led_white'); smooth(rv)
    # Chrome bezel ring framing the cluster
    bpy.ops.mesh.primitive_torus_add(
        major_radius=0.080, minor_radius=0.006,
        major_segments=52, minor_segments=8,
        location=(cx - 0.002, cy, TL_CZ), rotation=(0, math.pi/2, 0))
    bz = bpy.context.active_object; bz.name = f"TL_Bezel_{side}"
    asgn(bz, 'chrome'); smooth(bz)

build_tail_cluster( TL_CY, 'L')
build_tail_cluster(-TL_CY, 'R')

# Individual LED bar segments between clusters and central wordmark
SEG_W   = 0.034   # segment width (Y)
SEG_H   = 0.012   # segment height (Z)
SEG_D   = 0.007   # depth (X) — slightly proud of smoked cover
SEG_GAP = 0.006   # gap between segments
Y_INNER = 0.092   # inner edge (adjacent to wordmark)
Y_OUTER = 0.556   # outer edge (clear of cluster bezel at 0.560)

n_segs = int((Y_OUTER - Y_INNER) / (SEG_W + SEG_GAP))   # 11 per side
for si in range(n_segs):
    seg_cy = Y_INNER + SEG_W / 2 + si * (SEG_W + SEG_GAP)
    for sy in (1, -1):
        bpy.ops.mesh.primitive_cube_add(
            size=1, location=(TL_X - SEG_D / 2, sy * seg_cy, TL_CZ))
        seg = bpy.context.active_object
        seg.name = f"TL_Seg_{'L' if sy > 0 else 'R'}_{si:02d}"
        seg.scale = (SEG_D, SEG_W, SEG_H); bpy.ops.object.transform_apply(scale=True)
        asgn(seg, 'led_red')

# Porsche wordmark — chrome embossed bar in center gap
bpy.ops.mesh.primitive_cube_add(size=1, location=(TL_X - 0.006, 0, TL_CZ))
pw = bpy.context.active_object; pw.name = "TL_Porsche_Script"
pw.scale = (0.009, 0.155, 0.022); bpy.ops.object.transform_apply(scale=True)
asgn(pw, 'chrome')

# Chrome rails — thin lines above and below, full width, tying the bar together
for rz, rn in ((TL_CZ + 0.018, "Top"), (TL_CZ - 0.018, "Bot")):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(TL_X - 0.003, 0, rz))
    rail = bpy.context.active_object; rail.name = f"TL_Rail_{rn}"
    rail.scale = (0.004, 1.650, 0.003); bpy.ops.object.transform_apply(scale=True)
    asgn(rail, 'chrome')

# ── ENGINE COVER GRILLES — 5 satin black angled slats ────────────────────────
for gi,gz in enumerate((.700,.672,.644,.616,.588)):
    bpy.ops.mesh.primitive_cube_add(size=1,location=(-1.87,0,gz))
    g=bpy.context.active_object; g.name=f"EngineGrille_{gi}"
    g.scale=(.185,.52,.007); g.rotation_euler=(math.radians(-10),0,0)
    bpy.ops.object.transform_apply(scale=True,rotation=True); asgn(g,'black')

# Engine lid panel gap (around the perimeter of the engine lid)
# Front edge of engine lid
panel_groove("Gap_EngineLid_Front", -1.57, ST_BASE, width=0.003)

# ── RETRACTABLE SPOILER — flush ───────────────────────────────────────────────
bpy.ops.mesh.primitive_cube_add(size=1,location=(-1.96,0,.706))
sp=bpy.context.active_object; sp.name="Spoiler_Flush"
sp.scale=(.048,.64,.010); bpy.ops.object.transform_apply(scale=True); asgn(sp,'body')

# Spoiler gap line (thin groove at spoiler perimeter)
for sg_x in (-1.915, -2.005):
    panel_groove(f"Gap_Spoiler_{int(abs(sg_x)*100)}", sg_x, ST_BASE, width=0.002)

# ── FRONT FASCIA — wide intakes + numberplate ─────────────────────────────────
for iy, iname in ((.42,"Intake_L"),(-.42,"Intake_R")):
    bpy.ops.mesh.primitive_cube_add(size=1,location=(2.261,iy,.22))
    i_obj=bpy.context.active_object; i_obj.name=iname
    i_obj.scale=(.008,.28,.14); bpy.ops.object.transform_apply(scale=True); asgn(i_obj,'black')
# Mesh grille inside intakes (5 horizontal bars each)
for iy in (.42, -.42):
    sign = 1 if iy > 0 else -1
    for gi2, gz2 in enumerate((.30,.26,.22,.18,.14)):
        bpy.ops.mesh.primitive_cube_add(size=1,location=(2.258,iy,gz2))
        gbar=bpy.context.active_object; gbar.name=f"IntakeBar_{sign}_{gi2}"
        gbar.scale=(.004,.24,.006); bpy.ops.object.transform_apply(scale=True); asgn(gbar,'black')
# Numberplate recess center
bpy.ops.mesh.primitive_cube_add(size=1,location=(2.261,0,.17))
np_r=bpy.context.active_object; np_r.name="NumberPlate"
np_r.scale=(.006,.22,.07); bpy.ops.object.transform_apply(scale=True); asgn(np_r,'black')

# ── SIDE SILLS — with step molding ───────────────────────────────────────────
for sy, sn in ((.875,"Sill_L"),(-.875,"Sill_R")):
    bpy.ops.mesh.primitive_cube_add(size=1,location=(0,sy,.185))
    si=bpy.context.active_object; si.name=sn
    si.scale=(1.82,.018,.115); bpy.ops.object.transform_apply(scale=True); asgn(si,'black')
    bpy.ops.mesh.primitive_cube_add(size=1,location=(0,sy,.268))
    st=bpy.context.active_object; st.name=f"{sn}_Step"
    st.scale=(1.82,.020,.012); bpy.ops.object.transform_apply(scale=True); asgn(st,'rubber')
    # Sill panel gap lines (top and bottom edges)
    for sg_z, sg_lbl in ((.32, "top"), (.09, "bot")):
        bpy.ops.mesh.primitive_cube_add(size=1,location=(0,sy+(.009 if sy>0 else -.009),sg_z))
        sg_obj=bpy.context.active_object; sg_obj.name=f"SillGap_{sn}_{sg_lbl}"
        sg_obj.scale=(1.80,.002,.003); bpy.ops.object.transform_apply(scale=True); asgn(sg_obj,'panel_gap')

# ── FUEL FILLER CAP — right front fender ─────────────────────────────────────
bpy.ops.mesh.primitive_cylinder_add(
    radius=.034, depth=.018, location=(1.62,.845,.630),
    rotation=(0,math.radians(78),0))
fc=bpy.context.active_object; fc.name="FuelCap"; asgn(fc,'chrome'); smooth(fc)
# Fuel cap panel gap ring (tiny recessed ring)
bpy.ops.mesh.primitive_torus_add(
    major_radius=.038, minor_radius=.003,
    major_segments=32, minor_segments=6,
    location=(1.622,.844,.630), rotation=(0,math.radians(78),0))
fc_gap=bpy.context.active_object; fc_gap.name="FuelCap_Gap"; asgn(fc_gap,'panel_gap'); smooth(fc_gap)

# ── SIDE MIRRORS ──────────────────────────────────────────────────────────────
for my, mn in ((0.93,"Mirror_L"),(-0.93,"Mirror_R")):
    bpy.ops.mesh.primitive_cube_add(size=1,location=(.82,my,0.62))
    mir=bpy.context.active_object; mir.name=mn; mir.scale=(.08,.038,.058)
    mir.rotation_euler=(0,0,math.radians(12)*(1 if my>0 else -1))
    bpy.ops.object.transform_apply(scale=True,rotation=True); asgn(mir,'body')
    bpy.ops.mesh.primitive_plane_add(size=1,location=(.79,my+(.044 if my>0 else -.044),0.62))
    mg=bpy.context.active_object; mg.name=f"{mn}_Glass"
    mg.scale=(.055,.001,.042); bpy.ops.object.transform_apply(scale=True); asgn(mg,'glass')

# ── EXHAUST — Turbo S 4-oval-tip ─────────────────────────────────────────────
for ey, en in ((.40,"LL"),(.56,"LR"),(-.40,"RL"),(-.56,"RR")):
    bpy.ops.mesh.primitive_cylinder_add(
        radius=.040, depth=.06, vertices=24,
        location=(-2.262,ey,.17), rotation=(0,math.pi/2,0))
    ep=bpy.context.active_object; ep.name=f"Exhaust_{en}"
    ep.scale=(1,1,.72); bpy.ops.object.transform_apply(scale=True); asgn(ep,'chrome'); smooth(ep)

# ── UNDERTRAY ────────────────────────────────────────────────────────────────
bpy.ops.mesh.primitive_plane_add(size=1,location=(0,0,.084))
ut=bpy.context.active_object; ut.name="Undertray"
ut.scale=(4.52,1.74,1); bpy.ops.object.transform_apply(scale=True); asgn(ut,'floor')

# ── INTERIOR — 992 Sport interior (visible through glass) ─────────────────────
# Make glass semi-transparent so interior reads through the panes
_b = M['glass'].node_tree.nodes["Principled BSDF"]
_b.inputs["Base Color"].default_value = (.78,.86,.94, 0.14)
for _k in ("Transmission Weight","Transmission"):
    if _k in _b.inputs: _b.inputs[_k].default_value = 0.92; break
try: M['glass'].blend_method = 'BLEND'
except Exception: pass

# Interior materials
M['lth_dk']    = mat("Leather_Dark",  (.06,.05,.04),          r=0.45)
M['lth_lt']    = mat("Leather_Light", (.62,.52,.38),          r=0.40)
M['screen_on'] = mat_emit("Screen",   (.05,.11,.20), strength=1.2)
M['alctna']    = mat("Alcantara",     (.10,.10,.10),           r=0.92)
M['carb_int']  = mat("Carbon_Int",    (.04,.04,.04), m=0.20,   r=0.28)

SW_X, SW_Y, SW_Z = 0.620, 0.285, 0.638    # steering wheel centre

# ── Alcantara headliner ──
bpy.ops.mesh.primitive_cube_add(size=1, location=(0.08, 0, 1.226))
hl = bpy.context.active_object; hl.name = "Int_Headliner"
hl.scale = (1.02, 1.38, 0.012); bpy.ops.object.transform_apply(scale=True)
asgn(hl, 'alctna')

# Suede-wrapped A-pillar covers
for ay, an in ((0.78,'L'), (-0.78,'R')):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0.768, ay, 0.940))
    ap = bpy.context.active_object; ap.name = f"Int_APillar_{an}"
    ap.scale = (0.018, 0.020, 0.540)
    ap.rotation_euler = (0, math.radians(-28), 0)
    bpy.ops.object.transform_apply(scale=True, rotation=True)
    asgn(ap, 'alctna')

# ── Dashboard fascia ──
bpy.ops.mesh.primitive_cube_add(size=1, location=(0.786, 0, 0.548))
dash = bpy.context.active_object; dash.name = "Int_Dashboard"
dash.scale = (0.116, 1.300, 0.390); bpy.ops.object.transform_apply(scale=True)
asgn(dash, 'lth_dk')
# Horizontal carbon fibre trim strip
bpy.ops.mesh.primitive_cube_add(size=1, location=(0.806, 0, 0.556))
ct = bpy.context.active_object; ct.name = "Int_CF_Trim"
ct.scale = (0.008, 1.050, 0.038); bpy.ops.object.transform_apply(scale=True)
asgn(ct, 'carb_int')
# Dash speaker grilles (driver + passenger)
for sg_y, sg_n in ((0.560,'D'), (-0.560,'P')):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0.806, sg_y, 0.658))
    sgr = bpy.context.active_object; sgr.name = f"Int_Speaker_{sg_n}"
    sgr.scale = (0.008, 0.120, 0.060); bpy.ops.object.transform_apply(scale=True)
    asgn(sgr, 'black')

# ── 12.6" Curved digital instrument cluster — driver side ──
bpy.ops.mesh.primitive_cube_add(size=1, location=(0.748, 0.264, 0.650))
ic = bpy.context.active_object; ic.name = "Int_InstrCluster"
ic.scale = (0.010, 0.168, 0.092)
ic.rotation_euler = (0, math.radians(12), 0)
bpy.ops.object.transform_apply(scale=True, rotation=True)
asgn(ic, 'screen_on')
bpy.ops.mesh.primitive_cube_add(size=1, location=(0.744, 0.264, 0.650))
icb = bpy.context.active_object; icb.name = "Int_Cluster_Bezel"
icb.scale = (0.007, 0.178, 0.100)
icb.rotation_euler = (0, math.radians(12), 0)
bpy.ops.object.transform_apply(scale=True, rotation=True)
asgn(icb, 'chrome')

# ── 10.9" PCM central touchscreen ──
bpy.ops.mesh.primitive_cube_add(size=1, location=(0.748, 0.005, 0.582))
pcm = bpy.context.active_object; pcm.name = "Int_PCM"
pcm.scale = (0.010, 0.148, 0.082)
pcm.rotation_euler = (0, math.radians(8), 0)
bpy.ops.object.transform_apply(scale=True, rotation=True)
asgn(pcm, 'screen_on')
bpy.ops.mesh.primitive_cube_add(size=1, location=(0.744, 0.005, 0.582))
pcmb = bpy.context.active_object; pcmb.name = "Int_PCM_Bezel"
pcmb.scale = (0.007, 0.158, 0.090)
pcmb.rotation_euler = (0, math.radians(8), 0)
bpy.ops.object.transform_apply(scale=True, rotation=True)
asgn(pcmb, 'chrome')

# ── Sport Chrono clock — top centre of dashboard ──
bpy.ops.mesh.primitive_cylinder_add(
    radius=0.040, depth=0.018, vertices=24,
    location=(0.786, 0, 0.754), rotation=(0, math.pi/2 - math.radians(10), 0))
chrono = bpy.context.active_object; chrono.name = "Int_Chrono_Case"
asgn(chrono, 'chrome'); smooth(chrono)
bpy.ops.mesh.primitive_cylinder_add(
    radius=0.033, depth=0.008, vertices=20,
    location=(0.793, 0, 0.754), rotation=(0, math.pi/2 - math.radians(10), 0))
cdial = bpy.context.active_object; cdial.name = "Int_Chrono_Dial"
asgn(cdial, 'screen_on'); smooth(cdial)

# ── Steering wheel — 3-spoke GT Sport, flat-bottom profile ──
# Ring (torus in YZ plane: axis = X, ring perpendicular to column)
bpy.ops.mesh.primitive_torus_add(
    major_radius=0.168, minor_radius=0.014,
    major_segments=48, minor_segments=10,
    location=(SW_X, SW_Y, SW_Z), rotation=(0, math.pi/2, 0))
swr = bpy.context.active_object; swr.name = "Int_SW_Ring"
swr.scale = (1.0, 1.0, 0.88)      # slight vertical compression → flat bottom profile
bpy.ops.object.transform_apply(scale=True)
asgn(swr, 'lth_dk'); smooth(swr)
# Chrome accent band around rim
bpy.ops.mesh.primitive_torus_add(
    major_radius=0.168, minor_radius=0.007,
    major_segments=48, minor_segments=8,
    location=(SW_X - 0.005, SW_Y, SW_Z), rotation=(0, math.pi/2, 0))
swrc = bpy.context.active_object; swrc.name = "Int_SW_Chrome"
swrc.scale = (1.0, 1.0, 0.88)
bpy.ops.object.transform_apply(scale=True)
asgn(swrc, 'chrome'); smooth(swrc)
# 12-o'clock marker (red)
bpy.ops.mesh.primitive_cylinder_add(
    radius=0.005, depth=0.026, vertices=8,
    location=(SW_X + 0.010, SW_Y, SW_Z + 0.168))
mrkr = bpy.context.active_object; mrkr.name = "Int_SW_Marker"
asgn(mrkr, 'red'); smooth(mrkr)

# 3 spokes — cylinder axes aimed via Rx rotation in YZ plane
# Rx(α) maps default Z-axis to (0, −sinα, cosα)
# For direction (0, d_y, d_z): α where −sinα=d_y, cosα=d_z
r_sp = 0.104    # spoke midpoint radius from wheel centre
sk_dep = 0.128  # spoke length (hub rim to tyre rim inner)
for sk_i, (sk_rx, sk_dy, sk_dz) in enumerate([
    (0,                 0,              r_sp       ),   # 12 o'clock ↑
    (-2*math.pi/3,  r_sp*0.866,    -r_sp*0.500),   # 4 o'clock ↘
    ( 2*math.pi/3, -r_sp*0.866,    -r_sp*0.500),   # 8 o'clock ↙
]):
    bpy.ops.mesh.primitive_cylinder_add(
        radius=0.009, depth=sk_dep, vertices=10,
        location=(SW_X, SW_Y + sk_dy, SW_Z + sk_dz),
        rotation=(sk_rx, 0, 0))
    spk = bpy.context.active_object; spk.name = f"Int_SW_Spoke_{sk_i}"
    asgn(spk, 'chrome'); smooth(spk)

# Hub boss (chrome) + Porsche logo accent (red)
bpy.ops.mesh.primitive_cylinder_add(
    radius=0.042, depth=0.026, vertices=16,
    location=(SW_X - 0.013, SW_Y, SW_Z), rotation=(0, math.pi/2, 0))
swh = bpy.context.active_object; swh.name = "Int_SW_Hub"
asgn(swh, 'chrome'); smooth(swh)
bpy.ops.mesh.primitive_cylinder_add(
    radius=0.024, depth=0.008, vertices=14,
    location=(SW_X - 0.020, SW_Y, SW_Z), rotation=(0, math.pi/2, 0))
swhl = bpy.context.active_object; swhl.name = "Int_SW_Logo"
asgn(swhl, 'red'); smooth(swhl)

# Steering column (carbon fibre shroud — angled from dash to wheel)
bpy.ops.mesh.primitive_cylinder_add(
    radius=0.026, depth=0.178, vertices=12,
    location=(0.703, SW_Y, 0.618), rotation=(0, math.radians(-76), 0))
swcol = bpy.context.active_object; swcol.name = "Int_SW_Column"
asgn(swcol, 'carb_int'); smooth(swcol)

# ── PDK shift paddles — machined aluminium, behind rim ──
for p_dy, p_name in ((+0.178,'L'), (-0.178,'R')):
    # Paddle plate
    bpy.ops.mesh.primitive_cube_add(
        size=1, location=(SW_X + 0.020, SW_Y + p_dy, SW_Z - 0.004))
    pdl = bpy.context.active_object; pdl.name = f"Int_Paddle_{p_name}"
    pdl.scale = (0.016, 0.086, 0.048)
    pdl.rotation_euler = (math.radians(5), 0, 0)
    bpy.ops.object.transform_apply(scale=True, rotation=True)
    asgn(pdl, 'chrome')
    # Finger hook tab
    bpy.ops.mesh.primitive_cube_add(
        size=1, location=(SW_X + 0.028, SW_Y + p_dy, SW_Z - 0.022))
    ptab = bpy.context.active_object; ptab.name = f"Int_PaddleTab_{p_name}"
    ptab.scale = (0.008, 0.052, 0.024)
    bpy.ops.object.transform_apply(scale=True)
    asgn(ptab, 'chrome')

# ── Bucket seats — two-tone leather + Alcantara ──
def build_seat(sy, sname):
    sg = 1 if sy > 0 else -1
    # Seat cushion
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0.072, sy, 0.342))
    c = bpy.context.active_object; c.name = f"Int_Seat_Cushion_{sname}"
    c.scale = (0.420, 0.420, 0.106); bpy.ops.object.transform_apply(scale=True)
    asgn(c, 'lth_dk')
    # Alcantara centre stripe (contrast stitching effect)
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0.072, sy, 0.352))
    cs = bpy.context.active_object; cs.name = f"Int_Seat_CuStr_{sname}"
    cs.scale = (0.390, 0.162, 0.006); bpy.ops.object.transform_apply(scale=True)
    asgn(cs, 'lth_lt')
    # Outboard lateral bolster
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0.072, sy + sg*0.192, 0.290))
    b1 = bpy.context.active_object; b1.name = f"Int_Seat_BolOut_{sname}"
    b1.scale = (0.400, 0.056, 0.118); bpy.ops.object.transform_apply(scale=True)
    asgn(b1, 'lth_dk')
    # Inboard lateral bolster
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0.072, sy - sg*0.192, 0.290))
    b2 = bpy.context.active_object; b2.name = f"Int_Seat_BolIn_{sname}"
    b2.scale = (0.400, 0.056, 0.118); bpy.ops.object.transform_apply(scale=True)
    asgn(b2, 'lth_dk')
    # Seat back (16° recline around Y)
    bpy.ops.mesh.primitive_cube_add(size=1, location=(-0.128, sy, 0.730))
    sb = bpy.context.active_object; sb.name = f"Int_Seat_Back_{sname}"
    sb.scale = (0.095, 0.400, 0.580)
    sb.rotation_euler = (0, math.radians(-16), 0)
    bpy.ops.object.transform_apply(scale=True, rotation=True)
    asgn(sb, 'lth_dk')
    # Seat back Alcantara centre panel
    bpy.ops.mesh.primitive_cube_add(size=1, location=(-0.118, sy, 0.740))
    sbs = bpy.context.active_object; sbs.name = f"Int_Seat_BkStr_{sname}"
    sbs.scale = (0.008, 0.158, 0.446)
    sbs.rotation_euler = (0, math.radians(-16), 0)
    bpy.ops.object.transform_apply(scale=True, rotation=True)
    asgn(sbs, 'lth_lt')
    # Deep bucket back bolsters (outboard + inboard)
    for bdy, bbn in ((sg*0.186,'Out'), (-sg*0.186,'In')):
        bpy.ops.mesh.primitive_cube_add(size=1, location=(-0.112, sy + bdy, 0.716))
        bb = bpy.context.active_object; bb.name = f"Int_Seat_BkBol{bbn}_{sname}"
        bb.scale = (0.082, 0.058, 0.500)
        bb.rotation_euler = (0, math.radians(-16), 0)
        bpy.ops.object.transform_apply(scale=True, rotation=True)
        asgn(bb, 'lth_dk')
    # Integrated headrest
    bpy.ops.mesh.primitive_cube_add(size=1, location=(-0.250, sy, 1.092))
    hr = bpy.context.active_object; hr.name = f"Int_Seat_Headrest_{sname}"
    hr.scale = (0.128, 0.282, 0.150)
    hr.rotation_euler = (0, math.radians(-16), 0)
    bpy.ops.object.transform_apply(scale=True, rotation=True)
    asgn(hr, 'lth_dk')
    # Headrest Alcantara pad
    bpy.ops.mesh.primitive_cube_add(size=1, location=(-0.241, sy, 1.093))
    hrp = bpy.context.active_object; hrp.name = f"Int_Seat_HRPad_{sname}"
    hrp.scale = (0.008, 0.202, 0.118)
    hrp.rotation_euler = (0, math.radians(-16), 0)
    bpy.ops.object.transform_apply(scale=True, rotation=True)
    asgn(hrp, 'alctna')

build_seat( 0.268, 'D')   # driver (left)
build_seat(-0.268, 'P')   # passenger (right)

# ── Centre console ──
bpy.ops.mesh.primitive_cube_add(size=1, location=(0.068, 0, 0.268))
con = bpy.context.active_object; con.name = "Int_Console"
con.scale = (0.540, 0.142, 0.204); bpy.ops.object.transform_apply(scale=True)
asgn(con, 'lth_dk')
# Carbon fibre console top surface
bpy.ops.mesh.primitive_cube_add(size=1, location=(0.068, 0, 0.374))
cont = bpy.context.active_object; cont.name = "Int_Console_Top"
cont.scale = (0.510, 0.130, 0.014); bpy.ops.object.transform_apply(scale=True)
asgn(cont, 'carb_int')
# Twin cup holders
for ch_y in (0.044, -0.044):
    bpy.ops.mesh.primitive_cylinder_add(
        radius=0.034, depth=0.044, vertices=16,
        location=(0.008, ch_y, 0.368))
    cup = bpy.context.active_object; cup.name = f"Int_Cup_{'L' if ch_y>0 else 'R'}"
    asgn(cup, 'black'); smooth(cup)

# ── PDK selector lever + gate ──
bpy.ops.mesh.primitive_cylinder_add(
    radius=0.013, depth=0.118, vertices=12,
    location=(0.128, 0, 0.452), rotation=(0, 0, math.radians(12)))
pdkl = bpy.context.active_object; pdkl.name = "Int_PDK_Lever"
asgn(pdkl, 'chrome'); smooth(pdkl)
# Leather grip
bpy.ops.mesh.primitive_uv_sphere_add(
    radius=0.022, segments=12, ring_count=8,
    location=(0.150, 0.025, 0.508))
pdkg = bpy.context.active_object; pdkg.name = "Int_PDK_Grip"
pdkg.scale = (0.72, 1.0, 1.0)
bpy.ops.object.transform_apply(scale=True)
asgn(pdkg, 'lth_dk'); smooth(pdkg)
# Carbon fibre PDK gate plate
bpy.ops.mesh.primitive_cube_add(size=1, location=(0.130, 0, 0.414))
gate = bpy.context.active_object; gate.name = "Int_PDK_Gate"
gate.scale = (0.120, 0.068, 0.010); bpy.ops.object.transform_apply(scale=True)
asgn(gate, 'carb_int')

# ── Pedal cluster (brake + accelerator — PDK, no clutch) ──
for py_p, pn_p in ((0.245,'Brake'), (0.318,'Accel')):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0.830, py_p, 0.118))
    ped = bpy.context.active_object; ped.name = f"Int_Pedal_{pn_p}"
    ped.scale = (0.065, 0.050, 0.012)
    ped.rotation_euler = (math.radians(-22), 0, 0)
    bpy.ops.object.transform_apply(scale=True, rotation=True)
    asgn(ped, 'chrome')

# ── MATERIAL UPGRADE — PBR Shaders ───────────────────────────────────────────
def _clr(mat):
    for nd in list(mat.node_tree.nodes): mat.node_tree.nodes.remove(nd)
    return mat.node_tree

def _bsdf(nt):
    out_nd = nt.nodes.new('ShaderNodeOutputMaterial')
    b      = nt.nodes.new('ShaderNodeBsdfPrincipled')
    nt.links.new(b.outputs[0], out_nd.inputs['Surface'])
    return b

def _si(b, *names, val):
    for n in names:
        if n in b.inputs: b.inputs[n].default_value = val; return

def _noise_nrm(nt, b, sc=50.0, dt=3.0, st=0.20):
    tc = nt.nodes.new('ShaderNodeTexCoord')
    nz = nt.nodes.new('ShaderNodeTexNoise')
    nz.inputs['Scale'].default_value  = sc
    nz.inputs['Detail'].default_value = dt
    try: nz.inputs['Roughness'].default_value = 0.75
    except Exception: pass
    nt.links.new(tc.outputs['Object'], nz.inputs['Vector'])
    nm = nt.nodes.new('ShaderNodeNormalMap')
    nm.inputs['Strength'].default_value = st
    nt.links.new(nz.outputs['Color'], nm.inputs['Color'])
    nt.links.new(nm.outputs['Normal'], b.inputs['Normal'])

# GT Silver Metallic car paint (clearcoat + metallic flake)
_b_body = _bsdf(_clr(M['body']))
_BC = (0.750, 0.752, 0.755)
_b_body.inputs["Base Color"].default_value = (*_BC, 1.0)
_b_body.inputs["Metallic"].default_value   = 0.05
_b_body.inputs["Roughness"].default_value  = 0.18
_si(_b_body, "Specular IOR Level", "Specular",            val=0.5)
_si(_b_body, "Coat Weight",        "Clearcoat",           val=1.0)
_si(_b_body, "Coat Roughness",     "Clearcoat Roughness", val=0.03)
try:
    _nt_b = M['body'].node_tree
    _tc_b = _nt_b.nodes.new('ShaderNodeTexCoord')
    _nf = _nt_b.nodes.new('ShaderNodeTexNoise')
    _nf.inputs['Scale'].default_value  = 800.0
    _nf.inputs['Detail'].default_value = 8.0
    try: _nf.inputs['Roughness'].default_value = 0.65
    except Exception: pass
    _nt_b.links.new(_tc_b.outputs['Object'], _nf.inputs['Vector'])
    _cr = _nt_b.nodes.new('ShaderNodeValToRGB')
    _cr.color_ramp.interpolation = 'CONSTANT'
    _cr.color_ramp.elements[0].position = 0.0
    _cr.color_ramp.elements[0].color    = (*_BC, 1.0)
    _cr.color_ramp.elements[1].position = 0.82
    _cr.color_ramp.elements[1].color    = (0.960, 0.962, 0.965, 1.0)
    _nt_b.links.new(_nf.outputs['Fac'],   _cr.inputs['Fac'])
    _nt_b.links.new(_cr.outputs['Color'], _b_body.inputs['Base Color'])
    _no = _nt_b.nodes.new('ShaderNodeTexNoise')
    _no.inputs['Scale'].default_value  = 22.0
    _no.inputs['Detail'].default_value = 4.0
    _nt_b.links.new(_tc_b.outputs['Object'], _no.inputs['Vector'])
    _mr = _nt_b.nodes.new('ShaderNodeMapRange')
    for _ii, _vv in [(1, 0.0), (2, 1.0), (3, 0.065), (4, 0.090)]:
        try: _mr.inputs[_ii].default_value = _vv
        except Exception: pass
    _nt_b.links.new(_no.outputs['Fac'], _mr.inputs[0])
    _nt_b.links.new(_mr.outputs[0],    _b_body.inputs['Roughness'])
    print("[OK] Car paint: flake + orange-peel network built")
except Exception as _ex:
    print(f"[WARN] Paint node network: {_ex}")

# Glass — IOR 1.45, Transmission 1.0, green tint, micro-scratch normals
_b_gl = _bsdf(_clr(M['glass']))
_b_gl.inputs["Base Color"].default_value = (0.920, 0.970, 0.930, 1.0)
_b_gl.inputs["Roughness"].default_value  = 0.0
_si(_b_gl, "Transmission Weight", "Transmission", val=1.0)
_b_gl.inputs["IOR"].default_value = 1.45
try: M['glass'].blend_method = 'BLEND'
except Exception: pass
try: _noise_nrm(M['glass'].node_tree, _b_gl, sc=200.0, dt=4.0, st=0.06)
except Exception as _ex: print(f"[WARN] Glass normals: {_ex}")

# Chrome / polished metal — near-black base, metallic 1.0, roughness 0.025
_b_ch = _bsdf(_clr(M['chrome']))
_b_ch.inputs["Base Color"].default_value = (0.012, 0.012, 0.012, 1.0)
_b_ch.inputs["Metallic"].default_value   = 1.0
_b_ch.inputs["Roughness"].default_value  = 0.025

# Rim — polished machined aluminium with slight anisotropy
_b_rm = _bsdf(_clr(M['rim']))
_b_rm.inputs["Base Color"].default_value = (0.012, 0.012, 0.012, 1.0)
_b_rm.inputs["Metallic"].default_value   = 1.0
_b_rm.inputs["Roughness"].default_value  = 0.045
_si(_b_rm, "Anisotropic", "Anisotropy", val=0.35)

# Tire rubber — sidewall grain via noise normal map
_b_ti = _bsdf(_clr(M['tire']))
_b_ti.inputs["Base Color"].default_value = (0.060, 0.060, 0.060, 1.0)
_b_ti.inputs["Roughness"].default_value  = 0.85
try: _noise_nrm(M['tire'].node_tree, _b_ti, sc=40.0, dt=3.0, st=0.28)
except Exception as _ex: print(f"[WARN] Tire normals: {_ex}")

# Rubber seals / mouldings
_b_rb = _bsdf(_clr(M['rubber']))
_b_rb.inputs["Base Color"].default_value = (0.055, 0.055, 0.055, 1.0)
_b_rb.inputs["Roughness"].default_value  = 0.88

# Brushed aluminium — Anisotropy 0.8, applied to side sills
M['brushed_al'] = bpy.data.materials.new("Brushed_Al")
M['brushed_al'].use_nodes = True
_b_ba = _bsdf(_clr(M['brushed_al']))
_b_ba.inputs["Base Color"].default_value = (0.012, 0.012, 0.012, 1.0)
_b_ba.inputs["Metallic"].default_value   = 1.0
_b_ba.inputs["Roughness"].default_value  = 0.150
_si(_b_ba, "Anisotropic", "Anisotropy",                   val=0.80)
_si(_b_ba, "Anisotropic Rotation", "Anisotropy Rotation", val=0.0)
try: _noise_nrm(M['brushed_al'].node_tree, _b_ba, sc=60.0, dt=2.0, st=0.12)
except Exception: pass
for _sn in ("Sill_L", "Sill_R"):
    _so = bpy.data.objects.get(_sn)
    if _so: asgn(_so, 'brushed_al')
# ── EXTERIOR SPECIALTY MATERIALS ─────────────────────────────────────────────

# Satin black — bumpers, grilles, engine cover, intake meshes
_b_bk = _bsdf(_clr(M['black']))
_b_bk.inputs["Base Color"].default_value = (0.018, 0.018, 0.018, 1.0)
_b_bk.inputs["Metallic"].default_value   = 0.0
_b_bk.inputs["Roughness"].default_value  = 0.50
_si(_b_bk, "Coat Weight", "Clearcoat",              val=0.22)
_si(_b_bk, "Coat Roughness", "Clearcoat Roughness", val=0.24)

# Panel gap — ultra-matte shadow groove
_b_pg = _bsdf(_clr(M['panel_gap']))
_b_pg.inputs["Base Color"].default_value = (0.005, 0.005, 0.005, 1.0)
_b_pg.inputs["Metallic"].default_value   = 0.0
_b_pg.inputs["Roughness"].default_value  = 0.96

# Anthracite — dark metallic spoke pockets
_b_an = _bsdf(_clr(M['anthracite']))
_b_an.inputs["Base Color"].default_value = (0.012, 0.012, 0.014, 1.0)
_b_an.inputs["Metallic"].default_value   = 0.72
_b_an.inputs["Roughness"].default_value  = 0.42

# White sidewall lettering — semi-matte rubber compound
_b_sw = _bsdf(_clr(M['sidewall_w']))
_b_sw.inputs["Base Color"].default_value = (0.855, 0.855, 0.848, 1.0)
_b_sw.inputs["Metallic"].default_value   = 0.0
_b_sw.inputs["Roughness"].default_value  = 0.78

# Undertray — flat satin composite underside
_b_fl = _bsdf(_clr(M['floor']))
_b_fl.inputs["Base Color"].default_value = (0.058, 0.058, 0.058, 1.0)
_b_fl.inputs["Metallic"].default_value   = 0.0
_b_fl.inputs["Roughness"].default_value  = 0.84

# PCCB carbon ceramic brake disc — dark grey, machined ceramic grain
_b_pc = _bsdf(_clr(M['pccb_disc']))
_b_pc.inputs["Base Color"].default_value = (0.068, 0.068, 0.072, 1.0)
_b_pc.inputs["Metallic"].default_value   = 0.0
_b_pc.inputs["Roughness"].default_value  = 0.74
try: _noise_nrm(M['pccb_disc'].node_tree, _b_pc, sc=110.0, dt=6.0, st=0.16)
except Exception as _ex: print(f"[WARN] PCCB normals: {_ex}")

# Yellow caliper — Porsche Racing Yellow, gloss paint + clearcoat
_b_yc = _bsdf(_clr(M['yellow_cal']))
_b_yc.inputs["Base Color"].default_value = (0.942, 0.722, 0.016, 1.0)
_b_yc.inputs["Metallic"].default_value   = 0.0
_b_yc.inputs["Roughness"].default_value  = 0.10
_si(_b_yc, "Coat Weight", "Clearcoat",              val=0.88)
_si(_b_yc, "Coat Roughness", "Clearcoat Roughness", val=0.04)

# Smoked polycarbonate — taillight cover, near-black, semi-transparent
_b_sm = _bsdf(_clr(M['smoked']))
_b_sm.inputs["Base Color"].default_value = (0.016, 0.016, 0.016, 1.0)
_b_sm.inputs["Roughness"].default_value  = 0.04
_si(_b_sm, "Transmission Weight", "Transmission", val=0.80)
_b_sm.inputs["IOR"].default_value = 1.49
try: M['smoked'].blend_method = 'BLEND'
except Exception: pass

# Lens clear — polycarbonate headlight outer cover (IOR 1.49, low roughness)
_b_lc = _bsdf(_clr(M['lens_clear']))
_b_lc.inputs["Base Color"].default_value = (0.840, 0.930, 1.000, 1.0)
_b_lc.inputs["Roughness"].default_value  = 0.02
_si(_b_lc, "Transmission Weight", "Transmission", val=0.92)
_b_lc.inputs["IOR"].default_value = 1.49
try: M['lens_clear'].blend_method = 'BLEND'
except Exception: pass

# ── INTERIOR PBR ──────────────────────────────────────────────────────────────

# Dark leather — seats, steering wheel rim, dashboard, console
_b_ld = _bsdf(_clr(M['lth_dk']))
_b_ld.inputs["Base Color"].default_value = (0.038, 0.030, 0.022, 1.0)
_b_ld.inputs["Metallic"].default_value   = 0.0
_b_ld.inputs["Roughness"].default_value  = 0.54
_si(_b_ld, "Coat Weight", "Clearcoat",              val=0.12)
_si(_b_ld, "Coat Roughness", "Clearcoat Roughness", val=0.30)
try: _noise_nrm(M['lth_dk'].node_tree, _b_ld, sc=88.0, dt=5.0, st=0.24)
except Exception as _ex: print(f"[WARN] Leather dark normals: {_ex}")

# Light leather — contrast seat stripe, warm beige
_b_ll = _bsdf(_clr(M['lth_lt']))
_b_ll.inputs["Base Color"].default_value = (0.585, 0.485, 0.348, 1.0)
_b_ll.inputs["Metallic"].default_value   = 0.0
_b_ll.inputs["Roughness"].default_value  = 0.52
_si(_b_ll, "Coat Weight", "Clearcoat",              val=0.12)
_si(_b_ll, "Coat Roughness", "Clearcoat Roughness", val=0.30)
try: _noise_nrm(M['lth_lt'].node_tree, _b_ll, sc=88.0, dt=5.0, st=0.24)
except Exception as _ex: print(f"[WARN] Leather light normals: {_ex}")

# Alcantara — headliner, A-pillars, seat headrest pads (suede-like, near-zero gloss)
_b_al = _bsdf(_clr(M['alctna']))
_b_al.inputs["Base Color"].default_value = (0.055, 0.055, 0.060, 1.0)
_b_al.inputs["Metallic"].default_value   = 0.0
_b_al.inputs["Roughness"].default_value  = 0.96
try: _noise_nrm(M['alctna'].node_tree, _b_al, sc=185.0, dt=6.0, st=0.12)
except Exception as _ex: print(f"[WARN] Alcantara normals: {_ex}")

# Carbon fibre interior — console, trim, PDK gate, steering column
# Wave texture simulates twill weave pattern; clearcoat over the top
_b_cf = _bsdf(_clr(M['carb_int']))
_b_cf.inputs["Base Color"].default_value = (0.026, 0.026, 0.026, 1.0)
_b_cf.inputs["Metallic"].default_value   = 0.0
_b_cf.inputs["Roughness"].default_value  = 0.18
_si(_b_cf, "Anisotropic", "Anisotropy",                    val=0.70)
_si(_b_cf, "Coat Weight", "Clearcoat",                     val=1.0)
_si(_b_cf, "Coat Roughness", "Clearcoat Roughness",        val=0.04)
try:
    _nt_cf = M['carb_int'].node_tree
    _tc_cf = _nt_cf.nodes.new('ShaderNodeTexCoord')
    _wv_cf = _nt_cf.nodes.new('ShaderNodeTexWave')
    _wv_cf.wave_type = 'BANDS'
    _wv_cf.inputs['Scale'].default_value       = 26.0
    _wv_cf.inputs['Distortion'].default_value  = 2.6
    _wv_cf.inputs['Detail'].default_value      = 6.0
    try: _wv_cf.inputs['Detail Scale'].default_value = 1.5
    except Exception: pass
    _nt_cf.links.new(_tc_cf.outputs['Object'], _wv_cf.inputs['Vector'])
    _cr_cf = _nt_cf.nodes.new('ShaderNodeValToRGB')
    _cr_cf.color_ramp.elements[0].position = 0.42
    _cr_cf.color_ramp.elements[0].color    = (0.012, 0.012, 0.012, 1.0)
    _cr_cf.color_ramp.elements[1].position = 0.58
    _cr_cf.color_ramp.elements[1].color    = (0.055, 0.055, 0.055, 1.0)
    _nt_cf.links.new(_wv_cf.outputs['Color'], _cr_cf.inputs['Fac'])
    _nt_cf.links.new(_cr_cf.outputs['Color'], _b_cf.inputs['Base Color'])
    _mr_cf = _nt_cf.nodes.new('ShaderNodeMapRange')
    for _ii2, _vv2 in [(1, 0.42), (2, 0.58), (3, 0.14), (4, 0.22)]:
        try: _mr_cf.inputs[_ii2].default_value = _vv2
        except Exception: pass
    _nt_cf.links.new(_wv_cf.outputs['Color'], _mr_cf.inputs[0])
    _nt_cf.links.new(_mr_cf.outputs[0], _b_cf.inputs['Roughness'])
    print("[OK] Carbon weave node network built")
except Exception as _ex:
    print(f"[WARN] Carbon weave: {_ex}")

print("[OK] PBR material upgrade complete — 20 materials")

# ── STUDIO LIGHTING SETUP ────────────────────────────────────────────────────
scn = bpy.context.scene

# Cycles engine — path-traced reflections, no SSR needed
scn.render.engine = 'CYCLES'
scn.cycles.samples = 512           # production
scn.cycles.preview_samples = 128   # viewport
scn.cycles.use_denoising = True
try:
    scn.cycles.denoiser = 'OPENIMAGEDENOISE'
except Exception:
    pass
scn.render.resolution_x = 4096
scn.render.resolution_y = 2304     # 4K 16:9
scn.render.use_motion_blur = False  # static hero shot

# World — procedural automotive studio (white cyclorama backdrop)
_w = bpy.data.worlds.new("StudioWorld")
scn.world = _w
_w.use_nodes = True
_wnt = _w.node_tree
_wnt.nodes.clear()
_bg = _wnt.nodes.new('ShaderNodeBackground')
_bg.inputs['Color'].default_value = (0.92, 0.92, 0.92, 1.0)   # soft white
_bg.inputs['Strength'].default_value = 0.8
_wout = _wnt.nodes.new('ShaderNodeOutputWorld')
_wnt.links.new(_bg.outputs['Background'], _wout.inputs['Surface'])

# Ambient Occlusion — Cycles world AO (0.05 m distance, factor 0.8)
try:
    _w.light_settings.use_ambient_occlusion = True
    _w.light_settings.ao_factor = 0.8
    _w.light_settings.distance = 0.05
except Exception:
    pass

# Color management — AgX with Medium-High contrast, neutral exposure
try:
    scn.view_settings.view_transform = 'AgX'
    scn.view_settings.look = 'AgX - Medium High Contrast'
except Exception:
    try:
        scn.view_settings.view_transform = 'Filmic'
        scn.view_settings.look = 'High Contrast'
    except Exception:
        pass
scn.view_settings.exposure = 0.0
scn.view_settings.gamma = 1.0

def _area_light(name, size_x, size_y, energy, color_K, loc, rot_euler):
    ld = bpy.data.lights.new(name, 'AREA')
    ld.shape = 'RECTANGLE'
    ld.size = size_x
    ld.size_y = size_y
    ld.energy = energy
    # color temperature → RGB via blackbody approximation
    def _K_to_rgb(K):
        t = K / 100.0
        if t <= 66:
            r = 1.0
            g = max(0.0, min(1.0, (99.4708025861 * math.log(t) - 161.1195681661) / 255.0))
        else:
            r = max(0.0, min(1.0, (329.698727446 * ((t - 60) ** -0.1332047592)) / 255.0))
            g = max(0.0, min(1.0, (288.1221695283 * ((t - 60) ** -0.0755148492)) / 255.0))
        if t >= 66:
            b = 1.0
        elif t <= 19:
            b = 0.0
        else:
            b = max(0.0, min(1.0, (138.5177312231 * math.log(t - 10) - 305.0447927307) / 255.0))
        return (r, g, b)
    ld.color = _K_to_rgb(color_K)
    lo = bpy.data.objects.new(name, ld)
    col.objects.link(lo)
    lo.location = loc
    lo.rotation_euler = rot_euler
    return lo

# Key light — 2×4 m softbox, 45° above-left, 5000 K, 8 W/m²
# area in m² = 2×4 = 8 → energy = 8 W/m² × 8 m² = 64 W total
_key = _area_light(
    'Key_Softbox', 2.0, 4.0, 64.0, 5000,
    loc=(-4.5,  3.5,  4.0),
    rot_euler=(math.radians(-45), math.radians(0), math.radians(-45)),
)

# Fill light — 4×4 m bounce panel, right side, cool-white 6200 K, 0.3 relative
_fill = _area_light(
    'Fill_Bounce', 4.0, 4.0, 19.0, 6200,
    loc=(5.0, -3.0, 2.5),
    rot_euler=(math.radians(-20), math.radians(0), math.radians(130)),
)

# Rim / hair light — 0.3×3.0 m strip, directly behind vehicle, 6500 K, crisp edge
_rim = _area_light(
    'Rim_Strip', 0.3, 3.0, 120.0, 6500,
    loc=(0.0, -5.5, 2.2),
    rot_euler=(math.radians(-15), math.radians(0), math.radians(180)),
)

print("[OK] Studio lights: key 5000K softbox + fill bounce + 6500K rim strip")

# Ground plane — infinite white cyclorama with shadow-catch material
_cyc_mesh = bpy.data.meshes.new("Cyclorama")
_cyc_verts = [(-30,-30,0),(30,-30,0),(30,30,0),(-30,30,0)]
_cyc_faces = [(0,1,2,3)]
_cyc_mesh.from_pydata(_cyc_verts, [], _cyc_faces)
_cyc_mesh.update()
_cyc_obj = bpy.data.objects.new("Cyclorama", _cyc_mesh)
col.objects.link(_cyc_obj)
_cyc_obj.location = (0, 0, -0.78)   # flush with car underside

_cyc_mat = bpy.data.materials.new("Cyclorama_Shadow")
_cyc_mat.use_nodes = True
_cyc_nt = _cyc_mat.node_tree
_cyc_nt.nodes.clear()
_shad = _cyc_nt.nodes.new('ShaderNodeBsdfDiffuse')
_shad.inputs['Color'].default_value = (0.96, 0.96, 0.96, 1.0)
_shad.inputs['Roughness'].default_value = 1.0
_cyc_out = _cyc_nt.nodes.new('ShaderNodeOutputMaterial')
_cyc_nt.links.new(_shad.outputs['BSDF'], _cyc_out.inputs['Surface'])
_cyc_obj.data.materials.append(_cyc_mat)
try:
    _cyc_obj.is_shadow_catcher = True          # Blender 4.0+ direct attribute
except AttributeError:
    try:
        _cyc_obj.cycles.is_shadow_catcher = True
    except AttributeError:
        pass

print("[OK] Cyclorama ground plane (shadow catcher, 60×60 m)")

# Chrome sphere — reflection calibration reference, parked at right-front fender
_sph_mesh = bpy.data.meshes.new("ChromeSphere")
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.12, location=(2.8, -1.1, -0.65),
                                      segments=64, ring_count=32)
_sph_obj = bpy.context.object
_sph_obj.name = "ChromeSphere_Ref"
_sph_mesh = _sph_obj.data
_sph_mesh.name = "ChromeSphere"
for p in _sph_mesh.polygons: p.use_smooth = True
_sph_mat = bpy.data.materials.new("Chrome_Ref")
_sph_mat.use_nodes = True
_sb = _sph_mat.node_tree.nodes["Principled BSDF"]
_sb.inputs['Base Color'].default_value = (0.95, 0.93, 0.90, 1.0)
_sb.inputs['Metallic'].default_value = 1.0
_sb.inputs['Roughness'].default_value = 0.0
_sph_obj.data.materials.append(_sph_mat)

print("[OK] Chrome sphere reference (r=120 mm) at right-front fender")

# Studio camera — 3/4 front view matching automotive press shot convention
cam_data = bpy.data.cameras.new("StudioCam")
cam_data.lens = 85.0          # 85 mm — flattering for cars, minimal distortion
cam_data.clip_start = 0.1
cam_data.clip_end  = 100.0
# Depth of field — f/8, focused on right-front wheel arch
cam_data.dof.use_dof = True
cam_data.dof.aperture_fstop = 8.0  # f/8 — sharp body, very subtle background blur
cam_data.dof.focus_distance = 7.1  # cam(6,-4.5,1.6) → wheel arch(1.5,0.8,0) ≈ 7.1 m
cam_obj = bpy.data.objects.new("StudioCam", cam_data)
col.objects.link(cam_obj)
cam_obj.location = (6.0, -4.5, 1.6)
cam_obj.rotation_euler = (math.radians(80), 0, math.radians(53))
scn.camera = cam_obj

print("[OK] Studio camera: 85 mm, f/8 DOF @ 7.1 m, 3/4 front-left press position")
print("[OK] Scene ready — render with F12 or Render > Render Image")

# ── POLISH DETAILS ────────────────────────────────────────────────────────────
import random as _rnd
_rnd.seed(42)

# Road dust decals removed — flat planes don't attach to body surface correctly in GLB

# Water droplets removed — floating artifacts in model-viewer (no surface snapping)

# 3 ── Exhaust tips — twin oval outlets with heat discoloration gradient
_exh_m = bpy.data.materials.new("ExhaustHeat")
_exh_m.use_nodes = True
_eht = _exh_m.node_tree
_eht.nodes.clear()
_e_co = _eht.nodes.new('ShaderNodeTexCoord')
_e_gr = _eht.nodes.new('ShaderNodeTexGradient')
_e_gr.gradient_type = 'RADIAL'
_e_cr = _eht.nodes.new('ShaderNodeValToRGB')
_e_cr.color_ramp.elements[0].position = 0.0
_e_cr.color_ramp.elements[0].color = (0.42, 0.52, 0.95, 1.0)  # blue (centre, hottest)
_e_cr.color_ramp.elements.new(0.35).color = (0.96, 0.86, 0.25, 1.0)  # straw-yellow
_e_cr.color_ramp.elements.new(0.70).color = (0.82, 0.74, 0.68, 1.0)  # rose-titanium
_e_cr.color_ramp.elements[-1].position = 1.0
_e_cr.color_ramp.elements[-1].color = (0.88, 0.85, 0.80, 1.0)   # raw steel rim
_e_pb = _eht.nodes.new('ShaderNodeBsdfPrincipled')
_e_pb.inputs['Metallic'].default_value = 0.95
_e_pb.inputs['Roughness'].default_value = 0.12
_e_out = _eht.nodes.new('ShaderNodeOutputMaterial')
_eht.links.new(_e_co.outputs['Object'], _e_gr.inputs['Vector'])
_eht.links.new(_e_gr.outputs['Color'], _e_cr.inputs['Fac'])
_eht.links.new(_e_cr.outputs['Color'], _e_pb.inputs['Base Color'])
_eht.links.new(_e_pb.outputs['BSDF'], _e_out.inputs['Surface'])
for _ey, _ename in [(0.48, 'ExhaustTip_L'), (-0.48, 'ExhaustTip_R')]:
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=32, radius=0.055, depth=0.08,
        location=(-2.42, _ey, 0.17))
    _et = bpy.context.object; _et.name = _ename
    _et.scale.x = 0.72        # compress local X → after Ry(90°) becomes Z → oval wider than tall
    bpy.ops.object.transform_apply(scale=True)
    _et.rotation_euler = (0, math.radians(90), 0)
    _et.data.materials.append(_exh_m)
print("[OK] Exhaust tips: twin oval + blue→yellow→titanium heat gradient")

# 4 ── License plate recesses — EU format (520×111 mm) front + rear
_lp_m = bpy.data.materials.new("LicensePlate")
_lp_m.use_nodes = True
_lp_b = _lp_m.node_tree.nodes["Principled BSDF"]
_lp_b.inputs['Base Color'].default_value = (0.96, 0.96, 0.94, 1.0)  # white plate
_lp_b.inputs['Roughness'].default_value = 0.50
for _lppos, _lprotZ, _lpname in [
    ((2.36, 0.0, 0.38),  0,         'LicensePlate_F'),
    ((-2.42, 0.0, 0.22), math.pi,   'LicensePlate_R'),
]:
    bpy.ops.mesh.primitive_plane_add(size=1.0, location=_lppos)
    _lp = bpy.context.object; _lp.name = _lpname
    _lp.scale = (0.260, 0.056, 1.0)          # 520×111 mm half-scale (model ~1:1 m)
    _lp.rotation_euler = (math.radians(90), 0, _lprotZ)
    bpy.ops.object.transform_apply(scale=True, rotation=True)
    _lp.data.materials.append(_lp_m)
print("[OK] License plates: EU format, front + rear recesses")

# 5 ── Wiper blades — flat aero profile, parked at base of windshield
_wiper_m = bpy.data.materials.new("WiperBlade")
_wiper_m.use_nodes = True
_wiper_b = _wiper_m.node_tree.nodes["Principled BSDF"]
_wiper_b.inputs['Base Color'].default_value = (0.03, 0.03, 0.03, 1.0)
_wiper_b.inputs['Roughness'].default_value = 0.55
for _wy, _wang, _wname in [
    ( 0.29, math.radians(22),  'Wiper_L'),
    (-0.20, math.radians(-14), 'Wiper_R'),   # slightly shorter passenger wiper
]:
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(1.35, _wy, 0.655))
    _wb = bpy.context.object; _wb.name = _wname
    _wb.scale = (0.50, 0.011, 0.0045)         # 1 m long, 22 mm wide, 9 mm tall
    _wb.rotation_euler = (math.radians(-8), math.radians(-3), _wang)
    bpy.ops.object.transform_apply(scale=True, rotation=True)
    _wb.data.materials.append(_wiper_m)
print("[OK] Wiper blades: flat aero profile, parked")

# 6 ── Door handles — flush capacitive, body-colour + chrome perimeter edge
_dh_chrome = bpy.data.materials.new("HandleEdge")
_dh_chrome.use_nodes = True
_dhb = _dh_chrome.node_tree.nodes["Principled BSDF"]
_dhb.inputs['Base Color'].default_value = (0.90, 0.88, 0.85, 1.0)
_dhb.inputs['Metallic'].default_value = 1.0
_dhb.inputs['Roughness'].default_value = 0.05
for _hy, _hname in [(0.965, 'DoorHandle_L'), (-0.965, 'DoorHandle_R')]:
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0.22, _hy, 0.33))
    _dh = bpy.context.object; _dh.name = _hname
    _dh.scale = (0.130, 0.009, 0.026)         # 260×18×52 mm
    bpy.ops.object.transform_apply(scale=True)
    _dh.data.materials.clear()
    _dh.data.materials.append(M['body'])      # flush body-colour face
    _dh.data.materials.append(_dh_chrome)     # chrome edge (slot 1, assign in UV)
print("[OK] Door handles: flush capacitive, body-colour + chrome rim")

# 7 ── Porsche hood crest — 3D raised emblem, polished metal
_crest_m = bpy.data.materials.new("CrestMetal")
_crest_m.use_nodes = True
_cm_b = _crest_m.node_tree.nodes["Principled BSDF"]
_cm_b.inputs['Base Color'].default_value = (0.94, 0.91, 0.86, 1.0)
_cm_b.inputs['Metallic'].default_value = 1.0
_cm_b.inputs['Roughness'].default_value = 0.025
for _clayer, _cr, _cd, _cloc in [
    ('Crest_Base',   0.044, 0.004, (1.96, 0.0, 0.558)),
    ('Crest_Shield', 0.036, 0.003, (1.96, 0.0, 0.563)),
    ('Crest_Top',    0.022, 0.002, (1.96, 0.0, 0.568)),
]:
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=32, radius=_cr, depth=_cd, location=_cloc)
    _cl = bpy.context.object; _cl.name = _clayer
    _cl.rotation_euler = (0, math.radians(12), 0)   # follow hood tilt
    for _p in _cl.data.polygons: _p.use_smooth = True
    _cl.data.materials.append(_crest_m)
print("[OK] Porsche hood crest: 3-layer raised emblem, polished metal")

# 8 ── TURBO S rear badge — chrome strip (text-to-mesh unreliable in headless GLB export)
_badge_m = bpy.data.materials.new("BadgeChrome")
_badge_m.use_nodes = True
_bb = _badge_m.node_tree.nodes["Principled BSDF"]
_bb.inputs['Base Color'].default_value = (0.95, 0.93, 0.90, 1.0)
_bb.inputs['Metallic'].default_value = 1.0
_bb.inputs['Roughness'].default_value = 0.028
bpy.ops.mesh.primitive_plane_add(size=1.0, location=(-1.88, 0.0, 0.345))
_bdg = bpy.context.object; _bdg.name = "Badge_TurboS"
_bdg.scale = (0.115, 0.0015, 0.016)      # 230 mm wide, 3 mm deep, 32 mm tall strip
_bdg.rotation_euler = (math.radians(90), 0, 0)
bpy.ops.object.transform_apply(scale=True, rotation=True)
_bdg.data.materials.append(_badge_m)
print("[OK] TURBO S badge: chrome strip on rear deck lid")

print("[OK] Polish details complete: exhaust · plates · wipers · handles · crest · badge")

# ── EXPORT — mesh objects only; lights & camera stay in scene for rendering ──
out = os.path.normpath(os.path.join(
    os.path.dirname(os.path.abspath(__file__)), '..', 'apps', 'web', 'public', 'models', 'porsche911.glb'))
_skip = {'Cyclorama', 'ChromeSphere_Ref'}
bpy.ops.object.select_all(action='DESELECT')
for _o in bpy.data.objects:
    if _o.type == 'MESH' and _o.name not in _skip and not _o.name.startswith('Int_'):
        _o.select_set(True)
bpy.ops.export_scene.gltf(
    filepath=out, export_format='GLB', use_selection=True,
    export_apply=True, export_materials='EXPORT', export_normals=True)
print(f"\n[OK] {out}")
_mesh_n = sum(1 for o in bpy.data.objects
              if o.type == 'MESH' and o.name not in ('Cyclorama','ChromeSphere_Ref')
              and not o.name.startswith('Int_'))
print(f"[INFO] exported={_mesh_n} meshes | mats={len(bpy.data.materials)} | lights=3 | cam=1")
