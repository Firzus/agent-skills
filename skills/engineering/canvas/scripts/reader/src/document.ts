import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import { toString } from 'mdast-util-to-string';
import { visit } from 'unist-util-visit';

export type Task = { id: string; title: string; status: string; href: string; dependencies: string[] };
export type Heading = { id: string; text: string; depth: number; offset: number };
function recommendationId(text: string): string {
  return text.match(/^([A-Z]+-\d+)\b/)?.[1] ?? '';
}

export function parseDocument(source: string): { body: string; help: string; tasks: Task[]; headings: Heading[]; actions: Record<string, string> } {
  const parser = unified().use(remarkParse).use(remarkGfm);
  const sourceTree = parser.parse(source);
  let help = '';
  let withoutHelp = source;
  const helpStart = sourceTree.children.findIndex(node => node.type === 'html'
    && /^<details>\s*<summary>Comprendre les statuts<\/summary>/i.test(node.value));
  if (helpStart >= 0) {
    const opening = sourceTree.children[helpStart];
    let depth = 0;
    for (const node of sourceTree.children.slice(helpStart)) {
      if (node.type !== 'html') continue;
      for (const tag of node.value.matchAll(/<\/?details\b[^>]*>/gi)) {
        depth += tag[0].startsWith('</') ? -1 : 1;
        if (depth !== 0) continue;
        const start = opening.position!.start.offset!;
        const close = node.position!.start.offset! + tag.index!;
        const end = close + tag[0].length;
        help = source.slice(start, close).replace(/^<details>\s*<summary>Comprendre les statuts<\/summary>/i, '').trim();
        withoutHelp = source.slice(0, start) + source.slice(end);
        break;
      }
      if (depth === 0) break;
    }
  }
  const original = parser.parse(withoutHelp);
  const actions: Record<string, string> = {};
  const removals: [number, number][] = [];
  let currentId = '';
  for (const node of original.children) {
    if (node.type === 'heading') currentId = recommendationId(toString(node));
    if (node.type === 'code' && node.lang === 'agent-action' && currentId) {
      actions[currentId] = node.value.trim();
      removals.push([node.position!.start.offset!, node.position!.end.offset!]);
    }
  }
  let body = withoutHelp;
  for (const [start, end] of removals.reverse()) body = body.slice(0, start) + body.slice(end);
  const tree = parser.parse(body);
  const headings: Heading[] = [];
  const tasks: Task[] = [];
  const used = new Set(['root', 'document', 'canvas-sidebar', 'status-title']);
  visit(tree, 'heading', node => {
    const text = toString(node);
    const base = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
      .replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'section';
    let id = base;
    for (let n = 1; used.has(id); n++) id = `${base}-${n}`;
    used.add(id);
    headings.push({ id, text, depth: node.depth, offset: node.position!.start.offset! });
  });
  visit(tree, 'table', table => {
    const labels = table.children[0]?.children.map(cell => toString(cell).trim()) ?? [];
    if (!['ID', 'Proposition', 'Statut', 'Dépendances'].every(label => labels.includes(label))) return;
    for (const row of table.children.slice(1)) {
      const cell = (label: string) => row.children[labels.indexOf(label)];
      const value = (label: string) => cell(label) ? toString(cell(label)).trim() : '';
      const id = value('ID');
      if (!/^[A-Z]+-\d+$/.test(id) || tasks.some(task => task.id === id)) continue;
      const link = cell('ID').children.find(child => child.type === 'link');
      const heading = headings.find(item => recommendationId(item.text) === id);
      tasks.push({ id, title: value('Proposition'), status: value('Statut'),
        href: heading ? `#${heading.id}` : link?.type === 'link' && link.url.startsWith('#') ? link.url : '#document',
        dependencies: value('Dépendances').match(/[A-Z]+-\d+/g) ?? [] });
    }
  });
  return { body, help, tasks, headings, actions };
}
export function unresolvedDependencies(task: Task, tasks: Task[]) {
  return task.dependencies.filter(id => tasks.find(candidate => candidate.id === id)?.status !== 'Terminé');
}
export function safeImageUrl(url: string): string | undefined {
  const relative = url.replace(/^\.\//, '');
  if (!/^assets\/[a-zA-Z0-9_./-]+\.(png|jpe?g|webp|gif|avif|svg)$/i.test(relative)) return;
  if (relative.split('/').some(part => part === '..' || part === '.')) return;
  return `./${relative}`;
}
