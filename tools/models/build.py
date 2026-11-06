"""
Builds src/models/furniture.glb: the moulded shapes of the tabernacle furniture.

    npm run models        (needs Python 3.13 with `pip install bpy`)

Everything is in cubits and in the game's own axes (y up, the same placement as the old box
models), so a piece drops in where its boxes were. Each mesh's material is named after a game
material (gold, pureGold, bronze, silver, acacia); the game swaps in its own textured materials
by that name, so this file holds only shape and UVs.
"""

import math
import os

import bpy  # first: bpy makes bmesh and mathutils importable
import bmesh
from mathutils import Matrix, Vector

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'src', 'models', 'furniture.glb')

bpy.ops.wm.read_factory_settings(use_empty=True)

# ─────────────────────────────── building blocks ───────────────────────────────
# Every helper returns a fresh bmesh in final (y-up) coordinates with UVs already set.


def new_bm():
    bm = bmesh.new()
    bm.loops.layers.uv.new('UVMap')
    return bm


def box_uv(bm, s=1.0):
    """Project UVs along each face's main axis: texture scale stays even on any shape."""
    uv = bm.loops.layers.uv.active
    for f in bm.faces:
        n = f.normal
        ax = max(range(3), key=lambda i: abs(n[i]))
        for lp in f.loops:
            c = lp.vert.co
            lp[uv].uv = (c.z / s, c.y / s) if ax == 0 else (c.x / s, c.z / s) if ax == 1 else (c.x / s, c.y / s)


def finish(bm, uv_scale=None):
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    if uv_scale:
        box_uv(bm, uv_scale)
    return bm


def bridge(bm, rings, closed_profile=False, cap=False):
    """Skin consecutive rings of vertices (each a closed loop) into a surface."""
    n = len(rings)
    pairs = [(i, i + 1) for i in range(n - 1)] + ([(n - 1, 0)] if closed_profile else [])
    for a, b in pairs:
        ra, rb = rings[a], rings[b]
        if len(ra) == 1 or len(rb) == 1:
            tip, ring = (ra[0], rb) if len(ra) == 1 else (rb[0], ra)
            for j in range(len(ring)):
                bm.faces.new((tip, ring[j], ring[(j + 1) % len(ring)]))
            continue
        m = len(ra)
        for j in range(m):
            k = (j + 1) % m
            bm.faces.new((ra[j], ra[k], rb[k], rb[j]))
    if cap:
        for r in (rings[0], rings[-1]):
            if len(r) > 2:
                bm.faces.new(r)


def lathe(profile, segs=24, at=(0, 0, 0), uv_scale=1.0):
    """Turned shape round the y axis from (radius, y) points; radius 0 closes the end."""
    bm = new_bm()
    rings = []
    for r, y in profile:
        if r < 1e-5:
            rings.append([bm.verts.new((at[0], at[1] + y, at[2]))])
        else:
            rings.append([
                bm.verts.new((at[0] + r * math.cos(2 * math.pi * j / segs), at[1] + y, at[2] + r * math.sin(2 * math.pi * j / segs)))
                for j in range(segs)
            ])
    closed_ends = profile[0][0] < 1e-5 and profile[-1][0] < 1e-5
    bridge(bm, rings, cap=not closed_ends)
    finish(bm)
    # wrap the texture round the axis, so wood grain runs up a turned post without seams
    uv = bm.loops.layers.uv.active
    rmax = max(r for r, _ in profile)
    for f in bm.faces:
        cx = sum(v.co.x for v in f.verts) / len(f.verts) - at[0]
        cz = sum(v.co.z for v in f.verts) / len(f.verts) - at[2]
        fa = math.atan2(cz, cx)
        for lp in f.loops:
            c = lp.vert.co
            a = math.atan2(c.z - at[2], c.x - at[0])
            if abs(c.x - at[0]) < 1e-6 and abs(c.z - at[2]) < 1e-6:
                a = fa
            while a - fa > math.pi:
                a -= 2 * math.pi
            while a - fa < -math.pi:
                a += 2 * math.pi
            lp[uv].uv = (a * rmax / uv_scale, (c.y - at[1]) / uv_scale)
    return bm


