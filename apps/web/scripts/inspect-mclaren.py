import bpy
import os

# Open the McLaren P1 .blend file
blend_path = r"E:\decar\apps\web\scripts\mclaren_p1.blend"
bpy.ops.wm.open_mainfile(filepath=blend_path)

# List all objects
print("=== ALL OBJECTS ===")
for obj in bpy.data.objects:
    print(f"  {obj.type:12s} | {obj.name}")
print(f"Total: {len(bpy.data.objects)} objects")

# List collections
print("\n=== COLLECTIONS ===")
for col in bpy.data.collections:
    print(f"  {col.name} ({len(col.objects)} objects)")

# Get scene bounds
print("\n=== SCENE INFO ===")
print(f"Scene: {bpy.context.scene.name}")