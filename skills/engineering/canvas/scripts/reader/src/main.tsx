import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Canvas from './example.canvas';


createRoot(document.getElementById('root')!).render(<StrictMode><Canvas /></StrictMode>);
