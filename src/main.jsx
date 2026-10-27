import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

// The Audit Logs screen now reads the server's log; remove the old list that was kept in this browser.
try { localStorage.removeItem('shinde_admin_audit'); } catch { /* storage blocked */ }

// A data router (instead of <BrowserRouter>) is what lets a screen ask "leave this page?" (useBlocker).
// One catch-all route renders the app, whose own <Routes> still decide the pages.
const router = createBrowserRouter([
  {
    path: '*',
    element: (
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    ),
  },
]);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  </React.StrictMode>
);
