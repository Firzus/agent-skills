import { useEffect, useId, useRef, useState } from 'react';
import DOMPurify from 'dompurify';
import { resolveColor, tokens } from './tokens';

let queue = Promise.resolve();

export function Diagram({ source, label = 'Diagram' }: { source: string; label?: string }) {
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
          themeVariables: { background: resolveColor(tokens.background), primaryColor: resolveColor(tokens.card), primaryBorderColor: resolveColor(tokens.border), primaryTextColor: resolveColor(tokens.foreground), lineColor: resolveColor(tokens.mutedForeground), textColor: resolveColor(tokens.foreground) } });
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
  return <figure aria-label={label} style={{ margin: 0 }}>
    <figcaption>{label}</figcaption>
    {error ? <p role="alert">Diagram could not be rendered. Its source is available below.</p> : <div className="canvas-diagram" ref={target} />}
    <details open={error || undefined}><summary>Mermaid source</summary><pre><code>{source}</code></pre></details>
  </figure>;
}
