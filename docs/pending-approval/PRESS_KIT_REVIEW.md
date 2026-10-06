# Press kit: source checklist

The PDF (`public/downloads/tel-k-ganesan-press-kit.pdf`) and the Media & Speaking web page are both built
from one file, `src/frontend/data/press-kit.json`. Approval and edits: see `PRESS_KIT_APPROVAL_RECORD.md`.

Regenerate the PDF with `python scripts/generate-press-kit.py` (add `--draft` for a watermarked copy).

## Where each line comes from

| Section | Source |
|---|---|
| Headline "From Trap to Triumph" and supporting line | Approved by Tel K. Ganesan, 6 Oct 2026 |
| Short bio (about 50 words) | Written by Tel K. Ganesan in the 6 Oct 2026 approval |
| Full bio, paragraph 1 | About page hero, with Tel's two edits ("Based in Metro Detroit", "cornerstone") |
| Full bio, paragraph 2 | About page, "Operating point of view" |
| Operating principles (5) | About page principles (ABOUT-04) |
| Speaking themes (3) and intro | Media & Speaking page topics; intro reworded per Tel ("Practical ideas") |
| Formats | Wording approved by Tel (Speaking and Media lines) |
| Headquarters line | Website footer |
| Platforms: Kyyba, Mind Trap, Kyyba Films, Community impact | Home, Ideas and Impact pages (Kyyba card shortened per Tel) |
| Official destinations and profiles | Website footer and existing site links (to be confirmed in the go-live link check) |
| Inquiry routes | `/connect?route=speaking` and `/connect?route=media` (Tel's direct email is never published) |

## Held back until documented

- Audience and takeaway lines under each theme (awaiting Tel's sign-off)
- Response-time line (number to be agreed with June and Friday)
- Awards and honours (`docs/LEGACY_AWARDS_INVENTORY.csv`), company figures, film credits, headshots and a speaking clip
