"use client";

const LINKS = [
  ['/', 'Home'],
  ['/vote', 'Vote'],
] as const;

export default function Nav() {
  return (
    <nav style={{ display: 'flex', gap: '1.25rem' }}>
      {LINKS.map(([href, label]) => (
        <a
          key={href}
          href={href}
          style={{
            color: '#b8a87a',
            textDecoration: 'none',
            fontSize: '0.7rem',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            transition: 'color 0.15s',
          }}
          onMouseOver={e => (e.currentTarget.style.color = '#f5c518')}
          onMouseOut={e => (e.currentTarget.style.color = '#b8a87a')}
        >
          {label}
        </a>
      ))}
    </nav>
  );
}