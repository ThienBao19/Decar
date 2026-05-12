import bpy
import os

# Open the McLaren P1 .blend
blend_path = r"E:\decar\apps\web\scripts\mclaren_p1.blend"
bpy.ops.wm.open_mainfile(filepath=blend_path)

# Remove the floor grid and standalone planes that aren't part of the car
to_remove = []
for obj in bpy.data.objects:
    name_lower = obj.name.lower()
    # Remove the Grid floor object and the 'chair Base' objects
    if name_lower == "grid" or "chair base" in name_lower:
        to_remove.append(obj)

for obj in to_remove:
    bpy.data.objects.remove(obj, do_unlink=True)

print(f"Removed {len(to_remove)} non-car objects")
print(f"Remaining: {len(bpy.data.objects)} objects")

# Select all remaining objects
bpy.ops.object.select_all(action='SELECT')

# Export as GLB
output = r"E:\decar\apps\web\public\models\mclaren_p1.glb"
os.makedirs(os.path.dirname(output), exist_ok=True)

bpy.ops.export_scene.gltf(
    filepath=output,
    export_format='GLB',
    export_apply=True,
    export_materials='EXPORT',
    export_yup=True,
)

size = os.path.getsize(output)
print(f"EXPORTED: {output}")
print(f"Size: {size / 1024:.0f} KB")