def rounded_rect(a, b, rc, csegs):
    """Outline of a rectangle (half sizes a, b) with corners of radius rc, counter-clockwise."""
    if csegs == 0:
        return [(a, b), (-a, b), (-a, -b), (a, -b)]
    pts = []
    for cx, cz, a0 in ((a - rc, b - rc, 0), (-a + rc, b - rc, 90), (-a + rc, -b + rc, 180), (a - rc, -b + rc, 270)):
        for k in range(csegs + 1):
            t = math.radians(a0 + 90 * k / csegs)
            pts.append((cx + rc * math.cos(t), cz + rc * math.sin(t)))
    return pts


def frame(a, b, profile, corner=0.0, csegs=0, closed=True, cap=False, at=(0, 0, 0), uv_scale=1.0):
    """
    A moulding run round a rectangle (half sizes a, b): each (d, y) profile point is an outline
    offset d outward at height y, so corners mitre themselves. A closed profile makes a ring
    (a crown, a ledge, hollow walls); an open one with cap=True makes a solid (a slab, a plinth).
    """
    bm = new_bm()
    rings = []
    for d, y in profile:
        rc = max(corner + d, 0.002) if csegs else 0
        rings.append([bm.verts.new((at[0] + x, at[1] + y, at[2] + z)) for x, z in rounded_rect(a + d, b + d, rc, csegs)])
    bridge(bm, rings, closed_profile=closed, cap=cap)
    return finish(bm, uv_scale)


def box(size, at=(0, 0, 0), bevel=0.02, panels=None, uv_scale=1.0):
    """
    A bevelled block. panels=(border, depth) sinks a framed panel into each upright face,
    as on overlaid boards.
    """
    bm = new_bm()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=Vector(size), verts=bm.verts)
    if bevel:
        bmesh.ops.bevel(bm, geom=bm.edges[:] + bm.verts[:], offset=bevel, segments=2, affect='EDGES', profile=0.5, clamp_overlap=True)
    bm.normal_update()
    if panels:
        border, depth = panels
        sides = [f for f in bm.faces if abs(f.normal.y) < 0.1 and f.calc_area() > 4 * bevel * bevel + 1e-4]
        sides = [f for f in sides if f.calc_area() > 0.2 * max(g.calc_area() for g in sides)]
        res = bmesh.ops.inset_individual(bm, faces=sides, thickness=border, depth=0, use_even_offset=True)
        # sink the panel, then give its edge a small chamfer step so it reads at a distance
        for f in sides:
            n = f.normal.copy()
            for v in f.verts:
                v.co -= n * depth
    bmesh.ops.translate(bm, vec=Vector(at), verts=bm.verts)
    return finish(bm, uv_scale)


def torus(center, R, r, axis='x', useg=28, vseg=10, uv_scale=0.5):
    bm = new_bm()
    rings = []
    for i in range(useg):
        u = 2 * math.pi * i / useg
        ring = []
        for j in range(vseg):
            v = 2 * math.pi * j / vseg
            p = ((R + r * math.cos(v)) * math.cos(u), (R + r * math.cos(v)) * math.sin(u), r * math.sin(v))
            # the ring's axis points along `axis`
            x, y, z = {'x': (p[2], p[1], p[0]), 'y': (p[0], p[2], p[1]), 'z': (p[0], p[1], p[2])}[axis]
            ring.append(bm.verts.new((center[0] + x, center[1] + y, center[2] + z)))
        rings.append(ring)
    bridge(bm, rings, closed_profile=True)
    return finish(bm, uv_scale)


