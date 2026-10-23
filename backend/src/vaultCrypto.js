import crypto from 'node:crypto';
import zlib from 'node:zlib';

const key = (pass, salt) => crypto.scryptSync(pass, salt, 32);

export function seal(json, pass) {
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key(pass, salt), iv);
  const enc = Buffer.concat([c.update(zlib.gzipSync(Buffer.from(json, 'utf8'))), c.final()]);
  return { salt: salt.toString('base64'), iv: iv.toString('base64'), tag: c.getAuthTag().toString('base64'), blob: enc.toString('base64') };
}

export function unseal(row, pass) {
  const d = crypto.createDecipheriv('aes-256-gcm', key(pass, Buffer.from(row.salt, 'base64')), Buffer.from(row.iv, 'base64'));
  d.setAuthTag(Buffer.from(row.tag, 'base64'));
  const gz = Buffer.concat([d.update(Buffer.from(row.blob_b64, 'base64')), d.final()]);
  return JSON.parse(zlib.gunzipSync(gz).toString('utf8'));
}
