"""
Builds the Tel K. Ganesan press kit PDF (2 pages) from src/frontend/data/press-kit.json, the same
file that feeds the Media & Speaking web page, so the two can never drift apart.

Wording and design follow Tel K. Ganesan's approval of 6 Oct 2026
(docs/pending-approval/PRESS_KIT_APPROVAL_RECORD.md). Brand colours are the locked pair:
Deep Midnight Blue #000033 and Golden Leaf #E6B904, with Golden Leaf used for text on dark
backgrounds only.

Usage:
  python scripts/generate-press-kit.py            # clean version -> public/downloads/ (for publishing)
  python scripts/generate-press-kit.py --draft    # marked DRAFT    -> docs/pending-approval/
"""
import json
import sys
from urllib.parse import urlparse

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import BaseDocTemplate, Frame, KeepTogether, PageTemplate, Paragraph, Spacer, Table, TableStyle

DRAFT = '--draft' in sys.argv
OUT = 'docs/pending-approval/tel-k-ganesan-press-kit.DRAFT.pdf' if DRAFT else 'public/downloads/tel-k-ganesan-press-kit.pdf'

with open('src/frontend/data/press-kit.json', encoding='utf8') as f:
    P = json.load(f)

MIDNIGHT = colors.HexColor('#000033')
LEAF = colors.HexColor('#E6B904')
IVORY = colors.HexColor('#F4F1E8')
INK = colors.HexColor('#1B2430')
MUTED = colors.HexColor('#3D4955')
ON_DARK = colors.HexColor('#D7DBEA')

W, H = letter
M = 0.7 * inch
CONTENT_W = W - 2 * M
HEADER_H = 2.55 * inch

st = {
    'h2': ParagraphStyle('h2', fontName='Times-Bold', fontSize=15, leading=18, textColor=MIDNIGHT, spaceBefore=9, spaceAfter=4, keepWithNext=1),
    'body': ParagraphStyle('body', fontName='Helvetica', fontSize=9, leading=12.6, textColor=INK, spaceAfter=4),
    'lede': ParagraphStyle('lede', fontName='Helvetica', fontSize=9, leading=12.6, textColor=MUTED, spaceAfter=5),
    'card_t': ParagraphStyle('card_t', fontName='Times-Bold', fontSize=10.5, leading=13, textColor=MIDNIGHT, spaceAfter=2),
    'card_b': ParagraphStyle('card_b', fontName='Helvetica', fontSize=8.6, leading=11.8, textColor=INK),
    'label': ParagraphStyle('label', fontName='Helvetica-Bold', fontSize=7.4, leading=10, textColor=MIDNIGHT, spaceAfter=1),
    'link': ParagraphStyle('link', fontName='Helvetica', fontSize=8.6, leading=11.6, textColor=MIDNIGHT),
    'small': ParagraphStyle('small', fontName='Helvetica', fontSize=8, leading=11, textColor=MUTED),
}


def esc(text):
    return text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')


def link(url, text=None):
    shown = text or (urlparse(url).netloc.replace('www.', '') + urlparse(url).path + ('?' + urlparse(url).query if urlparse(url).query else '')).rstrip('/')
    return f'<link href="{url}" color="#000033"><u>{esc(shown)}</u></link>'


