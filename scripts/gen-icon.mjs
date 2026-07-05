/**
 * Generates the Parikrama app icon + splash assets (for @capacitor/assets)
 * from SVG, in the app's own language: warm ink ground, marigold parikrama
 * rings (the 5/10/20/30 km circles), a peacock north tick, and the traveler
 * glowing at the center.
 * Output → ./assets (consumed by `npx @capacitor/assets generate`)
 *        + ./public/favicon.png for the web build.
 */
import sharp from 'sharp'
import { mkdirSync } from 'node:fs'

mkdirSync('assets', { recursive: true })
mkdirSync('public', { recursive: true })

const bg = (s) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <defs>
    <radialGradient id="bg" cx="46%" cy="38%" r="95%">
      <stop offset="0%" stop-color="#2A211A"/>
      <stop offset="55%" stop-color="#1B1510"/>
      <stop offset="100%" stop-color="#0F0B08"/>
    </radialGradient>
  </defs>
  <rect width="${s}" height="${s}" fill="url(#bg)"/>
</svg>`

// parikrama mark — four rings scaled like the app's radar (sqrt distances),
// a north tick in peacock, and a glowing marigold center; sized to `d`
// (outer diameter) on an s×s canvas
const mark = (s, d) => {
  const c = s / 2
  const R = d / 2
  const rings = [5, 10, 20, 30].map((km, i) => ({
    r: R * Math.sqrt(km / 30),
    w: R * (0.052 - i * 0.008),
    o: 0.95 - i * 0.22,
  }))
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
  <defs>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#F3A263" stop-opacity="0.55"/>
      <stop offset="70%" stop-color="#F3A263" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="core" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FFE8CF"/>
      <stop offset="100%" stop-color="#E8813F"/>
    </linearGradient>
  </defs>
  <circle cx="${c}" cy="${c}" r="${R * 0.55}" fill="url(#glow)"/>
  ${rings
    .map(
      (g) =>
        `<circle cx="${c}" cy="${c}" r="${g.r}" fill="none" stroke="#E8813F" stroke-width="${g.w}" stroke-opacity="${g.o}"/>`,
    )
    .join('\n  ')}
  <line x1="${c}" y1="${c - R}" x2="${c}" y2="${c - R * 0.86}" stroke="#3FB3AC" stroke-width="${R * 0.05}" stroke-linecap="round"/>
  <circle cx="${c}" cy="${c}" r="${R * 0.13}" fill="url(#core)"/>
</svg>`
}

const png = (svg) => sharp(Buffer.from(svg)).png()

// icons (1024)
await png(bg(1024)).toFile('assets/icon-background.png')
await png(mark(1024, 470)).toFile('assets/icon-foreground.png')
await sharp(Buffer.from(bg(1024)))
  .composite([{ input: await png(mark(1024, 560)).toBuffer() }])
  .png()
  .toFile('assets/icon-only.png')

// web favicon (256)
await sharp(Buffer.from(bg(256)))
  .composite([{ input: await png(mark(256, 168)).toBuffer() }])
  .png()
  .toFile('public/favicon.png')

// splashes (2732) — ground + centered mark
const splash = await sharp(Buffer.from(bg(2732)))
  .composite([{ input: await png(mark(2732, 900)).toBuffer() }])
  .png()
  .toBuffer()
await sharp(splash).toFile('assets/splash.png')
await sharp(splash).toFile('assets/splash-dark.png')

console.log('[icon] generated Parikrama rings icon + splash into ./assets + public/favicon.png')
