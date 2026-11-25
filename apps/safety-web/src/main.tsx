import React from 'react';
import ReactDOM from 'react-dom/client';
import { DesignShowcaseApp } from './DesignShowcaseApp.js';

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/service-worker.js', { scope: '/' }).catch((error) => {
      console.error('No se pudo registrar el Service Worker de Atent.', error);
    });
  });
}

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <DesignShowcaseApp />
    </React.StrictMode>
  );
}