def draw_page(canvas, doc):
    canvas.saveState()
    if doc.page == 1:
        canvas.setFillColor(MIDNIGHT)
        canvas.rect(0, H - HEADER_H, W, HEADER_H, stroke=0, fill=1)
        canvas.setFillColor(LEAF)
        canvas.rect(0, H - HEADER_H, W, 3, stroke=0, fill=1)
        canvas.setFont('Helvetica-Bold', 8)
        canvas.drawString(M, H - 0.62 * inch, P['positioning'].replace(' | ', '   |   ').upper())
        canvas.setFont('Times-Bold', 50)
        canvas.drawString(M, H - 1.4 * inch, P['headline'])
        canvas.setFillColor(colors.HexColor('#F4F1E8'))
        canvas.setFont('Times-Italic', 12)
        canvas.drawString(M, H - 1.78 * inch, 'Tel K. Ganesan builds enterprises, leaders, and platforms')
        canvas.drawString(M, H - 1.78 * inch - 15, 'that turn possibility into lasting value.')
        canvas.setFillColor(ON_DARK)
        canvas.setFont('Helvetica', 8)
        canvas.drawString(M, H - HEADER_H + 0.2 * inch, 'Media and Speaking Press Kit')
    else:
        canvas.setFillColor(MIDNIGHT)
        canvas.rect(0, H - 0.62 * inch, W, 0.62 * inch, stroke=0, fill=1)
        canvas.setFillColor(LEAF)
        canvas.rect(0, H - 0.62 * inch, W, 2, stroke=0, fill=1)
        canvas.setFont('Times-Bold', 14)
        canvas.drawString(M, H - 0.4 * inch, 'Tel K. Ganesan')
        canvas.setFont('Helvetica-Bold', 7.5)
        canvas.drawRightString(W - M, H - 0.39 * inch, 'MEDIA AND SPEAKING PRESS KIT')
    # Footer
    canvas.setFillColor(MUTED)
    canvas.setFont('Helvetica', 7.5)
    canvas.drawString(M, 0.42 * inch, 'telkganesan.com')
    canvas.drawRightString(W - M, 0.42 * inch, f'Page {doc.page} of 2')
    if DRAFT:
        canvas.setFillColor(colors.HexColor('#9B2C2C'))
        canvas.setFont('Helvetica-Bold', 7.5)
        canvas.drawCentredString(W / 2, 0.42 * inch, 'DRAFT - NOT FOR DISTRIBUTION')
        canvas.translate(W / 2, H / 2)
        canvas.rotate(35)
        canvas.setFillColor(colors.Color(0.6, 0.15, 0.15, alpha=0.06))
        canvas.setFont('Helvetica-Bold', 90)
        canvas.drawCentredString(0, 0, 'DRAFT')
    canvas.restoreState()


def card_table(cells, cols, gap=8, boxed=True):
    """A grid of equal-height cards in ONE table (rows share a height). `cells` are lists of flowables."""
    col_w = (CONTENT_W - gap * (cols - 1)) / cols
    widths, ncols = [], 0
    for c in range(cols):
        widths.append(col_w)
        if c < cols - 1:
            widths.append(gap)
    nrows = (len(cells) + cols - 1) // cols
    data, heights, style = [], [], [
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0), ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0), ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
    ]
    for r in range(nrows):
        row = []
        for c in range(cols):
            idx = r * cols + c
            row.append(cells[idx] if idx < len(cells) else '')
            if c < cols - 1:
                row.append('')
            if boxed and idx < len(cells):
                x = c * 2
                style += [
                    ('BACKGROUND', (x, r * 2), (x, r * 2), IVORY),
                    ('LINEBEFORE', (x, r * 2), (x, r * 2), 3, LEAF),
                    ('LEFTPADDING', (x, r * 2), (x, r * 2), 8), ('RIGHTPADDING', (x, r * 2), (x, r * 2), 6),
                    ('TOPPADDING', (x, r * 2), (x, r * 2), 6), ('BOTTOMPADDING', (x, r * 2), (x, r * 2), 6),
                ]
        data.append(row)
        heights.append(None)
        if r < nrows - 1:
            data.append([''] * len(widths))
            heights.append(gap)
    t = Table(data, colWidths=widths, rowHeights=heights, hAlign='LEFT')
    t.setStyle(TableStyle(style))
    return t


def card(title, lines):
    return [Paragraph(esc(title), st['card_t'])] + [Paragraph(l, st['card_b']) for l in lines]


story = []

# --- Speaking Themes ---
story += [Paragraph('Speaking Themes', st['h2']), Paragraph(esc(P['speakingIntro']), st['lede'])]
theme_cards = []
for t in P['themes']:
    lines = [esc(t['text'])]
    if t.get('audience'):
        lines.append('<b>Audience:</b> ' + esc(t['audience']))
    if t.get('takeaway'):
        lines.append('<b>Takeaway:</b> ' + esc(t['takeaway']))
    theme_cards.append(card(t['title'], lines))
story.append(card_table(theme_cards, 3))

