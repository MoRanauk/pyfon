import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { applyTheme } from '@pyfon/theme';
import App from './App.jsx';
import { AuthProvider } from './Auth.jsx';
import './styles.css';
import { startThemeMode } from '@pyfon/ui';
startThemeMode();

applyTheme('mco');
createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <AuthProvider>
      <App />
    </AuthProvider>
  </BrowserRouter>
);