def tube(points, radii, segs=12, uv_scale=0.5):
    """A tapering tube along points (parallel-transported frames), capped with a point at the tip."""
    bm = new_bm()
    P = [Vector(p) for p in points]
    T = [(P[min(i + 1, len(P) - 1)] - P[max(i - 1, 0)]).normalized() for i in range(len(P))]
    n = T[0].orthogonal().normalized()
    rings = []
    for i, (p, t) in enumerate(zip(P, T)):
        if i:
            n = (n - t * n.dot(t)).normalized()
        b = t.cross(n)
        r = radii[i]
        if r < 1e-5:
            rings.append([bm.verts.new(p)])
        else:
            rings.append([bm.verts.new(p + (n * math.cos(2 * math.pi * j / segs) + b * math.sin(2 * math.pi * j / segs)) * r) for j in range(segs)])
    bridge(bm, rings, cap=True)
    return finish(bm, uv_scale)


def sphere(center, r, u=10, v=6):
    bm = new_bm()
    bmesh.ops.create_uvsphere(bm, u_segments=u, v_segments=v, radius=r)
    bmesh.ops.translate(bm, vec=Vector(center), verts=bm.verts)
    return finish(bm, 0.25)


def pole_along(axis, at, length, r, segs=12):
    """A carrying pole with rounded ends, along x or z."""
    h = length / 2
    bm = lathe([(0, -h), (r * 0.6, -h + 0.008), (r, -h + 0.04), (r, h - 0.04), (r * 0.6, h - 0.008), (0, h)], segs, uv_scale=1.0)
    rot = Matrix.Rotation(math.pi / 2, 4, 'Z' if axis == 'x' else 'X')
    bmesh.ops.transform(bm, matrix=rot, verts=bm.verts)
    bmesh.ops.translate(bm, vec=Vector(at), verts=bm.verts)
    return bm


def horn(base, out, height, r0, segs=12):
    """A horn rising from an altar's corner, curving a little outward: `out` is the corner direction."""
    o = Vector((out[0], 0, out[1])).normalized()
    pts, radii = [], []
    for k in range(9):
        t = k / 8
        pts.append(Vector(base) + Vector((0, height * t, 0)) + o * (0.35 * r0 * t * t))
        radii.append(r0 * (1 - 0.8 * t ** 1.4) if k < 8 else 0)
    # round the tip off
    pts[-1] = pts[-2] + (pts[-2] - pts[-3]) * 0.6
    return tube(pts, radii, segs)


# ─────────────────────────────── assembling pieces ───────────────────────────────

pieces = {}  # piece -> material -> list of bmesh


def add(piece, material, *bms):
    pieces.setdefault(piece, {}).setdefault(material, []).extend(bms)


def corners(x, z):
    return [(sx * x, sz * z) for sx in (1, -1) for sz in (1, -1)]


# ── Ark of the covenant, 2½ × 1½ × 1½ cubits (Ex 25:10-22). Length along x, poles along z. ──
def ark():
    L, W, H, foot = 2.5, 1.5, 1.5, 0.12
    for x, z in corners(L / 2 - 0.12, W / 2 - 0.12):
        add('ark', 'gold', frame(0.1, 0.1, [(0.012, 0), (0.012, 0.03), (-0.01, 0.07), (-0.015, foot + 0.01)], cap=True, closed=False, at=(x, 0, z)))
    # chest, overlaid within and without, with sunk panels so the plates read as worked gold
    add('ark', 'gold', box((L, H - foot, W), at=(0, foot + (H - foot) / 2, 0), bevel=0.012, panels=(0.1, 0.035)))
    # a plinth moulding round the foot of the chest
    add('ark', 'gold', frame(L / 2, W / 2, [(-0.02, foot), (0.03, foot), (0.03, foot + 0.035), (0.012, foot + 0.07), (-0.02, foot + 0.08)]))
    # crown of gold round about (Ex 25:11): a cyma moulding rising round the mercy seat
    add('ark', 'pureGold', frame(L / 2, W / 2, [
        (-0.02, H - 0.17), (0.015, H - 0.17), (0.032, H - 0.15), (0.032, H - 0.13), (0.018, H - 0.115),
        (0.03, H - 0.07), (0.058, H - 0.02), (0.062, H + 0.05), (0.04, H + 0.07), (-0.01, H + 0.07),
    ]))
    # mercy seat of pure gold, with a rounded edge (Ex 25:17)
    add('ark', 'pureGold', frame(L / 2 - 0.005, W / 2 - 0.005, [(0, H), (0, H + 0.085), (-0.018, H + 0.112), (-0.045, H + 0.12)], corner=0.03, csegs=3, closed=False, cap=True))
    # four rings at the feet, and poles that are never taken out (Ex 25:12-15)
    for sx in (1, -1):
        for sz in (1, -1):
            add('ark', 'gold', torus((sx * (L / 2 + 0.08), 0.32, sz * (W / 2 - 0.3)), 0.1, 0.026, axis='z'))
            add('ark', 'gold', box((0.05, 0.1, 0.05), at=(sx * (L / 2 + 0.01), 0.32, sz * (W / 2 - 0.3)), bevel=0.01))
        add('ark', 'gold', pole_along('z', (sx * (L / 2 + 0.08), 0.32, 0), 9, 0.05))


