import type { CSSProperties, ReactNode } from 'react';

export type Tone = 'neutral' | 'primary' | 'positive' | 'warning' | 'negative';

const toneColor: Record<Tone, string> = {
  neutral: 'var(--muted-foreground)',
  primary: 'var(--primary)',
  positive: 'var(--positive)',
  warning: 'var(--warning)',
  negative: 'var(--negative)',
};

/** Bounded surface. Mix cards with open sections rather than wrapping everything. */
export function Card({ title, trailing, padding = 16, style, children }: {
  title?: ReactNode; trailing?: ReactNode; padding?: number; style?: CSSProperties; children: ReactNode;
}) {
  return (
    <section className="canvas-card" style={style}>
      {(title || trailing) && (
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
          <h3 className="canvas-h3">{title}</h3>
          {trailing}
        </header>
      )}
      <div style={{ padding }}>{children}</div>
    </section>
  );
}

export function Divider() { return <hr className="canvas-divider" />; }

/** Compact status or category label. */
export function Pill({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  const color = toneColor[tone];
  return (
    <span className="canvas-pill" style={tone === 'neutral' ? undefined : { color, borderColor: `color-mix(in srgb, ${color} 45%, transparent)` }}>
      {children}
    </span>
  );
}

/** Highlighted note: one per important point, not decoration. */
export function Callout({ tone = 'primary', title, children }: { tone?: Tone; title?: ReactNode; children: ReactNode }) {
  return (
    <aside role="note" style={{ borderLeft: `2px solid ${toneColor[tone]}`, background: 'var(--muted)', borderRadius: 'var(--radius)', padding: '10px 14px' }}>
      {title && <p style={{ margin: '0 0 4px', fontWeight: 500 }}>{title}</p>}
      <div>{children}</div>
    </aside>
  );
}

/** One headline number with its label and at most one context line. */
export function Stat({ label, value, detail, tone = 'neutral' }: {
  label: ReactNode; value: ReactNode; detail?: ReactNode; tone?: Tone;
}) {
  return (
    <div className="canvas-card" style={{ padding: '12px 16px' }}>
      <p style={{ margin: 0, fontSize: 12, color: 'var(--muted-foreground)' }}>{label}</p>
      <p style={{ margin: '2px 0 0', fontSize: 22, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{value}</p>
      {detail && <p style={{ margin: '2px 0 0', fontSize: 12, color: tone === 'neutral' ? 'var(--muted-foreground)' : toneColor[tone] }}>{detail}</p>}
    </div>
  );
}
