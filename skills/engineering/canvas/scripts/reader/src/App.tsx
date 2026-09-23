import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { parseDocument } from './document';
import { Markdown } from './Markdown';
import { CopyButton } from './CopyButton';
import { TaskTracker } from './TaskTracker';
import { SidebarResizer, useSidebarWidth } from './SidebarResizer';

export function App({ source }: { source: string }) {
  const sidebar = useSidebarWidth();
  const doc = useMemo(() => parseDocument(source), [source]);
  const dialog = useRef<HTMLDialogElement>(null);
  const [active, setActive] = useState(window.location.hash.slice(1));
  const [chapter, setChapter] = useState('');
  useEffect(() => {
    document.title = `${doc.headings.find(h => h.depth === 1)?.text ?? 'Document'} — Canvas`;
    const navigate = () => {
      let id = '';
      try { id = decodeURIComponent(window.location.hash.slice(1)); }
      catch { /* A malformed external fragment must not prevent reading the document. */ }
      setActive(id);
      document.getElementById(id)?.scrollIntoView?.({ block: 'start' });
    };
    const track = () => {
      const above = doc.headings.filter(h => (document.getElementById(h.id)?.getBoundingClientRect().top ?? Infinity) <= 120);
      const section = above.filter(h => h.depth === 2).at(-1);
      if (section) setChapter(section.id);
      const task = above.filter(h => doc.tasks.some(t => t.href === `#${h.id}`)).at(-1);
      if (task) setActive(task.id);
    };
    navigate();
    window.addEventListener('hashchange', navigate);
    window.addEventListener('scroll', track, { passive: true });
    return () => { window.removeEventListener('hashchange', navigate); window.removeEventListener('scroll', track); };
  }, [doc]);
  return <div className="canvas-reader" style={{ '--sidebar-width': `${sidebar.width}px` } as CSSProperties}>
    <a className="skip-link" href="#document">Aller au document</a>
    <aside id="canvas-sidebar" className="sidebar flex flex-col">
      <SidebarResizer {...sidebar} />
      <a href="#document" className="brand">Canvas</a>
      <TaskTracker tasks={doc.tasks} active={active} />
      <div className="sidebar-actions flex items-center gap-3 mt-auto">
        <a className="export flex-1 text-center rounded-full" href={`data:text/markdown;charset=utf-8,${encodeURIComponent(source)}`} download="report.md" aria-label="Exporter le Markdown">Exporter</a>
        {doc.help && <button className="help-button rounded-full" aria-label="Comprendre les statuts" onClick={() => dialog.current?.showModal()}>?</button>}
      </div>
    </aside>
    <div className="document-layout">
      <main id="document" className="min-w-0">
        <article className="prose prose-invert max-w-none">
          <Markdown key={source} source={doc.body} headings={doc.headings} tasks={doc.tasks} actions={doc.actions} />
        </article>
      </main>
      <aside className="tocrail">
        <nav aria-label="Sommaire des chapitres" className="flex flex-col gap-3">
          {doc.headings.filter(h => h.depth === 2).map(h => <a key={h.id} href={`#${h.id}`} className={chapter === h.id ? 'current' : ''}>{h.text}</a>)}
        </nav>
        <div className="copy-page"><CopyButton text={source} label="Copier la page" icon className="w-full flex items-center gap-3 text-left rounded px-3 py-2" /></div>
      </aside>
    </div>
    {doc.help && <dialog ref={dialog} aria-labelledby="status-title" className="status-dialog" onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      <div className="dialog-content"><div className="flex items-center justify-between gap-6 mb-6"><h2 id="status-title">Comprendre les statuts</h2><button onClick={() => dialog.current?.close()}>Fermer</button></div>
        <div className="prose prose-invert"><Markdown source={doc.help} /></div>
      </div>
    </dialog>}
  </div>;
}
