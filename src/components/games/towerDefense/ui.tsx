import type * as React from 'react'

export function StatPill({ label, val, color }: { label: string; val: number; color: string }) {
  return (
    <div className="defense-stat" style={{ '--stat-color': color } as React.CSSProperties}>
      <span className="defense-stat__label">{label}</span>
      <span className="defense-stat__value">{val.toLocaleString()}</span>
    </div>
  )
}

export function btnStyle(bg: string, color: string, bold = false): React.CSSProperties {
  const primary = bg === '#18e6c4' || bg === '#194a34'
  return {
    ...(primary ? {
      '--control-top': '#f8cf83',
      '--control-bottom': '#d69b43',
      '--control-border': '#ffe2a9',
      '--control-ink': '#ffe3b5',
    } : {}),
    '--control-accent': color === '#000' ? '#73e5ee' : color,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: '6px 12px',
    fontWeight: bold ? 800 : 600,
    fontSize: '0.76rem',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  } as React.CSSProperties
}
