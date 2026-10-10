import type { Pattern } from './pattern'

const f = (v: number) => (Math.round(v * 100) / 100).toString()
const path = (pts: readonly (readonly [number, number])[], dx = 0) => `M${pts.map((p) => `${f(p[0] + dx)} ${f(p[1])}`).join('L')}Z`

/**
 * Inner markup of the flat (unwrapped) pattern. x runs around the lamp, y up the wall; the left and
 * right edges are the same seam, so every opening is drawn once shifted by -width, 0 and +width.
 */
export function patternBody(pat: Pattern, opts: { cells?: boolean; seeds?: boolean } = {}): string {
  const w = pat.profile.width
  const h = pat.profile.height
  const flip = (y: number) => h - y // SVG y points down; the lamp's top should be up
  const fl = (pts: readonly (readonly [number, number])[]) => pts.map((p): [number, number] => [p[0], flip(p[1])])
  let s = ''
  if (opts.cells) {
    s += `<g fill="none" stroke="currentColor" stroke-opacity=".28" stroke-width=".5">`
    for (const c of pat.cells) if (c.length > 2) s += `<path d="${path(fl(c))}"/>`
    s += `</g>`
  }
  s += `<g class="holes">`
  for (const hole of pat.holes) {
    const o = fl(hole.outline)
    for (const dx of [-w, 0, w]) s += `<path d="${path(o, dx)}"/>`
  }
  s += `</g>`
  if (opts.seeds) {
    s += `<g fill="currentColor" fill-opacity=".6">`
    for (const [x, y] of pat.seeds) s += `<circle cx="${f(x)}" cy="${f(flip(y))}" r="1"/>`
    s += `</g>`
  }
  return s
}

/** Standalone SVG file of the flat pattern, in millimetres (openings are cut-outs, for laser or vinyl templates). */
export function patternSvg(pat: Pattern): string {
  const w = pat.profile.width
  const h = pat.profile.height
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" width="${f(w)}mm" height="${f(h)}mm" viewBox="0 0 ${f(w)} ${f(h)}">\n` +
    `<rect width="${f(w)}" height="${f(h)}" fill="#fff" stroke="#000" stroke-width=".4"/>\n` +
    `<g fill="#000" fill-opacity=".85" stroke="none">${patternBody(pat)}</g>\n</svg>\n`
  )
}