# ── Table of showbread, 2 × 1 × 1½ (Ex 25:23-30). The loaves and vessels stay in the game. ──
def table():
    L, W, H = 2.0, 1.0, 1.5
    hand = 1 / 6
    lx, lz = L / 2 - 0.07, W / 2 - 0.07
    yb0, yb1 = H - 0.4 - hand / 2, H - 0.4 + hand / 2  # the border, a handbreadth (Ex 25:25)
    add('table', 'gold', frame(L / 2, W / 2, [(-0.035, H - 0.085), (0.0, H - 0.075), (0.008, H - 0.05), (0.0, H - 0.02), (-0.01, H)], closed=False, cap=True))
    # crown round the top (Ex 25:24)
    add('table', 'pureGold', frame(L / 2, W / 2, [(-0.03, H - 0.03), (0.012, H - 0.03), (0.022, H), (0.012, H + 0.03), (0.016, H + 0.055), (0.0, H + 0.07), (-0.03, H + 0.07)]))
    for x, z in corners(lx, lz):
        # turned legs, squared where the border and the top are tenoned in
        add('table', 'gold', lathe([
            (0, 0), (0.05, 0), (0.062, 0.03), (0.05, 0.07), (0.036, 0.12), (0.034, 0.3), (0.05, 0.36), (0.058, 0.4),
            (0.05, 0.44), (0.034, 0.5), (0.032, 0.8), (0.04, 0.86), (0.04, yb0 - 0.03), (0, yb0 - 0.02),
        ], 16, at=(x, 0, z)))
        add('table', 'gold', box((0.1, H - 0.08 - (yb0 - 0.04), 0.1), at=(x, (yb0 - 0.04 + H - 0.08) / 2, z), bevel=0.012))
    add('table', 'gold', frame(lx, lz, [(-0.016, yb0), (0.016, yb0), (0.016, yb1), (-0.016, yb1)]))
    # the golden crown to the border (Ex 25:25)
    add('table', 'pureGold', frame(lx, lz, [(-0.03, yb1 - 0.012), (0.028, yb1 - 0.012), (0.036, yb1 + 0.01), (0.024, yb1 + 0.032), (-0.03, yb1 + 0.032)]))
    add('table', 'pureGold', frame(lx, lz, [(-0.03, yb0 - 0.025), (0.024, yb0 - 0.025), (0.03, yb0 - 0.005), (0.02, yb0 + 0.01), (-0.03, yb0 + 0.01)]))
    # rings in the four corners on the feet, over against the border; poles along the length (Ex 25:26-28)
    ry, rz = H - 0.55, W / 2 + 0.05
    for x, z in corners(lx, rz):
        add('table', 'gold', torus((x, ry, z), 0.075, 0.022, axis='x'))
    for sz in (1, -1):
        add('table', 'gold', pole_along('x', (0, ry, sz * rz), 3.4, 0.04))


