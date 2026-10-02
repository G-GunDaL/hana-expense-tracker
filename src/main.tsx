import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

import { GlobalErrorBoundary } from './ErrorBoundary';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GlobalErrorBoundary>
      <App />
    </GlobalErrorBoundary>
  </React.StrictMode>
);

// PWA Service Worker 등록 및 즉시 업데이트 감지
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((registration) => {
      registration.update().catch(() => {});
    }).catch(error => {
      console.log('SW registration failed:', error);
    });
  });
}
