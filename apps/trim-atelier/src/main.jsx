import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { applyTheme } from '@pyfon/theme';
import App from './App.jsx';
import { AuthProvider, CartProvider, CatalogProvider } from './store.jsx';
import './styles.css';

applyTheme('trim');
createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <AuthProvider>
      <CartProvider>
        <CatalogProvider>
          <App />
        </CatalogProvider>
      </CartProvider>
    </AuthProvider>
  </BrowserRouter>
);
