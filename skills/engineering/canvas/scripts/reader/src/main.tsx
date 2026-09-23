import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import report from './report.md?raw';
import './styles.css';

createRoot(document.getElementById('root')!).render(<StrictMode><App source={report} /></StrictMode>);
