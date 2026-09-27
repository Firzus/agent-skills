/** Theme tokens as CSS values. Use them in style props instead of literal colors. */
export const tokens = {
  background: 'var(--background)',
  foreground: 'var(--foreground)',
  card: 'var(--card)',
  muted: 'var(--muted)',
  mutedForeground: 'var(--muted-foreground)',
  border: 'var(--border)',
  primary: 'var(--primary)',
  primaryForeground: 'var(--primary-foreground)',
  positive: 'var(--positive)',
  warning: 'var(--warning)',
  negative: 'var(--negative)',
  fontMono: 'var(--font-mono)',
  radius: 'var(--radius)',
} as const;

export const series = [1, 2, 3, 4, 5, 6].map((n) => `var(--series-${n})`);

/** Stable color for the index-th series or category; cycles after six. */
export function seriesColor(index: number): string {
  return series[index % series.length];
}

/**
 * Resolves a token such as `tokens.primary` to its current computed color,
 * for APIs that cannot read CSS variables (HTML canvas, some chart libraries).
 */
export function resolveColor(value: string): string {
  const name = /^var\((--[\w-]+)\)$/.exec(value)?.[1];
  if (!name) return value;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
