import './instrument.js';
import app from './app.js';
import { config } from './config.js';
import { pool } from './db/pool.js';
import { startSender, stopSender } from './messages/sender.js';

const server = app.listen(config.port, () => {
  console.log(JSON.stringify({ level: 'info', msg: 'Pyfon backend listening on port ' + config.port }));
  startSender();
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    stopSender();
    server.close(() => pool.end().then(() => process.exit(0)));
  });
}
