import pygame
import math

pygame.init()

# ==================================================
# CONFIG
# ==================================================

WIDTH = 1400
HEIGHT = 800

screen = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption("Bezier Timeline Editor")

clock = pygame.time.Clock()
font = pygame.font.SysFont(None, 22)

GRID_SIZE = 500

CURVE_HEIGHT = 500
CURVE_TOP = (HEIGHT - CURVE_HEIGHT) // 2
CURVE_BOTTOM = CURVE_TOP + CURVE_HEIGHT

POINT_RADIUS = 8

SNAP_RANGE = 0.08

# ==================================================
# DATA
# ==================================================

segments = [
    [
        {"x": 0.0, "y": 0.0},
        {"x": 0.5, "y": 1.0},
        {"x": 1.0, "y": 1.0},
    ]
]

selected_segment = 0
selected_point = None
dragging_point = None

scroll_x = 0

# ==================================================
# EXPORT (NEW)
# ==================================================

def export_curve():
    out = []

    for seg in segments:
        s = []
        for p in seg:
            s.append({"x": round(p["x"], 4), "y": round(p["y"], 4)})
        out.append(s)

    print("\nCURVE EXPORT:\n")
    print(",".join(str(s) for s in out))
    print("\n")

# ==================================================
# BEZIER
# ==================================================

def bezier_point(points, t):
    pts = [(p["x"], p["y"]) for p in points]

    while len(pts) > 1:
        nxt = []
        for i in range(len(pts) - 1):
            x = pts[i][0] * (1 - t) + pts[i + 1][0] * t
            y = pts[i][1] * (1 - t) + pts[i + 1][1] * t
            nxt.append((x, y))
        pts = nxt

    return pts[0]

# ==================================================
# COORDS
# ==================================================

def curve_to_screen(x, y):
    sx = x * GRID_SIZE - scroll_x
    sy = CURVE_BOTTOM - (y * CURVE_HEIGHT)
    return sx, sy


def screen_to_curve(x, y):
    cx = (x + scroll_x) / GRID_SIZE
    cy = (CURVE_BOTTOM - y) / CURVE_HEIGHT
    return cx, max(0, min(1, cy))

# ==================================================
# WELD SNAP
# ==================================================

def weld_endpoint_y(segments, si, pi, y):
    seg = segments[si]

    if pi == 0 and si > 0:
        prev_end = segments[si - 1][-1]["y"]
        if abs(prev_end - y) < SNAP_RANGE:
            return prev_end

    if pi == len(seg) - 1 and si < len(segments) - 1:
        next_start = segments[si + 1][0]["y"]
        if abs(next_start - y) < SNAP_RANGE:
            return next_start

    return y

# ==================================================
# FIND POINT
# ==================================================

def find_point(mx, my):
    for si, seg in enumerate(segments):
        for pi, p in enumerate(seg):
            sx, sy = curve_to_screen(p["x"] + si, p["y"])
            if math.dist((mx, my), (sx, sy)) < 12:
                return si, pi
    return None

# ==================================================
# INSERT POINT
# ==================================================

def insert_point(seg, x, y):

    x = max(0, min(1, x))
    y = max(0, min(1, y))

    seg.append({"x": x, "y": y})
    seg.sort(key=lambda p: p["x"])

    seg[0]["x"] = 0
    seg[-1]["x"] = 1

# ==================================================
# DRAW
# ==================================================

