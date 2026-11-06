import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { SITE } from './sites';
import './styles.css';

document.title = { tabernacle: 'Tabernacle Explorer', temple: 'Temple Explorer', sea: 'The Red Sea Crossing' }[SITE.id];

const root = createRoot(document.getElementById('root')!);
if (new URLSearchParams(location.search).has('preview')) {
  // asset preview tool: one model or texture on its own (src/preview)
  document.title = 'Asset Preview';
  import('./preview/Preview').then(({ Preview }) => root.render(<Preview />));
} else {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
