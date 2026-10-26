import React from 'react';
import { createRoot } from 'react-dom/client';
import { applyTheme } from '@pyfon/theme';
import App from './App.jsx';
import './styles.css';
import { startThemeMode } from '@pyfon/ui';
startThemeMode();

applyTheme('mco');
createRoot(document.getElementById('root')).render(<App />);
