// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';
import reportSource from './report.md?raw';

afterEach(cleanup);
const source = '# Example\n\n## Criteria\n\n- [ ] First criterion\n\n<script>alert(1)</script>\n\n![Example](assets/example.svg)';

it('resizes the sidebar with the keyboard, clamps its width and resets on double click', async () => {
  const user = userEvent.setup();
  render(<App source={source} />);
  const handle = screen.getByRole('separator', { name: 'Redimensionner la barre latérale' });
  handle.focus();
  await user.keyboard('{ArrowRight}');
  expect(handle.getAttribute('aria-valuenow')).toBe('310');
  expect(document.querySelector('.canvas-reader')?.getAttribute('style')).toContain('--sidebar-width: 310px');
  await user.keyboard('{Home}{ArrowLeft}');
  expect(handle.getAttribute('aria-valuenow')).toBe('240');
  await user.keyboard('{End}{ArrowRight}');
  expect(handle.getAttribute('aria-valuenow')).toBe(handle.getAttribute('aria-valuemax'));
  fireEvent.doubleClick(handle);
  expect(handle.getAttribute('aria-valuenow')).toBe('300');
});

it('allows temporary checkbox changes without changing the source and resets on source changes', async () => {
  const user = userEvent.setup();
  const { rerender } = render(<App source={source} />);
  const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
  expect(checkbox.checked).toBe(false);
  await user.click(checkbox);
  expect(checkbox.checked).toBe(true);
  expect(source).toContain('- [ ]');
  rerender(<App source={source + '\nUpdated'} />);
  expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(false);
});

it('sanitizes HTML and renders a bundled image with alternative text', () => {
  const { container } = render(<App source={source} />);
  expect(container.querySelector('script')).toBeNull();
  expect(screen.getByRole('img', { name: 'Example' }).getAttribute('src')).toBe('./assets/example.svg');
});

it('copies the exact original Markdown, not personal checkbox state', async () => {
  const user = userEvent.setup();
  const write = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
  render(<App source={source} />);
  await user.click(screen.getByRole('checkbox'));
  await user.click(screen.getByRole('button', { name: 'Copier la page' }));
  expect(write).toHaveBeenCalledWith(source);
});

it('exports the original Markdown and copies only the requested instruction', async () => {
  const user = userEvent.setup();
  const write = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
  const report = reportSource.replace(/```mermaid[\s\S]*?```/g, '');
  render(<App source={report} />);
  const exportLink = screen.getByRole('link', { name: 'Exporter le Markdown' });
  expect(decodeURIComponent(exportLink.getAttribute('href')!.split(',').slice(1).join(','))).toBe(report);
  expect(exportLink.getAttribute('download')).toBe('report.md');
  await user.click(screen.getByRole('button', { name: 'Copier les instructions' }));
  expect(write).toHaveBeenCalledWith('Exécute uniquement ARCH-01 : séparer les décisions de déplacement des interactions avec le moteur.');
});

it('keeps status details in the document, not in the sidebar', () => {
  const report = reportSource.replace(/```mermaid[\s\S]*?```/g, '');
  const { rerender } = render(<App source={report} />);
  const tracker = screen.getByRole('navigation', { name: 'Avancement des recommandations' });
  expect(tracker.textContent).not.toMatch(/À lancer|En cours|Terminé|Bloqué par/);
  expect(within(tracker).getAllByRole('link').map(link => link.textContent)).toEqual([
    'Séparer intention et physique', 'Unifier l’état au sol', 'Harmoniser les noms',
  ]);
  rerender(<App source={report.replace('| À lancer | Haute |', '| Terminé | Haute |')} />);
  expect(screen.queryByText('Bloqué par Séparer intention et physique')).toBeNull();
  expect(screen.getByLabelText('Avancement global').textContent).toBe('1 / 3 terminées');
});

it('shows short task titles without identifiers in the sidebar while preserving document anchors', () => {
  render(<App source={reportSource.replace(/```mermaid[\s\S]*?```/g, '')} />);
  const tracker = screen.getByRole('navigation', { name: 'Avancement des recommandations' });
  expect(tracker.textContent).not.toMatch(/ARCH-\d+/);
  for (const title of ['Séparer intention et physique', 'Unifier l’état au sol', 'Harmoniser les noms']) {
    expect(within(tracker).getByText(title, { exact: true })).toBeDefined();
  }
  expect(within(tracker).getAllByRole('link')[0].getAttribute('href')).toBe('#arch-01-separer-lintention-de-la-physique');
  const links = within(tracker).getAllByRole('link');
  expect(links[0].closest('li')?.querySelector(':scope > ul > li > a')).toBe(links[1]);
  expect(links[2].closest('ul')).toBe(links[0].closest('ul'));
});

it('collapses and expands the recommendation list using the keyboard', async () => {
  const user = userEvent.setup();
  render(<App source={reportSource.replace(/```mermaid[\s\S]*?```/g, '')} />);
  const toggle = screen.getByRole('button', { name: 'Recommandations' });
  toggle.focus();
  await user.keyboard('{Enter}');
  expect(toggle.getAttribute('aria-expanded')).toBe('false');
  expect(within(screen.getByRole('navigation', { name: 'Avancement des recommandations' })).queryAllByRole('link')).toHaveLength(0);
  await user.keyboard(' ');
  expect(toggle.getAttribute('aria-expanded')).toBe('true');
  expect(within(screen.getByRole('navigation', { name: 'Avancement des recommandations' })).getAllByRole('link')).toHaveLength(3);
});


it('ignores malformed URL fragments and keeps subsequent navigation working', () => {
  window.history.replaceState(null, '', '/#%');
  try {
    expect(() => render(<App source={source} />)).not.toThrow();
    expect(screen.getByRole('heading', { name: 'Criteria' })).toBeDefined();
    window.history.replaceState(null, '', '/#criteria');
    fireEvent(window, new HashChangeEvent('hashchange'));
    expect(screen.getByRole('heading', { name: 'Criteria' }).id).toBe('criteria');
  } finally {
    window.history.replaceState(null, '', '/');
  }
});


it('renders ID-only action headings and distinct anchors for reader-name collisions', async () => {
  const user = userEvent.setup();
  const write = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
  const source = '# Report\n\n| ID | Proposition | Statut | Dépendances |\n| --- | --- | --- | --- |\n| ARCH-01 | Example | À lancer | — |\n\n## ARCH-01\n\n```agent-action\nExecute ARCH-01\n```\n\n## Document';
  render(<App source={source} />);
  const tracker = screen.getByRole('navigation', { name: 'Avancement des recommandations' });
  expect(within(tracker).getByRole('link').getAttribute('href')).toBe('#arch-01');
  await user.click(screen.getByRole('button', { name: 'Copier les instructions' }));
  expect(write).toHaveBeenCalledWith('Execute ARCH-01');
  const toc = screen.getByRole('navigation', { name: 'Sommaire des chapitres' });
  expect(within(toc).getByRole('link', { name: 'Document' }).getAttribute('href')).toBe('#document-1');
  expect(document.getElementById('document-1')).toBe(screen.getByRole('heading', { name: 'Document' }));
  expect(document.querySelectorAll('#document')).toHaveLength(1);
});
