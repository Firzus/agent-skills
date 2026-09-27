import type { CSSProperties, ReactNode } from 'react';

type Align = 'start' | 'center' | 'end' | 'stretch' | 'baseline';
type Justify = 'start' | 'center' | 'end' | 'between';

const justifyValue: Record<Justify, CSSProperties['justifyContent']> = {
  start: 'flex-start', center: 'center', end: 'flex-end', between: 'space-between',
};

/** Top-level container: readable width, title, and a source or date line. */
export function Page({ title, subtitle, children }: { title?: string; subtitle?: ReactNode; children: ReactNode }) {
  return (
    <main className="canvas-page">
      {(title || subtitle) && (
        <header style={{ marginBottom: 28 }}>
          {title && <h1 className="canvas-h1">{title}</h1>}
          {subtitle && <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--muted-foreground)' }}>{subtitle}</p>}
        </header>
      )}
      <Stack gap={8}>{children}</Stack>
    </main>
  );
}

/** Vertical flow. `gap` counts 4px steps. */
export function Stack({ gap = 4, align = 'stretch', style, children }: {
  gap?: number; align?: Align; style?: CSSProperties; children: ReactNode;
}) {
  return <div style={{ display: 'flex', flexDirection: 'column', gap: gap * 4, alignItems: align, ...style }}>{children}</div>;
}

/** Horizontal group that wraps when narrow. `gap` counts 4px steps. */
export function Row({ gap = 3, align = 'center', justify = 'start', wrap = true, style, children }: {
  gap?: number; align?: Align; justify?: Justify; wrap?: boolean; style?: CSSProperties; children: ReactNode;
}) {
  return (
    <div style={{ display: 'flex', gap: gap * 4, alignItems: align, justifyContent: justifyValue[justify], flexWrap: wrap ? 'wrap' : 'nowrap', ...style }}>
      {children}
    </div>
  );
}

/** Responsive grid: fixed `columns`, or as many columns of at least `min` px as fit. */
export function Grid({ columns, min = 220, gap = 4, style, children }: {
  columns?: number; min?: number; gap?: number; style?: CSSProperties; children: ReactNode;
}) {
  const template = columns ? `repeat(${columns}, minmax(0, 1fr))` : `repeat(auto-fit, minmax(min(${min}px, 100%), 1fr))`;
  return <div style={{ display: 'grid', gridTemplateColumns: template, gap: gap * 4, ...style }}>{children}</div>;
}
