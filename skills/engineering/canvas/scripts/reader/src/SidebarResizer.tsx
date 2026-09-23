import { useEffect, useRef, useState } from 'react';

const minimum = 240;
const defaultWidth = 300;
const maximumWidth = () => Math.max(minimum, Math.min(520, window.innerWidth - 360));

export function useSidebarWidth() {
  const [width, setWidth] = useState(defaultWidth);
  const [maximum, setMaximum] = useState(maximumWidth);
  useEffect(() => {
    const resize = () => {
      const limit = maximumWidth();
      setMaximum(limit);
      setWidth(value => Math.min(value, limit));
    };
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);
  return { width, maximum, setWidth: (value: number) => setWidth(Math.max(minimum, Math.min(maximum, value))) };
}

export function SidebarResizer({ width, maximum, setWidth }: ReturnType<typeof useSidebarWidth>) {
  const drag = useRef<{ pointer: number; startX: number; width: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  return <div role="separator" aria-label="Redimensionner la barre latérale" aria-orientation="vertical"
    aria-controls="canvas-sidebar" aria-valuemin={minimum} aria-valuemax={maximum} aria-valuenow={width}
    aria-valuetext={`${width} pixels`} tabIndex={0} className={`sidebar-resizer${dragging ? ' dragging' : ''}`}
    title="Glisser pour ajuster · Flèches gauche/droite · Double-clic pour réinitialiser"
    onPointerDown={event => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.currentTarget.focus();
      event.currentTarget.setPointerCapture(event.pointerId);
      drag.current = { pointer: event.pointerId, startX: event.clientX, width };
      setDragging(true);
    }}
    onPointerMove={event => {
      if (drag.current?.pointer === event.pointerId) setWidth(Math.round(drag.current.width + event.clientX - drag.current.startX));
    }}
    onPointerUp={event => {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      drag.current = null;
      setDragging(false);
    }}
    onPointerCancel={() => { drag.current = null; setDragging(false); }}
    onLostPointerCapture={() => { drag.current = null; setDragging(false); }}
    onDoubleClick={() => setWidth(defaultWidth)}
    onKeyDown={event => {
      const next = { ArrowLeft: width - 10, ArrowRight: width + 10, Home: minimum, End: maximum }[event.key];
      if (next !== undefined) { event.preventDefault(); setWidth(next); }
    }}
  />;
}