# --- Formats ---
fmt = Table(
    [[Paragraph('SPEAKING', st['label']), Paragraph(esc(P['formats']['speaking']), st['card_b']),
      Paragraph('MEDIA', st['label']), Paragraph(esc(P['formats']['media']), st['card_b'])]],
    colWidths=[0.7 * inch, (CONTENT_W - 1.4 * inch) / 2, 0.5 * inch, (CONTENT_W - 1.4 * inch) / 2 - 0.5 * inch + 0.5 * inch],
)
fmt.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP'), ('LINEABOVE', (0, 0), (-1, 0), 0.6, MIDNIGHT),
                         ('LINEBELOW', (0, 0), (-1, 0), 0.6, MIDNIGHT), ('TOPPADDING', (0, 0), (-1, -1), 5), ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
                         ('LEFTPADDING', (0, 0), (-1, -1), 0)]))
story += [Paragraph('Formats', st['h2']), fmt]

# --- Bio ---
story += [Paragraph('Short and full bio', st['h2'])]
short = Table([[Paragraph('SHORT BIO  <font color="#3D4955">(for MCs, hosts and producers)</font>', st['label'])],
               [Paragraph(esc(P['shortBio']), st['body'])]], colWidths=[CONTENT_W])
short.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, -1), IVORY), ('LINEBEFORE', (0, 0), (0, -1), 3, LEAF),
                           ('LEFTPADDING', (0, 0), (-1, -1), 9), ('RIGHTPADDING', (0, 0), (-1, -1), 9),
                           ('TOPPADDING', (0, 0), (-1, 0), 6), ('BOTTOMPADDING', (0, -1), (-1, -1), 4)]))
story += [short, Spacer(1, 5), Paragraph('FULL BIO', st['label'])]
for para in P['fullBio']:
    story.append(Paragraph(esc(para), st['body']))

# --- Page 2 ---
# Operating principles in two columns
story += [Paragraph('Operating Principles', st['h2'])]
pr = [Paragraph(f'<font color="#000033"><b>{i:02d}</b></font>&nbsp;&nbsp;{esc(t)}', st['body']) for i, t in enumerate(P['principles'], 1)]
half = (len(pr) + 1) // 2
left, right = pr[:half], pr[half:] + [''] * (half - len(pr[half:]))
ptab = Table([[l, r] for l, r in zip(left, right)], colWidths=[CONTENT_W / 2] * 2)
ptab.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP'), ('LEFTPADDING', (0, 0), (-1, -1), 0), ('RIGHTPADDING', (0, 0), (-1, -1), 10),
                          ('TOPPADDING', (0, 0), (-1, -1), 1), ('BOTTOMPADDING', (0, 0), (-1, -1), 1)]))
story.append(ptab)

# Platforms: all four cards kept together
plat = [card(x['title'], [esc(x['text'])]) for x in P['platforms']]
story.append(KeepTogether([Paragraph('Platforms', st['h2']), Paragraph(esc(P['platformsIntro']), st['lede']), card_table(plat, 2)]))

# Official destinations (clickable)
dest = [Paragraph(f'<b>{esc(d["label"])}</b><br/>{link(d["url"])}', st['link']) for d in P['destinations']]
story.append(KeepTogether([Paragraph('Official destinations', st['h2']), card_table(dest, 2, gap=6, boxed=False)]))

# Routes
route_lines = [
    Paragraph(f'<b>Speaking:</b>&nbsp;&nbsp;{link(P["routes"]["speaking"])}', st['link']),
    Paragraph(f'<b>Media:</b>&nbsp;&nbsp;{link(P["routes"]["media"])}', st['link']),
]
if P.get('responseTime'):
    route_lines.append(Paragraph(esc(P['responseTime']), st['small']))
story.append(KeepTogether([Paragraph('Inquiry routes', st['h2'])] + route_lines))

top_margin = HEADER_H + 0.1 * inch
doc = BaseDocTemplate(OUT, pagesize=letter, leftMargin=M, rightMargin=M, topMargin=top_margin, bottomMargin=0.75 * inch,
                      title='Tel K. Ganesan - Media and Speaking Press Kit', author='Tel K. Ganesan')
f1 = Frame(M, 0.75 * inch, CONTENT_W, H - top_margin - 0.75 * inch, id='f1', leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
f2 = Frame(M, 0.75 * inch, CONTENT_W, H - 0.62 * inch - 0.25 * inch - 0.75 * inch, id='f2', leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
doc.addPageTemplates([PageTemplate(id='first', frames=[f1], onPage=draw_page, autoNextPageTemplate='later'),
                      PageTemplate(id='later', frames=[f2], onPage=draw_page)])
doc.build(story)
print('wrote', OUT, '(DRAFT)' if DRAFT else '(clean)')
