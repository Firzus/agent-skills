import { useEffect, useId, useRef, useState } from 'react';
import DOMPurify from 'dompurify';
import { CopyButton } from './CopyButton';

let queue = Promise.resolve();

export function Diagram({ source }: { source: string }) {
  const id = `diagram-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const target = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setError(false);
    const render = async () => {
      if (cancelled) return;
      try {
        if (source.length > 20000 || /%%\s*\{|^\s*---|\bclick\s|<\s*(?:img|image)\b|@\{[^}]*img\s*:/im.test(source)) {
          throw new Error('Unsupported diagram configuration or active content');
        }
        const { default: mermaid } = await import('mermaid');
        mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: 'base', htmlLabels: false,
          maxTextSize: 20000, maxEdges: 300, flowchart: { htmlLabels: false },
          themeVariables: { darkMode: true, background: '#14120b', primaryColor: '#1b1913', secondaryColor: '#201e18', tertiaryColor: '#1b1913', primaryBorderColor: '#eb5600', primaryTextColor: '#edecec', lineColor: '#969592', textColor: '#edecec' } });
        if (cancelled) return;
        const { svg } = await mermaid.render(id, source);
        if (!cancelled && target.current) {
          target.current.innerHTML = DOMPurify.sanitize(svg, {
            USE_PROFILES: { svg: true, svgFilters: true },
            FORBID_TAGS: ['a', 'image', 'foreignObject', 'script'],
          });
        }
      } catch {
        document.getElementById(`d${id}`)?.remove();
        if (!cancelled) setError(true);
      }
    };
    // Mermaid has global configuration and a shared renderer; serialize diagrams.
    queue = queue.then(render, render);
    return () => { cancelled = true; };
  }, [source, id]);
  return <section className="codeblock not-prose" aria-label="Diagramme Mermaid">
    <div className="codebar"><span>Mermaid</span><CopyButton text={source} label="Copier le diagramme" /></div>
    {error ? <p role="alert" className="p-4 text-red-300">Diagramme non rendu. Consulte la source ci-dessous.</p> : <div className="diagram" ref={target} />}
    <details open={error || undefined}><summary>Source Mermaid</summary><pre><code>{source}</code></pre></details>
  </section>;
}
