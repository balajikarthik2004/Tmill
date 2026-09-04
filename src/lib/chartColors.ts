/** Chart palette for the "Forest & Cream" theme.
 *  Earthy, cream-safe hues that stay distinguishable side by side and read
 *  calm against the paper canvas. Keep series colors in this order so the
 *  same category lands on the same hue across pages. */
export const chartPalette = [
  '#0f6e56', // emerald  — primary series
  '#b4632a', // copper   — comparison / target
  '#3a7d8c', // slate-teal
  '#7c4a6e', // plum
  '#4a6fa5', // dusty blue
  '#4a8a3c', // moss
] as const

/** Low-emphasis fill for "the rest of the bars" behind a highlighted one. */
export const chartMuted = '#93c3b2'
/** Neutral fallback when a category has no assigned color. */
export const chartNeutral = '#9aa39b'

/** Status hues, matched to the semantic tokens in index.css. */
export const chartStatus = {
  good: '#4a8a3c',
  warn: '#b4761a',
  bad: '#b23a2f',
  info: '#3a7d8c',
} as const

/** Cycles the palette so any number of series stays colored. */
export function chartColor(index: number) {
  return chartPalette[index % chartPalette.length]
}
