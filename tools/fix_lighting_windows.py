"""Repaint the glass of the main windows in lighting-full.webp with clean
6-over-6 muntins (the AI mockup drew bent, uneven grids), then re-cut
lighting-stone.webp and lighting-path.webp from the fixed image."""
import cv2, numpy as np
from PIL import Image
SRC = '/tmp/g/lighting-full.orig.webp'
im = np.asarray(Image.open(SRC).convert('RGB')).astype(np.float32)
H, W = im.shape[:2]
# Glass quads: TL, TR, BR, BL (pixels in the 1400x1050 image).
# Glass corners (TL, TR, BR, BL) traced on the frame's inner edge; `rail` is
# where the meeting rail sits (0 = top of glass, 1 = bottom); `clip` stops the
# repaint where planting covers the window.
WINDOWS = [
    dict(q=[(840.7, 290.8), (911.0, 275.9), (911.0, 379.8), (837.3, 387.7)], rail=0.57),   # front gable
    dict(q=[(865.7, 566.0), (935.8, 562.5), (937.5, 695.0), (860.7, 696.2)], rail=0.50),   # stone front
    dict(q=[(651.0, 379.5), (678.0, 376.0), (677.0, 460.0), (649.5, 462.0)], rail=0.48,
         exclude=[(656, 368), (692, 368), (692, 386.5), (656, 382.5)]),  # dormer (roof trim excluded)
    dict(q=[(309.0, 598.0), (331.0, 598.0), (327.0, 686.0), (308.0, 686.0)], rail=0.50, clip=675),  # left wing A
    dict(q=[(372.3, 593.0), (398.7, 593.0), (397.0, 686.0), (370.6, 686.0)], rail=0.50, clip=681),  # left wing B
]
out = im.copy()
SS = 4  # draw lines supersampled for anti-aliasing
for win in WINDOWS:
    q = np.array(win['q'], np.float32)
    x0, y0 = q.min(0).astype(int) - 3; x1, y1 = q.max(0).astype(int) + 4
    patch = im[y0:y1, x0:x1].copy()
    # Glass without the old muntins: a wide median keeps reflections and the
    # dark interior but drops thin bright lines.
    dark = np.percentile(patch.reshape(-1, 3), 30, axis=0)
    glass = np.minimum(patch, dark * 1.25)
    glass = cv2.GaussianBlur(glass, (0, 0), max(2.0, (x1 - x0) / 7))
    ph, pw = patch.shape[:2]
    # Faint night-sky reflection, strongest at the top of the glass.
    g = np.linspace(1, 0, ph)[:, None, None] ** 1.6
    glass = glass + g * np.array([14, 16, 24], np.float32) + np.array([4, 4, 5], np.float32)
    qm = q - [x0, y0]
    mask = np.zeros((ph * SS, pw * SS), np.uint8)
    cv2.fillPoly(mask, [np.round(qm * SS).astype(np.int32)], 255)
    mask = cv2.resize(mask, (pw, ph), interpolation=cv2.INTER_AREA).astype(np.float32)[..., None] / 255
    # Muntin colour: the window's own trim, a touch darker inside the glass.
    ring = im[max(0, y0 - 6):y1 + 6, max(0, x0 - 6):x1 + 6].reshape(-1, 3)
    lum = ring.mean(1); frame = ring[lum >= np.percentile(lum, 88)].mean(0) * 0.92
    lines = np.zeros((ph * SS, pw * SS), np.uint8)
    # True perspective: map the unit square onto the glass quad.
    Hm = cv2.getPerspectiveTransform(np.float32([[0, 0], [1, 0], [1, 1], [0, 1]]), np.float32(qm * SS))
    def P(u, v):
        x, y, w = Hm @ np.array([u, v, 1.0])
        return np.int32(np.round([x / w, y / w]))
    wpx = max(1.4, (q[1][0] - q[0][0]) / 40)
    t = int(round(wpx * SS))
    r = win['rail']
    for u in (1 / 3, 2 / 3):                                 # 3 lites across
        cv2.line(lines, tuple(P(u, 0)), tuple(P(u, 1)), 255, t, cv2.LINE_AA)
    for v in (r / 2, r + (1 - r) / 2):                       # 2 lites high per sash
        cv2.line(lines, tuple(P(0, v)), tuple(P(1, v)), 255, t, cv2.LINE_AA)
    cv2.line(lines, tuple(P(0, r)), tuple(P(1, r)), 255, int(t * 2.4), cv2.LINE_AA)  # meeting rail
    lines = cv2.resize(lines, (pw, ph), interpolation=cv2.INTER_AREA).astype(np.float32)[..., None] / 255
    shade = np.linspace(1.0, 0.8, ph)[:, None, None]  # rails catch less soffit light lower down
    newp = glass * (1 - lines) + frame * shade * lines
    if 'clip' in win: mask[max(0, win['clip'] - y0):] = 0
    if 'exclude' in win:
        ex = np.zeros((ph * SS, pw * SS), np.uint8)
        cv2.fillPoly(ex, [np.round((np.float32(win['exclude']) - [x0, y0]) * SS).astype(np.int32)], 255)
        mask *= 1 - cv2.resize(ex, (pw, ph), interpolation=cv2.INTER_AREA).astype(np.float32)[..., None] / 255
    out[y0:y1, x0:x1] = patch * (1 - mask) + newp * mask
full = Image.fromarray(out.clip(0, 255).astype(np.uint8))
full.save('public/img/lighting-full.webp', quality=88, method=6)
# Re-cut the crops from the fixed image (same framing as before).
def recut(orig, dst):
    a = cv2.cvtColor(out.clip(0, 255).astype(np.uint8), cv2.COLOR_RGB2GRAY).astype(np.float32)
    b = np.asarray(Image.open(orig).convert('L')).astype(np.float32)
    best = None
    for s in np.arange(0.30, 1.01, 0.005):
        bs = cv2.resize(b, (int(b.shape[1] * s), int(b.shape[0] * s)), interpolation=cv2.INTER_AREA)
        if bs.shape[0] > a.shape[0] or bs.shape[1] > a.shape[1]: continue
        r = cv2.matchTemplate(a, bs, cv2.TM_CCOEFF_NORMED); _, mv, _, ml = cv2.minMaxLoc(r)
        if best is None or mv > best[0]: best = (mv, s, ml)
    mv, s, (x, y) = best; ob = Image.open(orig)
    box = (x, y, x + ob.width * s, y + ob.height * s)
    full.crop(tuple(round(v) for v in box)).resize(ob.size, Image.LANCZOS).save(dst, quality=88, method=6)
    print(dst, round(mv, 3), round(s, 3), box)
full.crop((677, 291, 1257, 735)).resize((1000, 766), Image.LANCZOS).save('public/img/lighting-stone.webp', quality=88, method=6)
# lighting-path.webp comes from a different render and is left untouched.
