import { useEffect, useRef, useState } from 'react';

export function CopyButton({ text, label, className = '', icon = false }: { text: string; label: string; className?: string; icon?: boolean }) {
  const [message, setMessage] = useState(label);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  async function copy() {
    clearTimeout(timer.current);
    try {
      await navigator.clipboard.writeText(text);
      setMessage('Copié');
    } catch {
      setMessage('Copie impossible');
    }
    timer.current = setTimeout(() => setMessage(label), 2000);
  }
  return <button type="button" onClick={copy} className={className} aria-label={label}>
    {icon && <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h1" /></svg>}
    <span aria-live="polite">{message}</span>
  </button>;
}
