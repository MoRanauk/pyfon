import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { applyTheme } from '@pyfon/theme';
import App from './App.jsx';
import './styles.css';

applyTheme('mco');
createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
