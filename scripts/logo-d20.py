import math, sys
# Pointy-top hexagon (centre 512,512, radius 500) and an inner front triangle.
c, r = (512, 512), 500
hexa = [(c[0] + r*math.cos(math.radians(a)), c[1] + r*math.sin(math.radians(a))) for a in (-90, -30, 30, 90, 150, 210)]
T, UR, LR, B, LL, UL = hexa
P, Q, R = (512, 262), (772, 712), (252, 712)
facets = [
    [T, UR, P, UL],      # top
    [UL, P, R, LL],      # left
    [UR, LR, Q, P],      # right
    [LL, R, Q, LR, B],   # bottom
    [P, Q, R],           # front
]
GAP = float(sys.argv[1]) if len(sys.argv) > 1 else 22

def inset(poly, d):
    # Convex polygon, any winding: move every edge inward by d and intersect neighbours.
    n = len(poly)
    area = sum(poly[i][0]*poly[(i+1)%n][1] - poly[(i+1)%n][0]*poly[i][1] for i in range(n))
    s = 1 if area > 0 else -1
    lines = []
    for i in range(n):
        (x1, y1), (x2, y2) = poly[i], poly[(i+1)%n]
        dx, dy = x2-x1, y2-y1
        L = math.hypot(dx, dy)
        nx, ny = -dy/L*s, dx/L*s  # inward normal
        lines.append(((x1+nx*d, y1+ny*d), (dx, dy)))
    out = []
    for i in range(n):
        (p1, d1), (p2, d2) = lines[i-1], lines[i]
        den = d1[0]*d2[1] - d1[1]*d2[0]
        t = ((p2[0]-p1[0])*d2[1] - (p2[1]-p1[1])*d2[0]) / den
        out.append((p1[0]+d1[0]*t, p1[1]+d1[1]*t))
    return out

parts = []
for f in facets:
    pts = inset(f, GAP)
    parts.append('M' + 'L'.join(f'{x:.1f} {y:.1f}' for x, y in pts) + 'Z')
print(''.join(parts))
