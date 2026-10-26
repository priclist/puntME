// Inline stroke icons.

const PATHS = {
  pin: (
    <>
      <path d="M12 21s-7-6.1-7-11a7 7 0 0 1 14 0c0 4.9-7 11-7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  chevronDown: <path d="M6 9l6 6 6-6" />,
  chevronRight: <path d="M9 5l7 7-7 7" />,
  back: <path d="M15 5l-7 7 7 7" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </>
  ),
  arrowRight: <path d="M5 12h14M13 6l6 6-6 6" />,
  bookmark: <path d="M6 4h12v17l-6-4-6 4z" />,
  phone: <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />,
  chat: <path d="M4 20l1.3-4A8 8 0 1 1 8 18.7z" />,
  route: <path d="M21 3L3 10.5l7.5 3 3 7.5z" />,
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9s1.3-6.3 3.8-9z" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  share: (
    <>
      <path d="M12 3v12M7 8l5-5 5 5" />
      <path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
    </>
  ),
  external: <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />,
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M15.5 8.5l-2 5-5 2 2-5z" />
    </>
  ),
  sliders: (
    <>
      <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="10" cy="17" r="2" />
    </>
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  sparkle: <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6" />,
  drop: <path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" />,
  bolt: <path d="M13 3L5 14h6l-1 7 8-11h-6z" />,
  leaf: (
    <>
      <path d="M5 19c0-8 6-14 15-14 0 9-6 15-14 15" />
      <path d="M5 19l7-7" />
    </>
  ),
  roller: (
    <>
      <rect x="4" y="4" width="14" height="5" rx="1.5" />
      <path d="M18 6.5h2v5h-8v3" />
      <rect x="10.5" y="14.5" width="3" height="6" rx="1" />
    </>
  ),
  wrench: <path d="M15 4a4 4 0 0 0-3.9 5L4 16.1V20h3.9L15 12.9A4 4 0 0 0 20 9l-2.5 2.5-3-3L17 6a4 4 0 0 0-2-2z" />,
  user: (
    <>
      <circle cx="12" cy="8.5" r="3.8" />
      <path d="M4.5 20c1.3-3.6 4.2-5.4 7.5-5.4s6.2 1.8 7.5 5.4" />
    </>
  ),
  bell: (
    <>
      <path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15z" />
      <path d="M10 20.5a2.2 2.2 0 0 0 4 0" />
    </>
  ),
  store: (
    <>
      <path d="M4 9.5L5.5 4h13L20 9.5" />
      <path d="M4 9.5a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0" />
      <path d="M5.5 12.5V20h13v-7.5M10 20v-4.5h4V20" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  pencil: <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16zM13.5 6.5l4 4" />,
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  camera: (
    <>
      <path d="M4 8h3l1.5-2.5h7L17 8h3v11H4z" />
      <circle cx="12" cy="13" r="3.5" />
    </>
  ),
  trash: <path d="M4 7h16M10 7V4.5h4V7M6.5 7l1 13h9l1-13M10 11v5M14 11v5" />,
  logout: <path d="M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10" />,
  download: <path d="M12 4v11M7 10.5l5 5 5-5M5 20h14" />,
  send: <path d="M4 12l16-8-6 16-2.5-6.5z" />,
  mail: (
    <>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
      <path d="M4 7l8 6 8-6" />
    </>
  ),
  pause: <path d="M9 5v14M15 5v14" />,
  play: <path d="M7 4.5l12 7.5-12 7.5z" />,
  inbox: (
    <>
      <path d="M4 13l2.5-8h11L20 13v6H4z" />
      <path d="M4 13h4.5l1 2.5h5l1-2.5H20" />
    </>
  ),
  shareIos: (
    <>
      <path d="M12 3.5v11M8 7l4-3.5L16 7" />
      <path d="M8.5 10.5H6v10h12v-10h-2.5" />
    </>
  ),
  addSquare: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="4" />
      <path d="M12 8.5v7M8.5 12h7" />
    </>
  ),
}

export function Icon({ name, size = 20, filled = false, strokeWidth = 1.8, className = '' }) {
  if (name === 'dots') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
        <circle cx="6" cy="12" r="1.7" />
        <circle cx="12" cy="12" r="1.7" />
        <circle cx="18" cy="12" r="1.7" />
      </svg>
    )
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {PATHS[name]}
    </svg>
  )
}

export function Star({ size = 14, empty = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={empty ? 'var(--line)' : 'var(--star)'} aria-hidden="true">
      <path d="M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z" />
    </svg>
  )
}

// Marks a business its owner added to PuntMe.
export function PuntMeBadge({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label="On PuntMe" className="pm-onpuntme">
      <circle cx="12" cy="12" r="10" fill="currentColor" />
      <path d="M8 12.4l2.7 2.7L16.2 9.6" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Marks a real Google Business Profile listing (not demo data).
export function GoogleBadge({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label="Google Business listing" className="pm-verified">
      <path fill="currentColor" d="M12 2.5l7.5 3.2v5.4c0 4.7-3.2 8.9-7.5 10.4-4.3-1.5-7.5-5.7-7.5-10.4V5.7z" />
      <path d="M8.8 12.2l2.2 2.2 4.4-4.6" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
