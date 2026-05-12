import bpy
import os

blend_path = r"E:\decar\apps\web\scripts\mclaren_p1.blend"
bpy.ops.wm.open_mainfile(filepath=blend_path)

# Remove non-car objects
to_remove = []
for obj in bpy.data.objects:
    name_lower = obj.name.lower()
    if name_lower == "grid" or "chair base" in name_lower:
        to_remove.append(obj)
for obj in to_remove:
    bpy.data.objects.remove(obj, do_unlink=True)

# Aggressive decimation
for obj in bpy.data.objects:
    if obj.type != 'MESH':
        continue
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    vc = len(obj.data.vertices)
    if vc > 200:
        ratio = min(0.15, 2000 / max(vc, 1))
        mod = obj.modifiers.new("Decimate", 'DECIMATE')
        mod.ratio = max(0.02, ratio)
        bpy.ops.object.modifier_apply(modifier=mod.name)
    obj.select_set(False)

total_verts = sum(len(obj.data.vertices) for obj in bpy.data.objects if obj.type == 'MESH')
print(f"Total vertices: {total_verts}")

# Remove unused materials/textures to reduce file size
bpy.ops.outliner.orphans_purge(do_local_ids=True, do_linked_ids=True, do_recursive=True)

bpy.ops.object.select_all(action='SELECT')

output = r"E:\decar\apps\web\public\models\mclaren_p1.glb"
bpy.ops.export_scene.gltf(
    filepath=output,
    export_format='GLB',
    export_apply=True,
    export_materials='EXPORT',
    export_yup=True,
    export_draco_mesh_compression_enable=True,
    export_draco_mesh_compression_level=8,
    export_image_format='NONE',
)

size = os.path.getsize(output)
print(f"Size: {size / 1024:.0f} KB ({size / 1024 / 1024:.1f} MB)")