import { sendEmail } from '../mail.js';

// Sends one test email through Brevo. From backend:
//   node --env-file=.env src/scripts/test-email.js you@gmail.com
const to = process.argv[2];
if (!to) { console.log('Give an email address after the script name.'); process.exit(1); }
const ok = await sendEmail({ to, subject: 'Pyfon test email', text: 'If you can read this, email sending works.' });
console.log(ok ? 'SENT. Check the inbox and the spam folder of ' + to : 'NOT SENT. Read the red line above this one.');
