import { MustChangeGate } from '@pyfon/ui';
import { api as gateApi } from './api.js';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { applyTheme } from '@pyfon/theme';
import App from './App.jsx';
import { AuthProvider } from './AuthState.jsx';
import { CartProvider } from './CartState.jsx';
import { CatalogProvider } from './CatalogState.jsx';
import './styles.css';

applyTheme('mco');
createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <AuthProvider>
      <CartProvider>
        <CatalogProvider>
          <MustChangeGate client={gateApi}><App /></MustChangeGate>
        </CatalogProvider>
      </CartProvider>
    </AuthProvider>
  </BrowserRouter>
);
