"""
Builds the Tel K. Ganesan press kit PDF from APPROVED website wording only.

Every sentence below is copied from a page that already carries approved Copy Deck text
(see docs/pending-approval/PRESS_KIT_REVIEW.md for the source of each line). Deliberately left
out until they are verified in the Claim Register: awards, workforce figures,
founding year, film credits and rankings, and any photograph whose rights are not cleared.

Usage:
  python scripts/generate-press-kit.py            # DRAFT, marked "pending approval"
  python scripts/generate-press-kit.py --final    # clean version, only after written approval
"""
import sys

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import BaseDocTemplate, Frame, PageBreak, PageTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether

FINAL = '--final' in sys.argv
OUT = 'docs/pending-approval/tel-k-ganesan-press-kit.pdf' if not FINAL else 'public/downloads/tel-k-ganesan-press-kit.pdf'

NAVY = colors.HexColor('#0A1A2B')
GOLD = colors.HexColor('#C8A45B')
IVORY = colors.HexColor('#F7F4EC')
INK = colors.HexColor('#1B2430')
MUTED = colors.HexColor('#4A5764')

W, H = letter
M = 0.85 * inch

eyebrow = ParagraphStyle('eyebrow', fontName='Helvetica-Bold', fontSize=8.5, leading=11, textColor=colors.HexColor('#8A6420'), spaceAfter=4, keepWithNext=1)
h2 = ParagraphStyle('h2', fontName='Times-Bold', fontSize=19, leading=23, textColor=NAVY, spaceAfter=8, keepWithNext=1)
body = ParagraphStyle('body', fontName='Helvetica', fontSize=10.5, leading=16, textColor=INK, spaceAfter=8)
lede = ParagraphStyle('lede', fontName='Times-Italic', fontSize=14.5, leading=21, textColor=NAVY, spaceAfter=6)
small = ParagraphStyle('small', fontName='Helvetica', fontSize=9, leading=13, textColor=MUTED)
card_t = ParagraphStyle('card_t', fontName='Times-Bold', fontSize=12.5, leading=16, textColor=NAVY, spaceAfter=3)
card_b = ParagraphStyle('card_b', fontName='Helvetica', fontSize=9.5, leading=14, textColor=INK)


def decorate(canvas, doc):
    canvas.saveState()
    # Header band
    canvas.setFillColor(NAVY)
    canvas.rect(0, H - 1.55 * inch, W, 1.55 * inch, stroke=0, fill=1)
    canvas.setFillColor(GOLD)
    canvas.rect(0, H - 1.55 * inch, W, 3, stroke=0, fill=1)
    if doc.page == 1:
        canvas.setFillColor(colors.white)
        canvas.setFont('Times-Bold', 28)
        canvas.drawString(M, H - 0.85 * inch, 'Tel K. Ganesan')
        canvas.setFillColor(GOLD)
        canvas.setFont('Helvetica-Bold', 8.5)
        canvas.drawString(M, H - 1.12 * inch, 'EXECUTIVE CHAIRMAN  |  ENTERPRISE BUILDER  |  INVESTOR  |  PRODUCER')
        canvas.setFillColor(colors.HexColor('#C9D1DD'))
        canvas.setFont('Helvetica', 9)
        canvas.drawString(M, H - 1.36 * inch, 'Media and Speaking Press Kit')
    else:
        canvas.setFillColor(colors.white)
        canvas.setFont('Times-Bold', 15)
        canvas.drawString(M, H - 0.9 * inch, 'Tel K. Ganesan')
        canvas.setFillColor(GOLD)
        canvas.setFont('Helvetica-Bold', 8.5)
        canvas.drawString(M, H - 1.15 * inch, 'MEDIA AND SPEAKING PRESS KIT')
    # Footer
    canvas.setFillColor(MUTED)
    canvas.setFont('Helvetica', 8)
    canvas.drawString(M, 0.55 * inch, 'telkganesan.com')
    canvas.drawRightString(W - M, 0.55 * inch, f'Page {doc.page}')
    if not FINAL:
        canvas.setFillColor(colors.HexColor('#9B2C2C'))
        canvas.setFont('Helvetica-Bold', 8)
        canvas.drawCentredString(W / 2, 0.55 * inch, 'DRAFT - PENDING APPROVAL BY TEL K. GANESAN / LEGAL - NOT FOR DISTRIBUTION')
        canvas.saveState()
        canvas.translate(W / 2, H / 2)
        canvas.rotate(35)
        canvas.setFillColor(colors.Color(0.6, 0.15, 0.15, alpha=0.07))
        canvas.setFont('Helvetica-Bold', 90)
        canvas.drawCentredString(0, 0, 'DRAFT')
        canvas.restoreState()
    canvas.restoreState()


def card(title, text):
    t = Table([[Paragraph(title, card_t)], [Paragraph(text, card_b)]], colWidths=[W - 2 * M])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), IVORY),
        ('LINEBEFORE', (0, 0), (0, -1), 3, GOLD),
        ('LEFTPADDING', (0, 0), (-1, -1), 14),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
        ('TOPPADDING', (0, 0), (0, 0), 10),
        ('BOTTOMPADDING', (0, -1), (-1, -1), 10),
    ]))
    return KeepTogether([t, Spacer(1, 8)])


