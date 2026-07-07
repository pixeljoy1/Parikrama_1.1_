/**
 * StarRating — a Google Maps–style 5-star display driven by our editorial
 * `wow` score (1–10, converted to a 0–5 rating). Renders as an SVG so the
 * half-star partial fills are pixel-perfect at any size. Two variants:
 *
 *   • compact — inline row for place cards (small stars + number)
 *   • large   — hero-scale row for the place sheet (big stars, big number,
 *                editorial-source caption underneath)
 *
 * We are honest about the source: these are Parikrama editorial scores, not
 * crowd-sourced Google Maps reviews — the caption underneath the large
 * variant says so. That preserves the familiar visual language without
 * pretending we have data we don't.
 */

interface Props {
  /** rating in 0–5, half-star precision (rounded to nearest 0.5) */
  value: number
  /** 'compact' for cards, 'large' for the place sheet */
  size?: 'compact' | 'large'
}

const STAR = 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z'

export function StarRating({ value, size = 'compact' }: Props) {
  const rating = Math.max(0, Math.min(5, Math.round(value * 2) / 2))
  const large = size === 'large'
  const star = large ? 22 : 13
  const gap = large ? 3 : 2
  const numberSize = large ? 26 : 12
  const numberWeight = large ? 500 : 400

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: large ? 12 : 6,
        lineHeight: 1,
      }}
    >
      <span style={{ display: 'inline-flex', gap }} aria-label={`${rating} out of 5`}>
        {[0, 1, 2, 3, 4].map((i) => {
          // fill: 1 = full, 0.5 = half, 0 = empty
          const fill = Math.max(0, Math.min(1, rating - i))
          const clipId = `star-clip-${size}-${i}-${Math.round(fill * 10)}`
          return (
            <svg
              key={i}
              width={star}
              height={star}
              viewBox="0 0 24 24"
              style={{ display: 'block' }}
              aria-hidden
            >
              <defs>
                <clipPath id={clipId}>
                  <rect x="0" y="0" width={24 * fill} height="24" />
                </clipPath>
              </defs>
              {/* the empty outline underneath */}
              <path d={STAR} fill="none" stroke="var(--text-ghost)" strokeWidth="1.4" />
              {/* the marigold fill, clipped to the star's percentage */}
              {fill > 0 && (
                <g clipPath={`url(#${clipId})`}>
                  <path d={STAR} fill="var(--accent)" />
                </g>
              )}
            </svg>
          )
        })}
      </span>
      <span
        style={{
          fontFamily: large ? 'var(--serif)' : 'var(--sans)',
          fontSize: numberSize,
          fontWeight: numberWeight,
          color: large ? 'var(--text-primary)' : 'var(--text-secondary)',
          letterSpacing: large ? -0.4 : 0,
        }}
      >
        {rating.toFixed(1)}
      </span>
    </span>
  )
}
