import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseDocument, unresolvedDependencies, safeImageUrl } from './document';

const source = readFileSync(new URL('./report.md', import.meta.url), 'utf8');

describe('Markdown document contract', () => {
  it('derives the tracker, stable French anchors, action and help from the source', () => {
    const doc = parseDocument(source);
    expect(doc.tasks).toHaveLength(3);
    expect(doc.tasks[0].status).toBe('À lancer');
    expect(doc.tasks[0].href).toBe('#arch-01-separer-lintention-de-la-physique');
    expect(doc.headings.some(h => h.id === doc.tasks[0].href.slice(1))).toBe(true);
    expect(doc.actions['ARCH-01']).toMatch(/^Exécute uniquement ARCH-01/);
    expect(doc.body).not.toContain('```agent-action');
    expect(doc.body).not.toContain('Comprendre les statuts');
    expect(doc.help).toContain('les vérifications');
  });
  it('removes only completed blockers, preserves unknown blockers and source dependencies', () => {
    const tasks = parseDocument(source).tasks;
    expect(unresolvedDependencies(tasks[1], tasks)).toEqual(['ARCH-01']);
    tasks[0].status = 'Terminé';
    expect(unresolvedDependencies(tasks[1], tasks)).toEqual([]);
    expect(tasks[1].dependencies).toEqual(['ARCH-01']);
    tasks[1].dependencies.push('ARCH-99');
    expect(unresolvedDependencies(tasks[1], tasks)).toEqual(['ARCH-99']);
    tasks[0].status = 'En cours';
    expect(unresolvedDependencies(tasks[1], tasks)).toEqual(['ARCH-01', 'ARCH-99']);
  });
  it('handles duplicate headings and ordinary documents without invented tasks', () => {
    const doc = parseDocument('# Title\n\n## Same\n\n## Same');
    expect(doc.tasks).toEqual([]);
    expect(doc.headings.map(h => h.id)).toEqual(['title', 'same', 'same-1']);
  });
  it('accepts bundled images but rejects external tracking, executable and traversal URLs', () => {
    expect(safeImageUrl('assets/example.png')).toBe('./assets/example.png');
    for (const url of ['https://evil.test/a.png', '//evil.test/a', 'javascript:alert(1)', '../secret', 'assets/../secret', 'assets/%2e%2e/secret', 'data:image/svg+xml,<svg/>']) {
      expect(safeImageUrl(url)).toBeUndefined();
    }
  });
});


it('preserves help examples inside fenced code while extracting the actual help', () => {
  const example = '<details><summary>Comprendre les statuts</summary>Example</details>';
  const code = '```html\n' + example + '\n```';
  const source = '# Report\n\n' + code + '\n\n<details>\n<summary>Comprendre les statuts</summary>\n\nReal help\n\n</details>';
  const doc = parseDocument(source);
  expect(doc.body).toContain(code);
  expect(doc.help).toBe('Real help');
  expect(parseDocument(code).help).toBe('');
});


it('keeps an unclosed help section in the document', () => {
  const source = '<details>\n<summary>Comprendre les statuts</summary>\n\nUnclosed help';
  expect(parseDocument(source).body).toBe(source);
  expect(parseDocument(source).help).toBe('');
});

it('preserves nested help details and ignores a closing tag shown as code', () => {
  const help = '```html\n</details>\n```\n\n<details><summary>More</summary>Nested</details>';
  const source = '<details>\n<summary>Comprendre les statuts</summary>\n\n' + help + '\n\n</details>\n\n## Remaining';
  const doc = parseDocument(source);
  expect(doc.help).toBe(help);
  expect(doc.body.trim()).toBe('## Remaining');
});


it('links an ID-only recommendation heading to its action', () => {
  const source = '| ID | Proposition | Statut | Dépendances |\n| --- | --- | --- | --- |\n| ARCH-01 | Example | À lancer | — |\n\n## ARCH-01\n\n```agent-action\nExecute ARCH-01\n```';
  const doc = parseDocument(source);
  expect(doc.tasks[0].href).toBe('#arch-01');
  expect(doc.actions['ARCH-01']).toBe('Execute ARCH-01');
});

it('reserves reader element IDs when generating heading anchors', () => {
  const doc = parseDocument('# Document\n\n## Canvas sidebar\n\n## Status title\n\n## Root\n\n## Document');
  expect(doc.headings.map(h => h.id)).toEqual(['document-1', 'canvas-sidebar-1', 'status-title-1', 'root-1', 'document-2']);
});
