// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { Diagram } from './Diagram';

const renderDiagram = vi.hoisted(() => vi.fn());
vi.mock('mermaid', () => ({ default: { initialize: vi.fn(), render: renderDiagram } }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it('sanitizes active SVG while keeping diagram labels', async () => {
  renderDiagram.mockResolvedValue({ svg: '<svg><text>Visible label</text><script>alert(1)</script><image href="https://evil.test/a"/></svg>' });
  const { container } = render(<Diagram source={'flowchart LR\nA-->B'} />);
  await waitFor(() => expect(container.querySelector('svg text')?.textContent).toBe('Visible label'));
  expect(container.querySelector('script,image')).toBeNull();
});

it('exposes invalid source without preventing a second diagram from rendering', async () => {
  renderDiagram.mockRejectedValueOnce(new Error('Invalid diagram')).mockResolvedValueOnce({ svg: '<svg><text>Valid diagram</text></svg>' });
  const { container } = render(<><Diagram source="invalid" /><Diagram source={'flowchart LR\nA-->B'} /></>);
  await screen.findByRole('alert');
  await waitFor(() => expect(container.querySelector('svg text')?.textContent).toBe('Valid diagram'));
  expect(container.querySelector('details[open] code')?.textContent).toBe('invalid');
});

it('rejects inline Mermaid configuration before rendering', async () => {
  render(<Diagram source={'%%{init: {securityLevel: "loose"}}%%\nflowchart LR\nA-->B'} />);
  await screen.findByRole('alert');
  expect(renderDiagram).not.toHaveBeenCalled();
});