story = []

story += [
    Paragraph('PROFILE', eyebrow),
    Paragraph('Tel K. Ganesan builds enterprises, leaders, and platforms that turn possibility into lasting value.', lede),
    Spacer(1, 4),
    Paragraph('Short biography', h2),
    Paragraph(
        'Tel K. Ganesan is an Executive Chairman, enterprise builder, investor, and producer. From Detroit, he has built and '
        'supported businesses, creative projects, and community initiatives across cultures and industries. Kyyba remains the '
        'flagship proof of his operating journey.', body),
    Paragraph(
        'Today, Tel focuses his time where founder judgment matters most: enterprise value, consequential relationships, '
        'leadership development, selective investment, narrative, and legacy. His work is grounded in a simple belief: '
        'possibility becomes durable only when people, systems, and purpose grow together.', body),
    Spacer(1, 6),
    Paragraph('OPERATING PRINCIPLES', eyebrow),
    Paragraph('What the journey taught', h2),
]
for n, t in enumerate([
    'See potential before consensus forms.',
    'Build the system, not dependence on the founder.',
    'Connect worlds with respect.',
    'Persist in the purpose; stay flexible about the vehicle.',
    'Protect the capacity behind the contribution.',
], 1):
    story.append(Paragraph(f'<font color="#8A6420"><b>{n:02d}</b></font>&nbsp;&nbsp;{t}', body))

story += [Spacer(1, 6), Paragraph('PLATFORMS AND WORK', eyebrow), Paragraph('Where the work happens', h2),
          Paragraph('Headquartered in Metro Detroit with enterprise operations and film productions spanning North America and India.', body)]
story.append(card('Kyyba', 'Kyyba is the cornerstone of Tel\u2019s enterprise-building journey, uniting technology, talent and innovation to create real-world value.'))
story.append(card('Mind Trap', 'Mind Trap explores the subconscious beliefs and operational friction that keep high-potential leaders from their next breakthrough. Hosted by Tel K. Ganesan.'))
story.append(card('Kyyba Films', 'Film, media and culture: stories that inspire, challenge perspectives and connect people across communities.'))
story.append(card('Community impact', 'Three focus areas: Youth and Education Empowerment; Urban Revitalization and Community Support; Enterprise and Founder Mentorship.'))

story += [Spacer(1, 6), Paragraph('SPEAKING', eyebrow), Paragraph('Themes for consequential rooms', h2),
          Paragraph('Useful ideas for leaders, founders, and teams navigating growth, reinvention, and the responsibility to turn vision into execution.', body)]
story.append(Paragraph('<b>Formats:</b> television and podcast broadcasts, executive keynotes, summit fireside chats, and global leadership roundtables.', body))
story.append(card('Building possibility', 'How leaders move from a compelling idea to a structure that can carry it.'))
story.append(card('Leadership under complexity', 'Clarity, ownership, and decision-making when the path is uncertain.'))
story.append(card('Enterprise meets culture', 'What builders can learn from story, audience, and creative risk.'))

story += [
    Spacer(1, 6),
    Paragraph('OFFICIAL DESTINATIONS', eyebrow),
    Paragraph('Where to learn more', h2),
    Paragraph('<b>Website:</b> telkganesan.com', body),
    Paragraph('<b>Mind Trap (framework and podcast):</b> mindtrappodcast.com', body),
    Paragraph('<b>Kyyba Films:</b> kyybafilms.com', body),
    Paragraph('<b>LinkedIn:</b> linkedin.com/in/telkganesan', body),
    Paragraph('<b>X:</b> x.com/TelKGanesan', body),
    Paragraph('<b>Instagram:</b> instagram.com/telkganesan', body),
    Paragraph('<b>YouTube:</b> youtube.com/@TelKGanesan', body),
    Paragraph('<b>IMDb:</b> imdb.com/name/nm10609355', body),
    Spacer(1, 8),
    Paragraph('REQUESTS', eyebrow),
    Paragraph('Speaking and media inquiries', h2),
    Paragraph(
        'Speaking and media requests are handled through dedicated routes so that each reaches the right owner with the context '
        'needed to respond. Please submit them at:', body),
    Paragraph('<b>Speaking:</b> telkganesan.com/connect?route=speaking', body),
    Paragraph('<b>Media:</b> telkganesan.com/connect?route=media', body),
    Spacer(1, 12),
    Paragraph('Additional biographical detail, photography and official credits are provided on request once cleared for release.', small),
]

doc = BaseDocTemplate(OUT, pagesize=letter, leftMargin=M, rightMargin=M, topMargin=1.55 * inch + 0.25 * inch, bottomMargin=0.9 * inch,
                      title='Tel K. Ganesan - Media and Speaking Press Kit', author='Tel K. Ganesan')
frame = Frame(M, 0.9 * inch, W - 2 * M, H - 1.55 * inch - 0.25 * inch - 0.9 * inch, id='f', leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)
doc.addPageTemplates([PageTemplate(id='p', frames=[frame], onPage=decorate)])
doc.build(story)
print('wrote', OUT, '(FINAL)' if FINAL else '(DRAFT)')
