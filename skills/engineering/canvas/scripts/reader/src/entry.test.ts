import { expect, it } from 'vitest';
import entry from './main.tsx?raw';

it('starts without a theme, layout, or component-library stylesheet', () => {
  expect(entry).not.toMatch(/import\s+['"].*\.css['"]/);
  expect(entry).not.toContain('canvas-sdk');
});
