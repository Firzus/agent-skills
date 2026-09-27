import { useState } from 'react';

/** Minimal wiring example, replaced by each task's own content and appearance. */
export default function Canvas() {
  const [speed, setSpeed] = useState(5);
  return <main>
    <h1>Explore constant speed</h1>
    <p>Illustrative model: distance = speed × time.</p>
    <label htmlFor="speed">Speed (m/s)</label>
    <input id="speed" type="range" min="0" max="10" value={speed} onChange={event => setSpeed(Number(event.target.value))} />
    <output htmlFor="speed">{speed} m/s</output>
    <p>After 10 seconds: <output aria-label="Distance after 10 seconds" aria-live="polite">{speed * 10} m</output></p>
  </main>;
}
