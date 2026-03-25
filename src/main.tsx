import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import './index.css';

// Suppress ResizeObserver loop limit exceeded error
// This is a common, benign error in Monaco Editor and iframes
const resizeObserverErrors = [
  "ResizeObserver loop completed with undelivered notifications.",
  "ResizeObserver loop limit exceeded"
];

window.addEventListener("error", (e) => {
  if (resizeObserverErrors.some(msg => e.message?.includes(msg))) {
    e.stopImmediatePropagation();
    e.preventDefault();
  }
});

window.addEventListener("unhandledrejection", (e) => {
  const msg = e.reason?.message || e.reason;
  if (typeof msg === 'string' && resizeObserverErrors.some(m => msg.includes(m))) {
    e.stopImmediatePropagation();
    e.preventDefault();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </BrowserRouter>
  </StrictMode>,
);
