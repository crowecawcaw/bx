import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { SITE } from './sites';
import './styles.css';

document.title = SITE.title === 'The Tabernacle' ? 'Tabernacle Explorer' : 'Temple Explorer';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
