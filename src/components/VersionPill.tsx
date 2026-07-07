/**
 * VersionPill — a small mono chip next to the Parikrama wordmark that
 * shows the semver + the CI build number. Lets users tell whether the
 * change they're expecting has actually shipped ("did today's push
 * land?"). Copies to clipboard on click for easy bug-report pasting.
 */

import { useState } from 'react'

// Bump on meaningful releases. The build number comes from CI
// (VITE_BUILD = github.run_number).
const VERSION = '0.3.0'

export function VersionPill() {
  const [copied, setCopied] = useState(false)
  const build = (import.meta as any).env?.VITE_BUILD as string | undefined
  const label = `v${VERSION}${build ? `·b${build}` : ''}`

  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(label)
          setCopied(true)
          window.setTimeout(() => setCopied(false), 1400)
        } catch {
          /* clipboard denied — silent */
        }
      }}
      aria-label={`App version ${label} — tap to copy`}
      className="mono"
      style={{
        color: copied ? 'var(--accent)' : 'var(--text-ghost)',
        fontSize: 9,
        letterSpacing: 0.6,
        padding: '2px 8px',
        borderRadius: 100,
        border: `1px solid ${copied ? 'var(--accent-line)' : 'var(--hairline)'}`,
        background: copied ? 'var(--accent-soft)' : 'transparent',
        cursor: 'copy',
        transition: 'color 200ms ease, border-color 200ms ease, background 200ms ease',
      }}
    >
      {copied ? 'copied' : label}
    </button>
  )
}
