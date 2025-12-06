"""
Generate bare.money brand assets (SVG, PNG, ICO).

Outputs:
- SVG: icon-only, wordmark-only, lockup (icon + wordmark) in light/dark.
- PNG: icon + lockup at 1x/2x/3x scales.
- ICO: favicon with multiple sizes (light + dark).
"""

from __future__ import annotations

import io
from pathlib import Path
from typing import Iterable, Tuple

from PIL import Image, ImageDraw, ImageFont


BASE_DIR = Path(__file__).resolve().parent.parent
OUT_DIR = BASE_DIR / "public" / "brand" / "bare"
FONT_PATH = OUT_DIR / "fonts" / "Outfit-Variable.ttf"

TEXT = "bare"

# Icon proportions are based on a 64px artboard and scale cleanly to any size.
ICON_BASE = 64
RECT_W = 22
RECT_H_TOP = 14
RECT_H_BOTTOM = 18
RADIUS = 6
MARGIN_X = 8
MARGIN_Y = 8
COL_GAP = 6
ROW_GAP = 8

PNG_ICON_SIZES = [256, 512, 768]  # 1x, 2x, 3x
FAVICON_ICO_SIZES = [256, 128, 64, 32, 16]  # ICO maxes at 256px
FAVICON_EXPORT_SIZES = [512, 256, 128, 64, 32, 16]


def rgba(hex_str: str, alpha: int = 255) -> Tuple[int, int, int, int]:
    hex_str = hex_str.lstrip("#")
    r = int(hex_str[0:2], 16)
    g = int(hex_str[2:4], 16)
    b = int(hex_str[4:6], 16)
    return (r, g, b, alpha)


THEMES = {
    "light": {"fill": rgba("000000"), "bg": None, "hex": "#000000"},
    "dark": {"fill": rgba("FFFFFF"), "bg": None, "hex": "#FFFFFF"},
}
PUBLIC_FAVICON_BG: Tuple[int, int, int, int] | None = None  # transparent
PUBLIC_FAVICON_FILL = rgba("715B64")
PUBLIC_FAVICON_CHAR = "b"

def load_font(size: int, weight: int = 600) -> ImageFont.FreeTypeFont:
    font = ImageFont.truetype(str(FONT_PATH), size=size)
    try:
        # Outfit variable font: set weight axis so the wordmark matches 600.
        font.set_variation_by_axes([weight])
    except Exception:
        pass
    return font


def scale(value: float, target_size: int) -> int:
    return int(round(value * (target_size / ICON_BASE)))


def icon_rects(size: int) -> Iterable[Tuple[int, int, int, int, int]]:
    x0 = scale(MARGIN_X, size)
    y0 = scale(MARGIN_Y, size)
    w = scale(RECT_W, size)
    h_top = scale(RECT_H_TOP, size)
    h_bottom = scale(RECT_H_BOTTOM, size)
    gap_x = scale(COL_GAP, size)
    gap_y = scale(ROW_GAP, size)
    radius = scale(RADIUS, size)

    left_x = x0
    right_x = x0 + w + gap_x
    top_y = y0
    bottom_y = y0 + h_top + gap_y

    return (
        (left_x, top_y, left_x + w, top_y + h_top, radius),
        (right_x, top_y, right_x + w, top_y + h_top, radius),
        (left_x, bottom_y, left_x + w, bottom_y + h_bottom, radius),
        (right_x, bottom_y, right_x + w, bottom_y + h_bottom, radius),
    )


