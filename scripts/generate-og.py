"""Generate a portable Open Graph image from the website's design tokens."""

from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
image = Image.new("RGB", (1200, 630), "#0d2e5b")
draw = ImageDraw.Draw(image)

for y in range(630):
    blend = y / 629
    draw.line((0, y, 1200, y), fill=(int(8 + 16 * blend), int(34 + 68 * blend), int(74 + 105 * blend)))

for x in range(-400, 1450, 90):
    draw.line((x, 0, x + 500, 630), fill="#184d82", width=4)

for radius, width in ((255, 3), (190, 38), (120, 2)):
    draw.ellipse((950 - radius, 315 - radius, 950 + radius, 315 + radius), outline="#2d689d", width=width)

font_dir = Path("C:/Windows/Fonts")
bold = font_dir / "arialbd.ttf"
regular = font_dir / "arial.ttf"
small = ImageFont.truetype(str(bold), 25)
large = ImageFont.truetype(str(bold), 124)
medium = ImageFont.truetype(str(bold), 45)
tagline = ImageFont.truetype(str(regular), 32)

draw.text((74, 88), "CLUB DEPORTIVO  ·  DOÑA MENCÍA", fill="#e4c77f", font=small)
draw.text((66, 190), "MENCIANA", fill="white", font=large, stroke_width=1)
draw.text((77, 358), "APAGA Y VÁMONOS F.S.", fill="#9fd6f3", font=medium)
draw.rectangle((80, 453, 310, 458), fill="#c9a961")
draw.text((80, 483), "Más que fútbol sala.", fill="white", font=tagline)

image.save(ROOT / "public" / "og.png", optimize=True)
