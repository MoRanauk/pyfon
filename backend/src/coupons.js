import { HttpError } from './errors.js';

export const normCode = (s) => String(s || '').trim().toUpperCase().replace(/\s+/g, '');
const kes = (n) => 'KES ' + Number(n).toLocaleString('en-KE');

export function couponDiscount(c, itemsKes) {
  const d = c.kind === 'percent' ? Math.floor((itemsKes * Math.min(c.value_num, 15)) / 100) : c.value_num;
  return Math.max(0, Math.min(d, itemsKes));
}

// db = anything with query(). Pass lock=true inside a transaction to lock the coupon row.
export async function checkCoupon(db, rawCode, storefront, userId, itemsKes, lock) {
  const code = normCode(rawCode);
  const bad = (m) => new HttpError(400, 'coupon_invalid', m);
  if (!code) throw bad('Enter a coupon code.');
  const r = await db.query('SELECT * FROM coupons WHERE upper(code) = $1' + (lock ? ' FOR UPDATE' : ''), [code]);
  const c = r.rows[0];
  const now = Date.now();
  if (!c || c.status !== 'active') throw bad('That coupon code is not valid.');
  if (c.storefronts.length && !c.storefronts.includes(storefront)) throw bad('That coupon code is not valid.');
  if (c.starts_at && new Date(c.starts_at).getTime() > now) throw bad('That coupon is not active yet.');
  if (c.ends_at && new Date(c.ends_at).getTime() < now) throw bad('That coupon has expired.');
  if (c.max_uses != null && c.used_count >= c.max_uses) throw bad('That coupon has been fully used.');
  if (itemsKes < c.min_order_kes) throw bad('This coupon needs an order of at least ' + kes(c.min_order_kes) + '.');
  const u = await db.query('SELECT 1 FROM coupon_redemptions WHERE coupon_id = $1 AND user_id = $2', [c.id, userId]);
  if (u.rows.length) throw bad('You have already used this coupon.');
  return { ...c, discountKes: couponDiscount(c, itemsKes) };
}
