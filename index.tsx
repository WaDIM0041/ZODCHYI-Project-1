import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

const mountApp = () => {
  const container = document.getElementById('root');
  if (!container) {
    console.error('Mount container not found!');
    return;
  }

  try {
    const root = ReactDOM.createRoot(container);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    console.log('Zodchiy: Successfully mounted');
  } catch (err) {
    console.error('Zodchiy: Mount error', err);
    const globalAny: any = window;
    if (globalAny.showStartupError) {
      globalAny.showStartupError(err);
    }
  }
};

// В современных средах ESM (type="module") код выполняется после парсинга DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountApp);
} else {
  mountApp();
}