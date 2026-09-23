import { useMemo, useState } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import { safeImageUrl, type Heading, type Task } from './document';
import { CopyButton } from './CopyButton';
import { Diagram } from './Diagram';

const schema = { ...defaultSchema, attributes: { ...defaultSchema.attributes,
  code: [['className', /^language-./]], details: ['open'] } };

function PersonalCheckbox({ checked }: { checked?: boolean }) {
  const [value, setValue] = useState(Boolean(checked));
  return <input type="checkbox" checked={value} onChange={event => setValue(event.target.checked)} title="Coche personnelle, non enregistrée" />;
}

export function Markdown({ source, headings = [], tasks = [], actions = {} }: {
  source: string; headings?: Heading[]; tasks?: Task[]; actions?: Record<string, string>;
}) {
  const components = useMemo<Components>(() => {
    function heading(depth: 1 | 2 | 3 | 4 | 5 | 6): Components['h1'] {
      return ({ node, children }) => {
        const item = headings.find(h => h.offset === node?.position?.start.offset);
        const id = item?.id;
        const task = tasks.find(t => t.href === `#${id}`);
        const Tag = `h${depth}` as 'h1';
        return <><Tag id={id} className={task ? 'action-heading' : undefined}>
          <span>{children}</span>
          {task && <><span className="status">{task.status}</span>{actions[task.id] && <CopyButton text={actions[task.id]} label="Copier les instructions" className="copy-action" />}</>}
        </Tag>{id === 'suivi-des-recommandations' && tasks.length > 0 && <p className="completion" aria-label="Avancement global">{tasks.filter(t => t.status === 'Terminé').length} / {tasks.length} terminées</p>}</>;
      };
    }
    return {
      h1: heading(1), h2: heading(2), h3: heading(3), h4: heading(4), h5: heading(5), h6: heading(6),
      input: ({ checked }) => <PersonalCheckbox checked={checked} />,
      ul: ({ children, className }) => <>{className?.includes('contains-task-list') && <p className="personal-note">Coches personnelles non enregistrées.</p>}<ul className={className}>{children}</ul></>,
      img: ({ src, alt, title }) => {
        const url = typeof src === 'string' ? safeImageUrl(src) : undefined;
        return url ? <img src={url} alt={alt ?? ''} title={title} loading="lazy" className="rounded max-w-full h-auto" /> : <span className="text-red-300">Image non autorisée : {alt}</span>;
      },
      a: ({ href, children }) => <a href={href} rel="noreferrer noopener">{children}</a>,
      pre: ({ node, children }) => {
        const code = node?.children.find(child => child.type === 'element' && child.tagName === 'code');
        if (!code || code.type !== 'element') return <pre>{children}</pre>;
        const language = String(code.properties.className ?? '').replace('language-', '');
        const content = code.children.map(child => child.type === 'text' ? child.value : '').join('').replace(/\n$/, '');
        if (language === 'mermaid') return <Diagram source={content} />;
        return <div className="codeblock not-prose"><div className="codebar"><span>{language || 'Code'}</span><CopyButton text={content} label="Copier le code" /></div><pre>{children}</pre></div>;
      },
      table: ({ children }) => <div className="table-scroll"><table>{children}</table></div>,
      td: ({ children }) => <td>{typeof children === 'string' && ['À lancer', 'En cours', 'Terminé'].includes(children) ? <span className="status">{children}</span> : children}</td>,
      li: ({ children, className }) => <li className={className}>{className?.includes('task-list-item') ? <label>{children}</label> : children}</li>,
    };
  }, [headings, tasks, actions]);
  return <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw, [rehypeSanitize, schema]]} components={components}>{source}</ReactMarkdown>;
}