def draw_icon(size: int, fill: Tuple[int, int, int, int], bg: Tuple[int, int, int, int] | None):
    img = Image.new("RGBA", (size, size), bg or (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    for x1, y1, x2, y2, r in icon_rects(size):
        draw.rounded_rectangle((x1, y1, x2, y2), radius=r, fill=fill)
    return img


def measure_text(font_size: int):
    font = load_font(font_size)
    bbox = font.getbbox(TEXT)
    width = bbox[2] - bbox[0]
    height = bbox[3] - bbox[1]
    return font, bbox, width, height


def draw_wordmark(height: int, fill: Tuple[int, int, int, int], bg: Tuple[int, int, int, int] | None):
    font_size = int(round(height * 0.62))
    font, bbox, text_w, text_h = measure_text(font_size)
    pad = int(round(height * 0.1))
    canvas = Image.new("RGBA", (text_w + pad * 2, height), bg or (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    y = (height - text_h) / 2 - bbox[1]
    draw.text((pad, y), TEXT, font=font, fill=fill)
    return canvas


def draw_lockup(icon_size: int, fill: Tuple[int, int, int, int], bg: Tuple[int, int, int, int] | None):
    gap = scale(RECT_W, icon_size)  # gap roughly equals one top rectangle width
    font_size = int(round(icon_size * 0.62))
    font, bbox, text_w, text_h = measure_text(font_size)
    pad = int(round(icon_size * 0.1))
    total_width = icon_size + gap + text_w + pad * 2
    canvas = Image.new("RGBA", (total_width, icon_size), bg or (0, 0, 0, 0))

    # Draw icon
    icon_img = draw_icon(icon_size, fill, bg)
    canvas.alpha_composite(icon_img, dest=(0, 0))

    # Draw wordmark
    y = (icon_size - text_h) / 2 - bbox[1]
    draw = ImageDraw.Draw(canvas)
    draw.text((icon_size + gap + pad, y), TEXT, font=font, fill=fill)
    return canvas


def save_svgs():
    icon_svg_template = """<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 {size} {size}" fill="none">
  <rect x="{x0}" y="{y0}" width="{w}" height="{h_top}" rx="{r}" fill="{fill}"/>
  <rect x="{x1}" y="{y0}" width="{w}" height="{h_top}" rx="{r}" fill="{fill}"/>
  <rect x="{x0}" y="{y1}" width="{w}" height="{h_bottom}" rx="{r}" fill="{fill}"/>
  <rect x="{x1}" y="{y1}" width="{w}" height="{h_bottom}" rx="{r}" fill="{fill}"/>
</svg>
"""

    for theme, cfg in THEMES.items():
        fill_hex = cfg["hex"]
        icon_svg = icon_svg_template.format(
            size=ICON_BASE,
            x0=MARGIN_X,
            y0=MARGIN_Y,
            w=RECT_W,
            h_top=RECT_H_TOP,
            h_bottom=RECT_H_BOTTOM,
            r=RADIUS,
            x1=MARGIN_X + RECT_W + COL_GAP,
            y1=MARGIN_Y + RECT_H_TOP + ROW_GAP,
            fill=fill_hex,
        )
        (OUT_DIR / f"icon-{theme}.svg").write_text(icon_svg, encoding="utf-8")

        font_size = 40
        font, bbox, text_w, text_h = measure_text(font_size)
        pad = scale(8, ICON_BASE)
        wordmark_w = text_w + pad * 2
        wordmark_h = ICON_BASE
        wordmark_svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="{wordmark_w}" height="{wordmark_h}" viewBox="0 0 {wordmark_w} {wordmark_h}" fill="none">
  <text x="{pad}" y="{wordmark_h/2}" fill="{fill_hex}" font-family="Outfit, 'Outfit Variable', sans-serif" font-size="{font_size}" font-weight="600" dominant-baseline="middle">{TEXT}</text>
</svg>
"""
        (OUT_DIR / f"wordmark-{theme}.svg").write_text(wordmark_svg, encoding="utf-8")

        gap = RECT_W
        lockup_w = ICON_BASE + gap + wordmark_w
        lockup_h = ICON_BASE
        lockup_svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="{lockup_w}" height="{lockup_h}" viewBox="0 0 {lockup_w} {lockup_h}" fill="none">
  <g>
    <rect x="{MARGIN_X}" y="{MARGIN_Y}" width="{RECT_W}" height="{RECT_H_TOP}" rx="{RADIUS}" fill="{fill_hex}"/>
    <rect x="{MARGIN_X + RECT_W + COL_GAP}" y="{MARGIN_Y}" width="{RECT_W}" height="{RECT_H_TOP}" rx="{RADIUS}" fill="{fill_hex}"/>
    <rect x="{MARGIN_X}" y="{MARGIN_Y + RECT_H_TOP + ROW_GAP}" width="{RECT_W}" height="{RECT_H_BOTTOM}" rx="{RADIUS}" fill="{fill_hex}"/>
    <rect x="{MARGIN_X + RECT_W + COL_GAP}" y="{MARGIN_Y + RECT_H_TOP + ROW_GAP}" width="{RECT_W}" height="{RECT_H_BOTTOM}" rx="{RADIUS}" fill="{fill_hex}"/>
  </g>
  <text x="{ICON_BASE + gap + pad}" y="{lockup_h/2}" fill="{fill_hex}" font-family="Outfit, 'Outfit Variable', sans-serif" font-size="{font_size}" font-weight="600" dominant-baseline="middle">{TEXT}</text>
</svg>
"""
        (OUT_DIR / f"logo-lockup-{theme}.svg").write_text(lockup_svg, encoding="utf-8")


def save_pngs():
    for theme, cfg in THEMES.items():
        fill = cfg["fill"]
        bg = cfg["bg"]
        for idx, size in enumerate(PNG_ICON_SIZES, start=1):
            icon_img = draw_icon(size, fill, bg)
            icon_img.save(OUT_DIR / f"icon-{theme}@{idx}x.png")

            lockup_img = draw_lockup(size, fill, bg)
            lockup_img.save(OUT_DIR / f"logo-lockup-{theme}@{idx}x.png")


def save_favicons():
    for theme, cfg in THEMES.items():
        fill = cfg["fill"]
        bg = cfg["bg"]
        ico_images = [draw_icon(size, fill, bg) for size in FAVICON_ICO_SIZES]
        _write_multi_size_ico(OUT_DIR / f"favicon-{theme}.ico", ico_images)
        # Export explicit per-size PNGs (including 512) to keep the tiny cuts pixel-crisp.
        for size in FAVICON_EXPORT_SIZES:
            icon = draw_icon(size, fill, bg)
            icon.save(OUT_DIR / f"favicon-{theme}-{size}.png")


def save_public_favicon():
    icons = [draw_letter_icon(size, PUBLIC_FAVICON_FILL, PUBLIC_FAVICON_BG) for size in FAVICON_ICO_SIZES]
    _write_multi_size_ico(BASE_DIR / "public" / "favicon.ico", icons)
    # Common 32px PNG for fallbacks.
    icons[3].save(BASE_DIR / "public" / "favicon-32.png")


def draw_letter_icon(size: int, fill: Tuple[int, int, int, int], bg: Tuple[int, int, int, int] | None):
    img = Image.new("RGBA", (size, size), bg or (0, 0, 0, 0))
    font_size = int(round(size * 0.9))  # larger for legibility at small sizes
    font = load_font(font_size, weight=800)
    bbox = font.getbbox(PUBLIC_FAVICON_CHAR)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
    x = (size - text_w) / 2 - bbox[0]
    y = (size - text_h) / 2 - bbox[1]
    draw = ImageDraw.Draw(img)
    draw.text((x, y), PUBLIC_FAVICON_CHAR, font=font, fill=fill)
    return img


def _write_multi_size_ico(path: Path, images: list[Image.Image]):
    header = bytearray()
    header += (0).to_bytes(2, "little")  # reserved
    header += (1).to_bytes(2, "little")  # type: icon
    header += (len(images)).to_bytes(2, "little")

    entries = bytearray()
    offset = 6 + 16 * len(images)
    data_blocks = []
    for img in images:
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        data = buf.getvalue()
        data_blocks.append(data)

        width_byte = img.width if img.width < 256 else 0  # 0 represents 256
        height_byte = img.height if img.height < 256 else 0
        entries += bytes([width_byte, height_byte, 0, 0])  # colors, reserved
        entries += (1).to_bytes(2, "little")  # planes
        entries += (32).to_bytes(2, "little")  # bit depth
        entries += len(data).to_bytes(4, "little")
        entries += offset.to_bytes(4, "little")
        offset += len(data)

    blob = header + entries
    for block in data_blocks:
        blob += block

    path.write_bytes(blob)


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    save_svgs()
    save_pngs()
    save_favicons()
    save_public_favicon()
    print("Assets written to", OUT_DIR)


if __name__ == "__main__":
    main()