# ── Altar of incense, 1 × 1 × 2 (Ex 30:1-5). The coals and smoke stay in the game. ──
def incense():
    S, H = 1.0, 2.0
    add('incense', 'gold', frame(S / 2, S / 2, [(-0.02, 0), (0.05, 0), (0.05, 0.035), (0.032, 0.06), (0.032, 0.08), (0.012, 0.1), (-0.02, 0.12)]))
    add('incense', 'gold', box((S, H, S), at=(0, H / 2, 0), bevel=0.012, panels=(0.12, 0.035)))
    # a crown of gold round about (Ex 30:3)
    add('incense', 'pureGold', frame(S / 2, S / 2, [
        (-0.02, H - 0.17), (0.015, H - 0.17), (0.032, H - 0.15), (0.032, H - 0.13), (0.018, H - 0.115),
        (0.03, H - 0.07), (0.056, H - 0.02), (0.06, H + 0.03), (0.04, H + 0.045), (-0.02, H + 0.045),
    ]))
    # horns of one piece with it (Ex 30:2)
    for x, z in corners(0.41, 0.41):
        add('incense', 'gold', horn((x, H - 0.02, z), (x, z), 0.24, 0.075))
    # two rings under the crown on two sides; poles overlaid with gold (Ex 30:4-5)
    for sz in (1, -1):
        add('incense', 'gold', torus((sz * 0.3, H - 0.35, sz * (S / 2 + 0.06)), 0.075, 0.022, axis='x'))
        add('incense', 'gold', pole_along('x', (0, H - 0.35, sz * (S / 2 + 0.06)), 2.6, 0.035))


# ── Altar of burnt offering, 5 × 5 × 3, hollow with boards (Ex 27:1-8). Net, fire and smoke stay in the game. ──
def altar():
    S, H, t = 5.0, 3.0, 0.18
    a = S / 2
    add('altar', 'bronze', frame(a, a, [
        (0.0, 0.0), (0.07, 0.0), (0.07, 0.06), (0.04, 0.1), (0.02, 0.16), (0.0, 0.2),
        (0.0, H - 0.2), (0.025, H - 0.16), (0.025, H - 0.12), (0.06, H - 0.06), (0.06, H), (-t, H), (-t, 0.0),
    ], uv_scale=1.5))
    # bronze straps nailed over the boards: two bands round about, crossed by uprights
    def on_sides(u, y):
        return ((u, y, a), (u, y, -a), (a, y, u), (-a, y, u))

    for y in (0.62, 2.38):
        add('altar', 'bronze', frame(a, a, [(-0.01, y - 0.08), (0.02, y - 0.08), (0.03, y - 0.06), (0.03, y + 0.06), (0.02, y + 0.08), (-0.01, y + 0.08)]))
        n = 13
        for k in range(n):
            u = -a + 0.3 + (S - 0.6) * k / (n - 1)
            for x, yy, z in on_sides(u, y):
                add('altar', 'bronze', sphere((x * (1 + 0.032 / a) if abs(x) == a else x, yy, z * (1 + 0.032 / a) if abs(z) == a else z), 0.042))
    for u in (-a / 3, a / 3):
        for x, _, z in on_sides(u, 0):
            along_x = abs(z) == a
            size = (0.14, 2.38 - 0.62, 0.05) if along_x else (0.05, 2.38 - 0.62, 0.14)
            add('altar', 'bronze', box(size, at=(x, H / 2, z), bevel=0.012))
    # upright corner plates
    for x, z in corners(a, a):
        add('altar', 'bronze', box((0.2, H - 0.45, 0.2), at=(x - math.copysign(0.07, x), H / 2, z - math.copysign(0.07, z)), bevel=0.02))
    # the ledge (compass) halfway up, under which the network hangs (Ex 27:5)
    y = H / 2
    add('altar', 'bronze', frame(a, a, [(-0.01, y - 0.07), (0.2, y - 0.07), (0.25, y - 0.045), (0.265, y), (0.25, y + 0.045), (0.2, y + 0.07), (-0.01, y + 0.07)], uv_scale=1.5))
    # horns on the four corners (Ex 27:2)
    for x, z in corners(a - 0.2, a - 0.2):
        add('altar', 'bronze', horn((x, H - 0.02, z), (x, z), 0.5, 0.2, segs=14))
    # four rings at the corners of the net, and poles on two sides (Ex 27:4, 6-7)
    for x, z in corners(a - 0.3, a + 0.38):
        add('altar', 'bronze', torus((x, y - 0.25, z), 0.14, 0.035, axis='x'))
    for sz in (1, -1):
        add('altar', 'bronze', pole_along('x', (0, y - 0.25, sz * (a + 0.38)), 8, 0.08, segs=14))


