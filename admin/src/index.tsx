import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import { ToastProvider } from './contexts/ToastContext';
import { AppProvider } from './contexts/AppContext';
import App from './App';

if (typeof window !== 'undefined') {
  try {
    const key = 'api_base';
    const envApi = (process.env.REACT_APP_API_URL || ((typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env.VITE_API_URL) || ''));
    const host = window.location.hostname || '';
    const cur = localStorage.getItem(key) || '';

    // Allow override via query param: ?api_base=https://backend.onrender.com/api
    const params = new URLSearchParams(window.location.search);
    const qp = params.get('api_base');
    if (qp && /^https?:\/\//.test(qp)) {
      localStorage.setItem(key, decodeURIComponent(qp));
    } else if (envApi) {
      localStorage.setItem(key, envApi);
    } else if (!cur) {
      let candidate = '';
      if (host.endsWith('.onrender.com')) {
        const sub = host.split('.onrender.com')[0];
        const map: Record<string, string> = {
          'school-crm-admin': 'https://school-crschool-crm-backendm.onrender.com/api'
        };
        if (map[sub]) {
          candidate = map[sub];
        } else {
          let back = sub.includes('admin') ? sub.replace('admin', 'backend') : `${sub}-backend`;
          candidate = `https://${back}.onrender.com/api`;
        }
      }
      localStorage.setItem(key, candidate || 'http://localhost:5000/api');
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
