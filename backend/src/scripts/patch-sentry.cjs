const fs = require('fs');
const path = require('path');
const base = path.join(__dirname, '..');
function edit(file, steps) {
  const p = path.join(base, file);
  let t = fs.readFileSync(p, 'utf8');
  const crlf = t.includes('\r\n');
  t = t.replace(/\r\n/g, '\n');
  if (t.includes('instrument.js') || t.includes('setupExpressErrorHandler')) { console.log(file + ': Already done'); return true; }
  for (const [from, to] of steps) {
    if (!t.includes(from)) { console.log(file + ': NOT FOUND: ' + from); return false; }
    t = t.replace(from, () => to);
  }
  if (crlf) t = t.replace(/\n/g, '\r\n');
  fs.writeFileSync(p, t);
  console.log(file + ': Patched');
  return true;
}
const a = edit('server.js', [
  ["import app from './app.js';", "import './instrument.js';\nimport app from './app.js';"],
]);
const b = edit('app.js', [
  ["import express from 'express';", "import * as Sentry from '@sentry/node';\nimport express from 'express';"],
  ["app.use((req, res) => {", "if (process.env.SENTRY_TEST === '1') {\n  app.get('/debug-sentry', () => {\n    throw new Error('Sentry test error from pyfon-api');\n  });\n}\n\napp.use((req, res) => {"],
  ["app.use((err, req, res, next) => {", "Sentry.setupExpressErrorHandler(app);\n\napp.use((err, req, res, next) => {"],
]);
if (!a || !b) process.exit(1);
