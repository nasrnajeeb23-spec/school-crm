import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ToastProvider } from './contexts/ToastContext';
import { AppProvider } from './contexts/AppContext';
import App from './App';
import './index.css';

// Ensure mock API uses the remote backend base URL in production
if (typeof window !== 'undefined') {
  try {
    const key = 'api_base';
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, 'https://school-crm-backend.onrender.com/api');
    }
  } catch {}
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <AppProvider>
          <App />
        </AppProvider>
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>
);