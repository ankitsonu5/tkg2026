# Press kit: approval record

**Approved by:** Tel K. Ganesan, by email reply to Sakshi Singh, 6 October 2026, 17:17
(cc June, Ankit Srivastava, Friday). Wording: "Please keep this reply as the approval record, subject to the edits below."

Status: **approved subject to edits.** Items marked HELD must not be published until the stated condition is met.

## Copy edits

| # | Tel's instruction | Status |
|---|---|---|
| 1 | Headline "From Trap to Triumph" at the top of the page and on the PDF cover, with "Tel K. Ganesan builds enterprises, leaders, and platforms that turn possibility into lasting value." directly beneath | Done (web and PDF) |
| 2 | Bio: "From Detroit, he has built..." becomes "Based in Metro Detroit, he has built..." | Done |
| 3 | Bio: "Kyyba remains the cornerstone of his enterprise-building journey."; shorten the Kyyba card so the line does not repeat | Done (card now reads "Uniting technology, talent and innovation to create real-world value.") |
| 4 | Add the approved ~50-word short bio for MCs, hosts and producers | Done |
| 5 | "Speaking Themes"; "Practical ideas..." | Done |
| 6 | Formats split into Speaking and Media lines | Done |
| 7 | One audience line and one takeaway line under each speaking theme, **new lines sent to Tel for sign-off** | Done. Final lines (below) added to the page and the PDF. Confirm they are the signed-off wording |
| 8 | Response-time line under the inquiry routes ("Requests are reviewed within [number] business days"), number agreed with June and Friday and confirmed to Tel before go-live | **PLACEHOLDER.** The review PDF shows "[X]". The website and the publishable PDF show no response-time line until the number is agreed (`responseTime` in `press-kit.json`) |

## Design edits

| Instruction | Status |
|---|---|
| "From Trap to Triumph" as the largest type, Golden Leaf on Deep Midnight Blue | Done |
| Locked colours Deep Midnight Blue #000033 and Golden Leaf #E6B904; Golden Leaf on dark backgrounds only | Done on the Media & Speaking page and the PDF (see note 1) |
| All four platform cards kept together; PDF tightened to 2 pages | Done |
| Every link clickable; no DRAFT watermark or footer on the published version | Done (10 clickable links in the PDF) |

## Web page order (as approved)

Hero (headline, supporting line, "Book Tel to Speak" and "Media Request") > Speaking Themes > Formats > Short and full bio (with copy buttons) > Operating Principles > Platforms > Press kit PDF download > Official destinations > Inquiry routes. Implemented in `src/frontend/components/MediaPage.tsx`.

## Speaking theme lines (edit 7)

| Theme | Audience | Takeaway |
|---|---|---|
| Building possibility | Founders and leaders turning an idea into a working structure. | How to move from possibility to a system that can carry growth. |
| Leadership under complexity | Leaders and teams making decisions in uncertain conditions. | How clarity, ownership, and judgment help move work forward when the path is not obvious. |
| Enterprise meets culture | Builders, executives, and creative leaders working across business, media, and culture. | What story, audience awareness, and creative risk can teach enterprise leaders. |

Stored in `src/frontend/data/press-kit.json`, so the web page and the PDF always match.

## Two PDFs

| File | Use |
|---|---|
| `docs/pending-approval/Tel-K-Ganesan-Press-Kit-for-review.pdf` | Sent to Tel for sign-off. Shows the response-time placeholder "[X]". Never published. |
| `public/downloads/tel-k-ganesan-press-kit.pdf` | The file behind the website download button. No placeholder, no response-time line until the number is agreed. |

Regenerate with `python scripts/generate-press-kit.py --review` and `python scripts/generate-press-kit.py`.

## Go-live checks (owner: Ankit)

- [ ] Open and confirm every link, including IMDb and all social profiles (checked 6 Oct: all 8 external links respond; the two inquiry-route links return 404 on the current public site and work only once the new site is live, so do not circulate the PDF before go-live)
- [ ] One test submission through each route reaches the right owner
- [ ] Review the page on mobile
- [ ] Confirm with Legal whether a separate sign-off is needed; if it is, hold go-live until we have it
- [ ] Send Tel the staging link and the 2-page PDF for a final look
- [ ] Response-time number agreed with June and Friday and confirmed to Tel

## Notes and open decisions

1. **Brand colours.** The rest of the site still uses the earlier palette (#0A1A2B navy, #C8A45B gold). The locked #000033 / #E6B904 pair is applied to this page and the PDF only. Applying it site-wide needs Tel's decision.
2. **About page wording.** The About page still says "From Detroit" and "flagship proof of his operating journey". Tel's edits 2 and 3 were approved for the press kit; confirm whether the About page should match.
3. **Photographs.** The earlier photos on the Media page were removed to follow the approved page order, and photos stay out until approved headshots (three crops, with credits) are cleared.
4. **Next additions (as documents clear):** approved headshots, a short speaking clip, a media appearances list, film credits matched to IMDb, then awards and company figures.
