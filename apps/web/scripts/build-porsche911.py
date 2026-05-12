import bpy
import bmesh
import math
import os

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

def new_mat(name, color, metallic=0.0, roughness=0.5, emission=None):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    if emission:
        bsdf.inputs["Emission Color"].default_value = (*emission, 1.0)
        bsdf.inputs["Emission Strength"].default_value = 2.0
    return mat

def set_smooth(obj):
    for f in obj.data.polygons:
        f.use_smooth = True

def bevel_obj(obj, offset=0.04, segs=3):
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bmesh.ops.bevel(bm, geom=[e for e in bm.edges], offset=offset, segments=segs)
    bm.to_mesh(obj.data)
    bm.free()

def add_box(name, loc, scale, mat, bevel=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(scale=True)
    if bevel:
        bevel_obj(obj, bevel[0], bevel[1])
    obj.data.materials.append(mat)
    set_smooth(obj)
    return obj

# Materials
mat_body = new_mat("Body", (0.75,0.75,0.78), metallic=0.9, roughness=0.15)
mat_glass = new_mat("Glass", (0.08,0.10,0.14), metallic=0.1, roughness=0.02)
mat_trim = new_mat("Trim", (0.02,0.02,0.02), metallic=0.3, roughness=0.4)
mat_rubber = new_mat("Rubber", (0.01,0.01,0.01), roughness=0.95)
mat_rim = new_mat("Rim", (0.6,0.6,0.62), metallic=0.95, roughness=0.1)
mat_brake = new_mat("Brake", (0.9,0.75,0.05), metallic=0.4, roughness=0.3)
mat_hl = new_mat("Headlight", (1,0.98,0.88), metallic=0.1, roughness=0.02, emission=(1,0.98,0.88))
mat_tl = new_mat("Taillight", (0.9,0.05,0.02), metallic=0.1, roughness=0.1, emission=(0.9,0.05,0.02))
mat_int = new_mat("Interior", (0.015,0.015,0.015), roughness=0.85)
mat_exh = new_mat("Exhaust", (0.3,0.3,0.3), metallic=0.85, roughness=0.2)
mat_carbon = new_mat("Carbon", (0.03,0.03,0.03), metallic=0.2, roughness=0.3)
mat_grille = new_mat("Grille", (0.01,0.01,0.01), metallic=0.1, roughness=0.8)

WB = 2.457

# BODY
add_box("Body_Lower", (0,0,0.36), (0.926,2.286/2,0.275), mat_body, (0.04,3))
add_box("Hood", (0,1.5,0.52), (0.82,0.7,0.04), mat_body, (0.02,2))
bpy.context.active_object.rotation_euler = (math.radians(-5),0,0)
add_box("Front_Bumper", (0,2.1,0.28), (0.88,0.25,0.16), mat_body, (0.03,3))
add_box("Splitter", (0,2.2,0.12), (0.85,0.12,0.015), mat_carbon)
for x in [-0.45,0,0.45]:
    w = 0.25 if x==0 else 0.18
    add_box(f"Intake_{x}", (x,2.25,0.22), (w/2,0.02,0.06), mat_grille)

# CABIN
add_box("Cabin", (0,-0.15,0.82), (0.70,0.85,0.36), mat_body, (0.06,4))
add_box("Roof", (0,-0.25,1.26), (0.62,0.6,0.04), mat_body, (0.04,3))

# GLASS
add_box("Windshield", (0,0.55,1.0), (0.66,0.02,0.32), mat_glass)
bpy.context.active_object.rotation_euler = (math.radians(28),0,0)
add_box("Rear_Window", (0,-0.85,0.98), (0.60,0.02,0.28), mat_glass)
bpy.context.active_object.rotation_euler = (math.radians(-32),0,0)
for s in [-1,1]:
    add_box(f"SideWin_{'L' if s<0 else 'R'}", (s*0.72,-0.08,1.0), (0.015,0.58,0.2), mat_glass)

# REAR
add_box("Rear_Bay", (0,-1.35,0.42), (0.95,0.55,0.22), mat_body, (0.04,3))
for s in [-1,1]:
    add_box(f"RearFender_{'L' if s<0 else 'R'}", (s*0.96,-1.25,0.38), (0.1,0.5,0.2), mat_body, (0.04,3))
    add_box(f"FrontFender_{'L' if s<0 else 'R'}", (s*0.86,1.1,0.38), (0.07,0.45,0.18), mat_body, (0.03,2))
add_box("RearBumper", (0,-2.15,0.26), (0.90,0.12,0.14), mat_trim, (0.02,2))
add_box("Diffuser", (0,-2.2,0.10), (0.75,0.08,0.06), mat_carbon)
for i in range(5):
    add_box(f"DiffFin_{i}", (-0.4+i*0.2,-2.2,0.10), (0.008,0.06,0.05), mat_carbon)

# GT3 WING
add_box("GT3_Wing", (0,-1.65,1.32), (0.80,0.15,0.015), mat_carbon, (0.01,2))
bpy.context.active_object.rotation_euler = (math.radians(-8),0,0)
for s in [-1,1]:
    add_box(f"WingEnd_{'L' if s<0 else 'R'}", (s*0.78,-1.65,1.30), (0.012,0.18,0.06), mat_carbon)
    bpy.ops.mesh.primitive_cylinder_add(radius=0.015, depth=0.35, location=(s*0.4,-1.55,1.15))
    o = bpy.context.active_object
    o.name = f"SwanNeck_{'L' if s<0 else 'R'}"
    o.rotation_euler = (math.radians(15),0,0)
    o.data.materials.append(mat_carbon)
    set_smooth(o)

# HEADLIGHTS
for s in [-1,1]:
    bpy.ops.mesh.primitive_cylinder_add(radius=0.10, depth=0.06, location=(s*0.55,2.12,0.48))
    o = bpy.context.active_object
    o.name = f"HL_{'L' if s<0 else 'R'}"
    o.rotation_euler = (math.radians(90),0,0)
    o.data.materials.append(mat_hl)
    set_smooth(o)
    bpy.ops.mesh.primitive_torus_add(major_radius=0.09, minor_radius=0.008, location=(s*0.55,2.15,0.48))
    o2 = bpy.context.active_object
    o2.name = f"DRL_{'L' if s<0 else 'R'}"
    o2.rotation_euler = (math.radians(90),0,0)
    o2.data.materials.append(mat_hl)
    set_smooth(o2)

# TAIL LIGHTS
add_box("TL_Bar", (0,-2.12,0.52), (0.82,0.015,0.025), mat_tl, (0.005,2))
for s in [-1,1]:
    add_box(f"TL_{'L' if s<0 else 'R'}", (s*0.72,-2.1,0.52), (0.08,0.02,0.04), mat_tl)

# EXHAUST
for x in [-0.15,0.15]:
    bpy.ops.mesh.primitive_cylinder_add(radius=0.04, depth=0.10, location=(x,-2.28,0.18))
    o = bpy.context.active_object
    o.name = f"Exh_{x}"
    o.rotation_euler = (math.radians(90),0,0)
    o.data.materials.append(mat_exh)
    set_smooth(o)

add_box("EngGrille", (0,-2.08,0.40), (0.45,0.01,0.08), mat_grille)

# WHEELS
TF, TR, WR = 1.584, 1.572, 0.33
for wx,wy,wz,wn in [(-TF/2,WB/2,WR,"FL"),(TF/2,WB/2,WR,"FR"),(-TR/2,-WB/2,WR,"RL"),(TR/2,-WB/2,WR,"RR")]:
    tw = 0.315 if "R" in wn[1] else 0.265
    bpy.ops.mesh.primitive_torus_add(major_radius=WR, minor_radius=tw/2*0.7, major_segments=36, minor_segments=18, location=(wx,wy,wz))
    o = bpy.context.active_object
    o.name = f"Tire_{wn}"
    o.rotation_euler = (0,math.radians(90),0)
    o.data.materials.append(mat_rubber)
    set_smooth(o)
    bpy.ops.mesh.primitive_cylinder_add(radius=WR*0.72, depth=tw*0.3, vertices=32, location=(wx,wy,wz))
    o2 = bpy.context.active_object
    o2.name = f"Rim_{wn}"
    o2.rotation_euler = (0,math.radians(90),0)
    o2.data.materials.append(mat_rim)
    set_smooth(o2)
    bpy.ops.mesh.primitive_cylinder_add(radius=0.035, depth=0.04, vertices=6, location=(wx,wy,wz))
    o3 = bpy.context.active_object
    o3.name = f"Lock_{wn}"
    o3.rotation_euler = (0,math.radians(90),0)
    o3.data.materials.append(mat_rim)
    for i in range(5):
        a = i*math.radians(72)
        sl = WR*0.55
        bpy.ops.mesh.primitive_cube_add(size=1, location=(wx, wy+math.cos(a)*sl*0.5, wz+math.sin(a)*sl*0.5))
        sp = bpy.context.active_object
        sp.name = f"Spoke_{wn}_{i}"
        sp.scale = (tw*0.15, sl/2, 0.02)
        sp.rotation_euler = (a,0,0)
        sp.data.materials.append(mat_rim)
    add_box(f"Caliper_{wn}", (wx+(0.05 if wx>0 else -0.05), wy+0.08, wz-0.02), (0.02,0.06,0.04), mat_brake)

# DETAILS
for s in [-1,1]:
    add_box(f"Skirt_{'L' if s<0 else 'R'}", (s*0.92,0,0.12), (0.03,1.4,0.04), mat_trim)
    add_box(f"Mirror_{'L' if s<0 else 'R'}", (s*0.90,0.45,0.78), (0.03,0.06,0.035), mat_trim, (0.01,2))
    add_box(f"DoorLine_{'L' if s<0 else 'R'}", (s*0.925,0.22,0.62), (0.004,0.005,0.25), mat_trim)

# INTERIOR
add_box("Dashboard", (0,0.4,0.72), (0.6,0.08,0.12), mat_int)
for s in [-1,1]:
    add_box(f"Seat_{'L' if s<0 else 'R'}", (s*0.3,-0.1,0.68), (0.15,0.2,0.2), mat_int, (0.02,2))
    bpy.ops.mesh.primitive_cylinder_add(radius=0.015, depth=0.6, location=(s*0.55,-0.3,1.0))
    c = bpy.context.active_object
    c.name = f"Cage_{'L' if s<0 else 'R'}"
    c.rotation_euler = (0,0,math.radians(s*8))
    c.data.materials.append(mat_carbon)
bpy.ops.mesh.primitive_torus_add(major_radius=0.15, minor_radius=0.012, location=(-0.32,0.32,0.82))
sw = bpy.context.active_object
sw.name = "SteeringWheel"
sw.rotation_euler = (math.radians(65),0,0)
sw.data.materials.append(mat_int)
set_smooth(sw)

bpy.ops.mesh.primitive_cylinder_add(radius=0.04, depth=0.005, location=(0.93,0.5,0.46))
fc = bpy.context.active_object
fc.name = "FuelCap"
fc.rotation_euler = (0,math.radians(90),0)
fc.data.materials.append(mat_body)
bpy.ops.mesh.primitive_cone_add(radius1=0.03, radius2=0.005, depth=0.05, location=(0,-0.5,1.30))
af = bpy.context.active_object
af.name = "SharkFin"
af.data.materials.append(mat_trim)

# EXPORT
bpy.ops.object.select_all(action='SELECT')
output = os.path.join(r"E:\decar\apps\web\public\models", "porsche911gt3.glb")
os.makedirs(os.path.dirname(output), exist_ok=True)
bpy.ops.export_scene.gltf(filepath=output, export_format='GLB', export_apply=True, export_materials='EXPORT', export_yup=True)
print(f"EXPORTED: {output}")
print(f"Objects: {len(bpy.data.objects)}")