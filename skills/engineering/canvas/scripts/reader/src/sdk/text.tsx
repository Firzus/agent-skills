import type { CSSProperties, ReactNode } from 'react';

export function H1({ children }: { children: ReactNode }) { return <h1 className="canvas-h1">{children}</h1>; }
export function H2({ children }: { children: ReactNode }) { return <h2 className="canvas-h2">{children}</h2>; }
export function H3({ children }: { children: ReactNode }) { return <h3 className="canvas-h3">{children}</h3>; }

/** Body text. `muted` is for secondary context only, never essential values. */
export function Text({ muted = false, small = false, weight = 400, style, children }: {
  muted?: boolean; small?: boolean; weight?: 400 | 500; style?: CSSProperties; children: ReactNode;
}) {
  return (
    <p style={{ margin: 0, fontSize: small ? 12 : 14, fontWeight: weight, color: muted ? 'var(--muted-foreground)' : undefined, ...style }}>
      {children}
    </p>
  );
}

export function Code({ children }: { children: ReactNode }) { return <code className="canvas-code">{children}</code>; }

export function CodeBlock({ code }: { code: string }) { return <pre className="canvas-pre"><code>{code}</code></pre>; }
