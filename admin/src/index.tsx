import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import { ToastProvider } from './contexts/ToastContext';
import { AppProvider } from './contexts/AppContext';
import App from './App';
// CSS is built via Tailwind CLI into dist/assets/index.css and linked from index.html

// Ensure mock API uses the remote backend base URL in production
if (typeof window !== 'undefined') {
  try {
    const key = 'api_base';
    const prod = 'https://school-crm-backend.onrender.com/api';
    const host = window.location.hostname || '';
    const cur = localStorage.getItem(key) || '';
    if (!cur || cur.includes('127.0.0.1') || cur.includes('localhost') || host.includes('onrender.com')) {
      localStorage.setItem(key, prod);
    }
  } catch {}
}

const container = document.getElementById('root');
if (container) {
  const useHash = (process.env.REACT_APP_HASH_ROUTER === 'true');
  const root = ReactDOM.createRoot(container);
  root.render(
    <React.StrictMode>
      {useHash ? (
        <HashRouter>
          <ToastProvider>
            <AppProvider>
              <App />
            </AppProvider>
          </ToastProvider>
        </HashRouter>
      ) : (
        <BrowserRouter>
          <ToastProvider>
            <AppProvider>
              <App />
            </AppProvider>
          </ToastProvider>
        </BrowserRouter>
      )}
    </React.StrictMode>
  );
}