# ── A pillar of the court, 5 cubits (Ex 27:10-18; 38:17): bronze socket, silver chapiter and fillets. ──
def court_pillar():
    H = 5.0
    add('courtPillar', 'bronze', frame(0.3, 0.3, [(0.05, 0), (0.05, 0.05), (0.03, 0.08), (0.0, 0.1), (0.0, 0.4), (-0.025, 0.43), (-0.035, 0.46), (-0.08, 0.5)], closed=False, cap=True, corner=0.03, csegs=2))
    add('courtPillar', 'acacia', lathe([(0, 0.45), (0.215, 0.45), (0.21, 0.6), (0.2, 1.5), (0.195, 3.0), (0.185, 4.4), (0.18, H - 0.05), (0, H - 0.05)], 14, uv_scale=2.5))
    # silver bands round the neck (Ex 38:17)
    for y in (H - 0.5, H - 0.36):
        add('courtPillar', 'silver', lathe([(0, y - 0.03), (0.19, y - 0.03), (0.2, y - 0.015), (0.2, y + 0.015), (0.19, y + 0.03), (0, y + 0.03)], 14))
    add('courtPillar', 'silver', lathe([
        (0, H - 0.1), (0.19, H - 0.1), (0.205, H - 0.07), (0.2, H - 0.04), (0.23, H), (0.29, H + 0.1),
        (0.315, H + 0.17), (0.31, H + 0.23), (0.28, H + 0.27), (0.2, H + 0.28), (0, H + 0.28),
    ], 16))


def court_peg():
    # a bronze tent pin, driven in with a cord round its head (Ex 27:19)
    add('courtPeg', 'bronze', lathe([(0, -0.3), (0.02, -0.2), (0.04, 0.05), (0.04, 0.2), (0.03, 0.22), (0.03, 0.26), (0.055, 0.28), (0.05, 0.32), (0, 0.33)], 8))


for build in (ark, table, incense, altar, court_pillar, court_peg):
    build()

# ─────────────────────────────── to Blender, then glTF ───────────────────────────────

Y_UP_TO_BLENDER = Matrix.Rotation(math.pi / 2, 4, 'X')  # the exporter turns it back to y-up
total = 0
for piece, by_mat in pieces.items():
    root = bpy.data.objects.new(piece, None)
    bpy.context.collection.objects.link(root)
    for material, bms in by_mat.items():
        me = bpy.data.meshes.new(f'{piece}_{material}')
        merged = new_bm()
        tmp = bpy.data.meshes.new('tmp')
        for bm in bms:
            bm.to_mesh(tmp)
            merged.from_mesh(tmp)
            bm.free()
        bpy.data.meshes.remove(tmp)
        merged.to_mesh(me)
        merged.free()
        me.transform(Y_UP_TO_BLENDER)
        for p in me.polygons:
            p.use_smooth = True
        me.set_sharp_from_angle(angle=math.radians(50))
        mat = bpy.data.materials.get(material) or bpy.data.materials.new(material)
        me.materials.append(mat)
        ob = bpy.data.objects.new(f'{piece}_{material}', me)
        bpy.context.collection.objects.link(ob)
        ob.parent = root
        tris = sum(len(p.vertices) - 2 for p in me.polygons)
        total += tris
        print(f'{piece:12s} {material:9s} {tris:7d} tris')

os.makedirs(os.path.dirname(OUT), exist_ok=True)
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_yup=True, export_materials='EXPORT', export_extras=False)
print(f'total {total} tris -> {os.path.relpath(OUT)} ({os.path.getsize(OUT) // 1024} KB)')
