const [id, receipt, amount, code] = process.argv.slice(2);
if (!id || !receipt || !amount) { console.log('Use: node --env-file=.env src\\scripts\\sim-stk-callback.js <CheckoutRequestID> <10-char receipt> <amount> [resultCode]'); process.exit(1); }
const rc = Number(code || 0);
const body = { Body: { stkCallback: { MerchantRequestID: 'sim', CheckoutRequestID: id, ResultCode: rc, ResultDesc: rc === 0 ? 'The service request is processed successfully.' : 'Request cancelled by user',
  CallbackMetadata: rc === 0 ? { Item: [{ Name: 'Amount', Value: Number(amount) }, { Name: 'MpesaReceiptNumber', Value: receipt }] } : undefined } } };
const r = await fetch('http://localhost:' + (process.env.PORT || 3000) + '/v1/mpesa/callback/' + process.env.MPESA_CALLBACK_SECRET, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
console.log('Status ' + r.status + ' ' + (await r.text()));
