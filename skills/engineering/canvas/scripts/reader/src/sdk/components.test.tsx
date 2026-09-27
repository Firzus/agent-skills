// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { Table } from './Table';
import { seriesColor } from './tokens';
afterEach(cleanup);
it('renders data as text, with captions and custom cells', () => {
  render(<Table caption="Observed results" rows={[{ name: '<script>alert(1)</script>', value: 2 }]} columns={[
    { key: 'name', header: 'Name' },
    { key: 'value', header: 'Value', align: 'end', render: row => `${row.value} m` },
  ]} />);
  expect(screen.getByRole('table').querySelector('script')).toBeNull();
  expect(screen.getByText('<script>alert(1)</script>')).toBeTruthy();
  expect(screen.getByText('2 m')).toBeTruthy();
  expect(screen.getByText('Observed results')).toBeTruthy();
});
it('cycles theme-aware series colors', () => {
  expect(seriesColor(6)).toBe(seriesColor(0));
});
