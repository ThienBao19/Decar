import bpy
import sys
import os

# Add BlenderKit addon path
addon_path = r"E:\Kit\blenderkit"
parent = os.path.dirname(addon_path)
if parent not in sys.path:
    sys.path.insert(0, parent)

# Install and enable the addon
try:
    bpy.ops.preferences.addon_install(filepath=addon_path, overwrite=True)
except:
    pass

try:
    bpy.ops.preferences.addon_enable(module="blenderkit")
    print("BlenderKit addon enabled!")
except Exception as e:
    print(f"Failed to enable addon: {e}")

# Check if API key exists
try:
    prefs = bpy.context.preferences.addons.get("blenderkit")
    if prefs:
        p = prefs.preferences
        api_key = getattr(p, "api_key", "")
        if api_key:
            print(f"API Key found: {api_key[:10]}...")
        else:
            print("NO API KEY - need to login")
            print("Opening BlenderKit login page...")
            # Try to trigger OAuth
            try:
                bpy.ops.wm.blenderkit_login()
            except:
                print("Cannot trigger login in background mode")
                print("Please open Blender GUI, enable BlenderKit, and login first")
    else:
        print("BlenderKit addon not found in preferences")
except Exception as e:
    print(f"Error checking prefs: {e}")

# Save preferences
bpy.ops.wm.save_userpref()