// @vitest-environment jsdom
import { expect, it, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import Demo from './example.canvas';
afterEach(cleanup);
it('updates the simulated distance from the speed input', () => {
  render(<Demo />);
  expect(screen.getByLabelText('Distance after 10 seconds').textContent).toBe('50 m');
  fireEvent.change(screen.getByLabelText('Speed (m/s)'), { target: { value: '8' } });
  expect(screen.getByLabelText('Distance after 10 seconds').textContent).toBe('80 m');
});
