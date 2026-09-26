"""Build an original ring spacecraft for the homepage journey with Blender."""

import bpy
import gzip
import math
from pathlib import Path
from mathutils import Vector

bpy.ops.wm.read_factory_settings(use_empty=True)


def material(name, color, metal=0.0, rough=0.5, emission=None):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*color, 1)
    shader.inputs["Metallic"].default_value = metal
    shader.inputs["Roughness"].default_value = rough
    if emission:
        shader.inputs["Emission Color"].default_value = (*emission, 1)
        shader.inputs["Emission Strength"].default_value = 2.5
    return mat


metal = material("graphite titanium", (0.09, 0.105, 0.12), 0.72, 0.46)
silver = material("ceramic panels", (0.30, 0.32, 0.34), 0.34, 0.62)
dark = material("recesses", (0.025, 0.035, 0.055), 0.52, 0.5)
gold = material("thermal foil", (0.32, 0.20, 0.10), 0.58, 0.50)
blue = material("ion thrusters", (0.06, 0.24, 0.45), 0.1, 0.32, (0.08, 0.49, 1.0))
white = material("off-white insulation", (0.43, 0.41, 0.37), 0.25, 0.72)


def cube(name, location, scale, mat, angle=0, bevel=0.035):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = scale
    obj.rotation_euler.z = angle
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    if bevel:
        mod = obj.modifiers.new("machined edges", "BEVEL")
        mod.width = bevel
        mod.segments = 2
        obj.modifiers.new("weighted normals", "WEIGHTED_NORMAL")
    return obj


def beam(name, start, end, radius, mat, vertices=8):
    start, end = Vector(start), Vector(end)
    middle = (start + end) / 2
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=(end - start).length, location=middle)
    obj = bpy.context.object
    obj.name = name
    obj.rotation_euler = (end - start).to_track_quat("Z", "Y").to_euler()
    obj.data.materials.append(mat)
    return obj


for radius, thickness, mat in [(2.22, 0.065, metal), (2.37, 0.035, silver), (1.93, 0.045, metal)]:
    bpy.ops.mesh.primitive_torus_add(major_radius=radius, minor_radius=thickness, major_segments=96, minor_segments=8)
    bpy.context.object.name = "continuous pressure ring"
    bpy.context.object.data.materials.append(mat)

for index in range(12):
    angle = index * math.tau / 12
    x, y = 2.16 * math.cos(angle), 2.16 * math.sin(angle)
    tangent = angle + math.pi / 2
    cube(f"habitat module {index:02}", (x, y, 0), (0.91, 0.72, 0.54), metal, tangent, 0.035)
    cube(f"outer hull {index:02}", (x, y, 0.31), (0.76, 0.58, 0.08), dark, tangent, 0.015)
    cube(f"service panel {index:02}", (x, y, -0.3), (0.55, 0.45, 0.07), dark, tangent, 0.015)
    tangential = Vector((math.cos(tangent), math.sin(tangent), 0))
    radial = Vector((math.cos(angle), math.sin(angle), 0))
    for col in range(3):
        for row in range(2):
            point = Vector((x, y, 0)) + tangential * ((col - 1) * 0.24) + radial * ((row - .5) * .25)
            plate_mat = white if (index + col + row) % 4 == 0 else silver
            cube(f"segmented ceramic plate {index:02}-{col}-{row}", (point.x, point.y, .368), (.215, .212, .026), plate_mat, tangent, .006)
    for col in range(4):
        point = Vector((x, y, 0)) + tangential * ((col - 1.5) * .17) + radial * .39
        cube(f"outer service recess {index:02}-{col}", (point.x, point.y, .04), (.12, .015, .23), dark, tangent, .003)
    for side in (-1, 1):
        point = Vector((x, y, 0)) + tangential * side * .39
        cube(f"endcap frame {index:02}-{side}", (point.x, point.y, .02), (.048, .64, .59), silver, tangent, .008)
        beam(f"hull conduit {index:02}-{side}",
             (point.x, point.y, -.28), (point.x, point.y, .29), .018, gold, 8)
    for side in (-1, 1):
        edge = Vector((x, y, 0)) + tangential * side * 0.33
        cube(f"radiator {index:02}-{side}", (edge.x, edge.y, 0.34), (0.035, 0.53, 0.028), gold, tangent, 0.005)
    if index % 3 == 0:
        beam(f"load bearing spoke {index:02}", (0.35 * math.cos(angle), 0.35 * math.sin(angle), 0), (1.89 * math.cos(angle), 1.89 * math.sin(angle), 0), 0.06, silver)
    if index % 2 == 0:
        beam(f"rear thruster {index:02}", (x, y, -0.35), (x, y, -0.47), 0.16, blue, 16)

beam("central docking spine", (0, 0, -0.85), (0, 0, 0.88), 0.24, silver, 16)
cube("docking lock", (0, 0, 0.84), (0.75, 0.58, 0.43), metal, math.pi / 4, 0.07)
cube("observation canopy", (0, 0, 1.1), (0.57, 0.38, 0.16), dark, math.pi / 4, 0.04)
beam("forward aerial", (0, 0, 1.2), (0, 0, 1.83), 0.025, gold, 8)

bpy.ops.wm.save_as_mainfile(filepath="design/journey-ring-ship.blend")
bpy.ops.export_scene.gltf(filepath="public/space/journey-ring-ship.glb", export_format="GLB", export_apply=True)
model = Path("public/space/journey-ring-ship.glb")
model.with_suffix(".glb.gz").write_bytes(gzip.compress(model.read_bytes(), compresslevel=9, mtime=0))
# Refresh journey-ring-ship-poster.webp if the model silhouette changes.
