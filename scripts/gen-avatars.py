"""Genera avatar illustrati FITTIZI (nessuna persona reale) per le anteprime dei template.
Uso: python scripts/gen-avatars.py   ->  scripts/assets/avatar-1.jpg ... avatar-12.jpg
Disegnati a 2x e ridotti per ottenere bordi morbidi."""
import os
from PIL import Image, ImageDraw, ImageFilter

OUT = os.path.join(os.path.dirname(__file__), 'assets')
S = 1200  # canvas di lavoro (2x)

# (nome, sfondo alto, sfondo basso, pelle, capelli, abito, stile capelli, barba)
SPECS = [
    ('woman-long-dark',  (150, 205, 200), (90, 150, 160), (214, 170, 140), (42, 30, 28),   (30, 120, 130), 'long',   False),
    ('man-short-brown',  (200, 210, 235), (130, 150, 200), (236, 200, 175), (84, 56, 40),   (36, 52, 92),   'short',  False),
    ('woman-bun-blonde', (250, 226, 190), (230, 180, 140), (240, 208, 184), (214, 172, 96),  (214, 160, 40), 'bun',    False),
    ('man-beard-black',  (190, 220, 190), (120, 170, 140), (168, 118, 88),  (24, 20, 20),    (96, 100, 108), 'short',  True),
    ('woman-curly-dark', (245, 205, 190), (225, 150, 140), (122, 84, 62),   (26, 20, 20),    (232, 112, 92), 'curly',  False),
    ('woman-bob-red',    (205, 225, 245), (150, 185, 215), (242, 212, 192), (170, 70, 44),   (56, 128, 92),  'bob',    False),
    ('man-bald-tan',     (230, 220, 245), (180, 160, 215), (198, 150, 116), (0, 0, 0),       (52, 56, 64),   'bald',   False),
    ('woman-long-blonde', (255, 232, 210), (240, 190, 170), (244, 216, 196), (226, 190, 118), (150, 120, 190), 'long',   False),
    ('man-curly-medium', (210, 235, 225), (140, 190, 170), (190, 140, 106), (46, 32, 26),    (110, 120, 70), 'curly',  False),
    ('woman-pixie-black', (225, 215, 240), (170, 150, 205), (226, 190, 156), (24, 22, 26),    (245, 245, 242), 'pixie', False),
    ('man-grey-light',   (240, 225, 215), (210, 170, 150), (238, 205, 182), (176, 176, 180), (128, 40, 56),  'short',  False),
    ('woman-ponytail',   (200, 230, 240), (130, 180, 205), (205, 160, 126), (92, 60, 40),    (58, 100, 170), 'pony',   False),
]


def draw(spec, index):
    _name, top, bottom, skin, hair, cloth, style, beard = spec
    im = Image.new('RGB', (S, S))
    d = ImageDraw.Draw(im)
    for y in range(S):  # sfondo sfumato
        t = y / S
        d.line([(0, y), (S, y)], fill=tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3)))
    cx = S // 2

    def circle(x, y, r, fill):
        d.ellipse((x - r, y - r, x + r, y + r), fill=fill)

    # capelli dietro la testa
    if style == 'long':
        d.rounded_rectangle((cx - 270, 330, cx + 270, 900), 200, fill=hair)
    elif style == 'bob':
        d.rounded_rectangle((cx - 270, 330, cx + 270, 700), 150, fill=hair)
    elif style == 'curly':
        for dx, dy in [(-250, 420), (250, 420), (-280, 560), (280, 560), (-190, 300), (190, 300), (0, 250)]:
            circle(cx + dx, dy, 120, hair)
    elif style == 'bun':
        circle(cx, 210, 120, hair)
    elif style == 'pony':
        circle(cx + 300, 560, 90, hair)
        d.rounded_rectangle((cx + 240, 520, cx + 340, 840), 50, fill=hair)

    # spalle / abito
    d.pieslice((cx - 520, 760, cx + 520, 1500), 180, 360, fill=cloth)
    d.rectangle((cx - 90, 640, cx + 90, 840), fill=skin)  # collo
    d.polygon([(cx - 140, 800), (cx + 140, 800), (cx, 930)], fill=skin)  # scollo

    # testa
    d.ellipse((cx - 230, 280, cx + 230, 760), fill=skin)
    circle(cx - 232, 540, 38, skin); circle(cx + 232, 540, 38, skin)  # orecchie

    # capelli sopra
    if style in ('short', 'curly', 'bob', 'long', 'bun', 'pony', 'pixie'):
        d.pieslice((cx - 245, 270, cx + 245, 700), 180, 360, fill=hair)
        if style in ('long', 'bob', 'pixie'):
            d.polygon([(cx - 245, 480), (cx - 40, 330), (cx + 245, 480), (cx + 245, 400), (cx, 270), (cx - 245, 400)], fill=hair)
    if style == 'curly':
        for dx in (-170, -60, 60, 170):
            circle(cx + dx, 330, 85, hair)
    if beard:
        d.pieslice((cx - 235, 450, cx + 235, 800), 0, 180, fill=hair)
        d.ellipse((cx - 120, 600, cx + 120, 660), fill=(150, 90, 80))  # bocca
    # viso: occhi e sorriso
    for dx in (-85, 85):
        d.ellipse((cx + dx - 26, 505, cx + dx + 26, 555), fill=(255, 255, 255))
        circle(cx + dx, 530, 16, (38, 30, 28))
    if not beard:
        d.arc((cx - 80, 560, cx + 80, 680), 20, 160, fill=(150, 70, 70), width=12)
    return im.filter(ImageFilter.GaussianBlur(1.4)).resize((600, 600), Image.LANCZOS)


os.makedirs(OUT, exist_ok=True)
for i, spec in enumerate(SPECS, 1):
    draw(spec, i).save(os.path.join(OUT, f'avatar-{i}.jpg'), quality=90)
print(f'{len(SPECS)} avatars in {OUT}')
