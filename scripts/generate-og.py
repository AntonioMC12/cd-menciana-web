"""Build matching, self-contained SVG/PNG Open Graph artwork (1200 x 630).

Requirements: Pillow, FontTools and the project's installed Sharp (via Astro).
Montserrat comes from @fontsource/montserrat; text is outlined for portability.
Run: python scripts/generate-og.py
"""
from pathlib import Path
from html import escape
import subprocess
import sys
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
(ROOT / 'tmp' / 'brand-review').mkdir(parents=True, exist_ok=True)
# Optional isolated development install; not part of the public website.
sys.path.insert(0, str(ROOT / 'tmp' / 'og-tools'))
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen

FONT_DIR = ROOT / 'node_modules' / '@fontsource' / 'montserrat' / 'files'
fonts = {weight: TTFont(FONT_DIR / f'montserrat-latin-{weight}-normal.woff') for weight in (500, 700, 800)}

def label(text, x, baseline, size, color, weight=700, tracking=0):
    font = fonts[weight]
    glyphs = font.getGlyphSet()
    cmap = font.getBestCmap()
    scale = size / font['head'].unitsPerEm
    paths = []
    cursor = 0
    for char in text:
        name = cmap.get(ord(char), '.notdef')
        pen = SVGPathPen(glyphs)
        glyphs[name].draw(pen)
        commands = pen.getCommands()
        if commands:
            paths.append(f'<path transform="translate({cursor:.3f} 0)" d="{commands}"/>')
        cursor += glyphs[name].width + tracking / scale
    return f'<g role="img" aria-label="{escape(text)}" fill="{color}" transform="translate({x} {baseline}) scale({scale:.6f} {-scale:.6f})">' + ''.join(paths) + '</g>'

crest = (ROOT / 'public' / 'images' / 'escudo-oficial.svg').read_text(encoding='utf-8')
crest = crest.replace('viewBox="0 0 400 400"', 'x="824" y="164" width="302" height="302" viewBox="0 0 400 400"', 1)

svg = '''<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-labelledby="og-title og-description">
<title id="og-title">Club Deportivo Menciana · Apaga y Vámonos F.S.</title>
<desc id="og-description">Imagen de la web oficial del CD Menciana. Escudo del club sobre fondo azul marino, con acentos azules y dorados. Más que fútbol sala, desde Doña Mencía.</desc>
<defs>
  <linearGradient id="og-background" x2="1" y2="1"><stop stop-color="#0B2F6B"/><stop offset="1" stop-color="#071C3D"/></linearGradient>
  <pattern id="og-pattern" width="108" height="108" patternUnits="userSpaceOnUse" patternTransform="rotate(-12)"><path d="M-27 27 27 81 81 27 135 81 M-27 51 27 105 81 51 135 105" fill="none" stroke="#9FD6F3" stroke-opacity=".055" stroke-width="8"/></pattern>
</defs>
<rect width="1200" height="630" fill="url(#og-background)"/>
<path d="M900 0H1200V630H670Z" fill="#0E62C8" opacity=".4"/>
<rect width="1200" height="630" fill="url(#og-pattern)"/>
<path d="M1116 0H1162L1077 106H1031Z" fill="#9FD6F3" opacity=".2"/>
<rect x="68" y="90" width="42" height="3" rx="1.5" fill="#D6A84B"/>
<circle cx="975" cy="315" r="182" fill="#F8FBFF"/>
'''
svg += crest
svg += label('WEB OFICIAL / FÚTBOL SALA', 68, 68, 14, '#9FD6F3', tracking=2.1)
svg += label('CLUB DEPORTIVO', 68, 174, 23, '#D6A84B', tracking=3)
svg += label('MENCIANA', 62, 276, 88, '#F8FBFF', weight=800, tracking=-2)
svg += label('Apaga y Vámonos F.S.', 68, 330, 30, '#9FD6F3', weight=700)
svg += '<rect x="68" y="378" width="72" height="4" rx="2" fill="#D6A84B"/>'
svg += label('Más que fútbol sala.', 68, 438, 33, '#F8FBFF', weight=500)
svg += '<path d="M68 503H1132" stroke="#9FD6F3" stroke-opacity=".22"/>'
svg += label('DOÑA MENCÍA · CÓRDOBA', 68, 551, 15, '#9FD6F3', tracking=1.5)
svg += label('cdmenciana.es', 925, 551, 19, '#F8FBFF', weight=700)
svg += '<rect y="622" width="1200" height="8" fill="#0E62C8"/></svg>'
(ROOT / 'public' / 'og.svg').write_text(svg, encoding='utf-8')
# Render the actual SVG, so the raster asset cannot drift from its vector source.
subprocess.run(['node', '--input-type=module', '-e', "import sharp from 'sharp'; await sharp('public/og.svg').png({compressionLevel:9}).toFile('public/og.png');"], cwd=ROOT, check=True)
with Image.open(ROOT / 'public' / 'og.png') as image:
    assert image.size == (1200, 630)
    image.convert('RGB').resize((600, 315)).save(ROOT / 'tmp' / 'brand-review' / 'og-small.png')
print('Generated public/og.svg and public/og.png (1200 x 630).')
