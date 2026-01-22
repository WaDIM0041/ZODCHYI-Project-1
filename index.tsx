
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

const mountApp = () => {
  const container = document.getElementById('root');
  if (!container) return;

  try {
    const root = ReactDOM.createRoot(container);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    
    // Регистрация Service Worker для PWA
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
          .then(reg => console.log('Zodchiy: SW Registered', reg.scope))
          .catch(err => console.log('Zodchiy: SW Failed', err));
      });
    }

    // Мгновенное скрытие заставки после инициализации React
    if ((window as any).hideAppSplash) {
        (window as any).hideAppSplash();
    }
  } catch (err) {
    console.error('Zodchiy: Mount error', err);
    if ((window as any).showStartupError) {
      (window as any).showStartupError(err);
    }
  }
};

mountApp();