def draw_grid():

    visible_segments = WIDTH // GRID_SIZE + 4
    start = int(scroll_x // GRID_SIZE) - 2

    for i in range(start, start + visible_segments):
        sx = i * GRID_SIZE - scroll_x

        pygame.draw.rect(
            screen,
            (60, 60, 60),
            (sx, CURVE_TOP, GRID_SIZE, CURVE_HEIGHT),
            1
        )

        label = font.render(str(i), True, (180, 180, 180))
        screen.blit(label, (sx + 5, CURVE_TOP + 5))

    for i in range(11):
        y = CURVE_BOTTOM - (i / 10) * CURVE_HEIGHT
        pygame.draw.line(screen, (40, 40, 40), (0, y), (WIDTH, y))


def draw_segments():

    for si, seg in enumerate(segments):

        pts = []

        for p in seg:
            sx, sy = curve_to_screen(p["x"] + si, p["y"])
            pts.append((sx, sy))

        if len(pts) > 1:
            pygame.draw.lines(screen, (100, 100, 100), False, pts, 1)

        if len(seg) >= 2:
            samples = []
            for i in range(200):
                t = i / 199
                x, y = bezier_point(seg, t)
                sx, sy = curve_to_screen(x + si, y)
                samples.append((sx, sy))

            pygame.draw.lines(screen, (0, 255, 0), False, samples, 3)

        for pi, p in enumerate(seg):
            sx, sy = curve_to_screen(p["x"] + si, p["y"])
            pygame.draw.circle(screen, (255, 120, 120), (int(sx), int(sy)), POINT_RADIUS)

# ==================================================
# MAIN LOOP
# ==================================================

running = True

while running:

    for event in pygame.event.get():

        if event.type == pygame.QUIT:
            running = False

        # ----------------------------
        # KEYS
        # ----------------------------
        elif event.type == pygame.KEYDOWN:

            # EXPORT
            if event.key == pygame.K_RETURN:
                export_curve()

            # NEW SEGMENT
            elif event.key == pygame.K_n:
                end_y = segments[-1][-1]["y"]

                segments.append([
                    {"x": 0.0, "y": end_y},
                    {"x": 1.0, "y": end_y},
                ])

                selected_segment = len(segments) - 1

            # DELETE POINT OR SEGMENT
            elif event.key == pygame.K_BACKSPACE:

                mods = pygame.key.get_mods()

                # SHIFT + BACKSPACE → delete last segment
                if mods & pygame.KMOD_SHIFT:
                    if len(segments) > 1:
                        segments.pop()

                        selected_segment = min(selected_segment, len(segments) - 1)
                        selected_point = None
                        dragging_point = None

                # normal BACKSPACE → delete point
                else:
                    if selected_point is not None:
                        seg = segments[selected_segment]

                        if selected_point not in (0, len(seg) - 1):
                            seg.pop(selected_point)

                        selected_point = None

            # SWITCH SEGMENT
            elif event.key == pygame.K_TAB:
                if pygame.key.get_mods() & pygame.KMOD_SHIFT:
                    selected_segment -= 1
                else:
                    selected_segment += 1

                selected_segment %= len(segments)
        # ----------------------------
        # SCROLL
        # ----------------------------
        elif event.type == pygame.MOUSEWHEEL:
            scroll_x -= event.y * 120
            scroll_x = max(-GRID_SIZE, min(scroll_x, len(segments) * GRID_SIZE))

        # ----------------------------
        # CLICK
        # ----------------------------
        elif event.type == pygame.MOUSEBUTTONDOWN:

            mx, my = pygame.mouse.get_pos()

            if event.button == 1:

                # -------------------------------------------------
                # 1) First check: click must be inside curve area
                # -------------------------------------------------
                if my < CURVE_TOP or my > CURVE_BOTTOM:
                    continue  # ignore click completely

                hit = find_point(mx, my)

                if hit:
                    selected_segment, selected_point = hit
                    dragging_point = selected_point

                else:
                    cx, cy = screen_to_curve(mx, my)

                    seg = segments[selected_segment]

                    # -------------------------------------------------
                    # 2) IMPORTANT FIX: only allow insertion in THIS segment column
                    # -------------------------------------------------
                    if cx < selected_segment or cx > selected_segment + 1:
                        continue  # outside segment area → do nothing

                    local_x = cx - selected_segment
                    local_x = max(0, min(1, local_x))

                    insert_point(seg, local_x, cy)

            elif event.button == 3:

                hit = find_point(mx, my)

                if hit:
                    si, pi = hit
                    seg = segments[si]

                    if len(seg) > 2 and pi not in (0, len(seg) - 1):
                        seg.pop(pi)

        # ----------------------------
        # DRAG
        # ----------------------------
        elif event.type == pygame.MOUSEMOTION:

            if dragging_point is not None:

                mx, my = pygame.mouse.get_pos()
                cx, cy = screen_to_curve(mx, my)

                seg = segments[selected_segment]
                pi = dragging_point

                if pi == 0:
                    x = 0
                elif pi == len(seg) - 1:
                    x = 1
                else:
                    x = max(0, min(1, cx - selected_segment))

                y = weld_endpoint_y(
                    segments,
                    selected_segment,
                    pi,
                    cy
                )

                seg[pi]["x"] = x
                seg[pi]["y"] = y

        elif event.type == pygame.MOUSEBUTTONUP:
            if event.button == 1:
                dragging_point = None

    # ----------------------------
    # DRAW
    # ----------------------------

    screen.fill((25, 25, 25))

    draw_grid()
    draw_segments()

    ui = font.render(
        "ENTER export | N new | TAB switch | scroll wheel | drag points",
        True,
        (255, 255, 255)
    )

    screen.blit(ui, (10, 10))

    pygame.display.flip()
    clock.tick(60)

pygame.quit()