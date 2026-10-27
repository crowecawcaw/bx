import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { SITE } from './sites';
import './styles.css';

document.title = { tabernacle: 'Tabernacle Explorer', temple: 'Temple Explorer', sea: 'The Red Sea Crossing' }[SITE.id];

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
