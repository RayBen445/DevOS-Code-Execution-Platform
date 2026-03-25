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

const originalError = console.error;
const originalWarn = console.warn;

console.error = (...args) => {
  if (args.length > 0 && typeof args[0] === 'string' && resizeObserverErrors.some(msg => args[0].includes(msg))) {
    return;
  }
  originalError.apply(console, args);
};

console.warn = (...args) => {
  if (args.length > 0 && typeof args[0] === 'string' && resizeObserverErrors.some(msg => args[0].includes(msg))) {
    return;
  }
  originalWarn.apply(console, args);
};

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
