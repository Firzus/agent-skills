import { useId, useState } from 'react';
import type { Task } from './document';

export function TaskTracker({ tasks, active }: { tasks: Task[]; active: string }) {
  const [expanded, setExpanded] = useState(true);
  const panelId = useId();
  const children = new Map<string | null, Task[]>();
  tasks.forEach((task, index) => {
    // A tree has one parent: use the nearest preceding prerequisite. The report retains all edges.
    const parent = tasks.slice(0, index).reverse().find(candidate => task.dependencies.includes(candidate.id));
    const key = parent?.id ?? null;
    children.set(key, [...(children.get(key) ?? []), task]);
  });
  function branch(parent: string | null) {
    return <ul className={parent ? 'tracker-children' : 'tracker-roots'}>
      {(children.get(parent) ?? []).map(task => {
        const state = task.status === 'Terminé' ? 'done' : task.status === 'En cours' ? 'running' : 'pending';
        return <li key={task.id}>
          <a href={task.href} className={`tracker-item ${active === task.href.slice(1) ? 'active' : ''}`} aria-current={active === task.href.slice(1) ? 'location' : undefined}>
            <svg aria-hidden="true" className={`step-circle ${state}`} viewBox="0 0 32 32">
              <circle className="ring-track" cx="16" cy="16" r="12" />
              {state === 'running' && <circle className="ring-progress" cx="16" cy="16" r="12" />}
              {state === 'done' && <path className="ring-check" d="m10 16 4 4 8-9" />}
            </svg>
            <span className="tracker-title">{task.title}</span>
          </a>
          {children.has(task.id) && branch(task.id)}
        </li>;
      })}
    </ul>;
  }
  return <nav className="tracker" aria-label="Avancement des recommandations">
    <button className="tracker-toggle" aria-expanded={expanded} aria-controls={panelId} onClick={() => setExpanded(value => !value)}>
      Recommandations <svg aria-hidden="true" className={expanded ? 'expanded' : ''} viewBox="0 0 16 16"><path d="m6 4 4 4-4 4" /></svg>
    </button>
    <div id={panelId} className={`tracker-panel${expanded ? ' expanded' : ''}`} aria-hidden={!expanded} inert={!expanded}>
      <div className="tracker-panel-content">{branch(null)}</div>
    </div>
  </nav>;
}
