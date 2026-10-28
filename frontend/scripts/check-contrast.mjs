/**
 * Computes WCAG 2.x contrast ratios for the baseline palette combinations actually used in
 * tokens.css. Run: node scripts/check-contrast.mjs
 *
 * Exists because palette membership does not imply accessible text contrast - the developer
 * handoff calls this out explicitly, and the numbers in tokens.css are generated from here
 * rather than estimated.
 */

const toLinear = (channel) => {
  const c = channel / 255
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

const luminance = (hex) => {
  const h = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16))
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
}

export const contrastRatio = (fg, bg) => {
  const a = luminance(fg)
  const b = luminance(bg)
  const [hi, lo] = a > b ? [a, b] : [b, a]
  return (hi + 0.05) / (lo + 0.05)
}

const verdict = (r) => (r >= 7 ? 'AAA' : r >= 4.5 ? 'AA' : r >= 3 ? 'AA-large-only' : 'FAIL')

const COMBINATIONS = [
  ['Navy on Ivory (body on alt surface)', '#0A1A2B', '#F7F4EC', 'body'],
  ['Ink on White (body)', '#1B2430', '#FFFFFF', 'body'],
  ['Ivory on Navy (inverted body)', '#F7F4EC', '#0A1A2B', 'body'],
  ['Gold on Navy (accent text on dark)', '#C8A45B', '#0A1A2B', 'body'],
  ['Gold on Ivory (PROHIBITED as text)', '#C8A45B', '#F7F4EC', 'prohibited'],
  ['Blue on White', '#4E7898', '#FFFFFF', 'body'],
  ['Blue on Navy (decorative only)', '#4E7898', '#0A1A2B', 'large'],
  ['Link on White', '#2F5A7A', '#FFFFFF', 'body'],
  ['Link on Ivory', '#2F5A7A', '#F7F4EC', 'body'],
  ['Muted on White', '#4A5764', '#FFFFFF', 'body'],
  ['Muted on Ivory', '#4A5764', '#F7F4EC', 'body'],
  ['Error on error surface', '#8C2F22', '#FDF3F1', 'body'],
  ['Success on success surface', '#1F5D3F', '#F0F7F3', 'body'],
  ['Notice on notice surface', '#6B4C12', '#FBF5E8', 'body'],
]

let failures = 0
console.log('WCAG 2.x contrast - baseline palette\n')
for (const [name, fg, bg, role] of COMBINATIONS) {
  const r = contrastRatio(fg, bg)
  const v = verdict(r)
  // A combination declared for body text must reach AA (4.5:1).
  const bad = role === 'body' && r < 4.5
  if (bad) failures += 1
  const flag = role === 'prohibited' ? '(documented as prohibited)' : bad ? '<-- FAILS its declared role' : ''
  console.log(`${r.toFixed(2).padStart(6)}:1  ${v.padEnd(14)} ${name} ${flag}`)
}

console.log('')
if (failures > 0) {
  console.error(`${failures} combination(s) declared for body text fail AA.`)
  process.exit(1)
}
console.log('All combinations declared for body text meet WCAG AA.')
