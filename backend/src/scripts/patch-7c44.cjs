const fs = require('fs');
const path = require('path');
const file = path.resolve(__dirname, '..', 'routes', 'partnerSend.js');
let src = fs.readFileSync(file, 'utf8');
const crlf = src.includes('\r\n');
src = src.replace(/\r\n/g, '\n');
if (src.includes('textbeeReady')) { console.log('Already done'); process.exit(0); }
const A1 = "import { toWaNumber } from '../messages/queue.js';";
const A2 = "  const url = process.env.SMS_GATEWAY_URL;";
if (!src.includes(A1)) { console.log('NOT FOUND: import line'); process.exit(1); }
if (!src.includes(A2)) { console.log('NOT FOUND: SMS_GATEWAY_URL line'); process.exit(1); }
src = src.replace(A1, () => A1 + "\nimport { sendTextbeeSms, textbeeReady } from '../messages/textbee.js';");
src = src.replace(A2, () => "  if (textbeeReady()) { await sendTextbeeSms(to, full); return to; }\n" + A2);
if (crlf) src = src.replace(/\n/g, '\r\n');
fs.writeFileSync(file, src);
console.log('Patched');
