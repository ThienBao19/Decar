import bpy
import os

# Open the McLaren P1 .blend
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

# Decimate all mesh objects to reduce poly count
for obj in bpy.data.objects:
    if obj.type != 'MESH':
        continue
    # Select and make active
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    
    # Check vertex count
    vc = len(obj.data.vertices)
    if vc > 500:
        # Add decimate modifier
        ratio = min(0.3, 5000 / max(vc, 1))  # Target ~5000 verts per object max
        mod = obj.modifiers.new("Decimate", 'DECIMATE')
        mod.ratio = max(0.05, ratio)
        # Apply modifier
        bpy.ops.object.modifier_apply(modifier=mod.name)
    
    obj.select_set(False)

# Count total vertices
total_verts = sum(len(obj.data.vertices) for obj in bpy.data.objects if obj.type == 'MESH')
print(f"Total vertices after decimation: {total_verts}")
print(f"Objects: {len(bpy.data.objects)}")

# Select all
bpy.ops.object.select_all(action='SELECT')

# Export as GLB with Draco compression
output = r"E:\decar\apps\web\public\models\mclaren_p1.glb"
bpy.ops.export_scene.gltf(
    filepath=output,
    export_format='GLB',
    export_apply=True,
    export_materials='EXPORT',
    export_yup=True,
    export_draco_mesh_compression_enable=True,
    export_draco_mesh_compression_level=6,
)

size = os.path.getsize(output)
print(f"EXPORTED: {output}")
print(f"Size: {size / 1024:.0f} KB ({size / 1024 / 1024:.1f} MB)")