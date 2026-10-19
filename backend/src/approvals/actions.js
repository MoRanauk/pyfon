import { z } from 'zod';
import { HttpError } from '../errors.js';

const sku = z.string().trim().min(1).max(40);
const kes = z.number().int().min(0).max(10000000);

async function loadItem(client, code, lock) {
  const { rows } = await client.query(
    'SELECT id, sku, name, price_type, price_kes, compare_at_price_kes, status FROM catalog_items WHERE sku = $1' + (lock ? ' FOR UPDATE' : ''),
    [code]
  );
  if (!rows[0]) throw new HttpError(404, 'item_not_found', 'No product or service with that SKU');
  return rows[0];
}

export const ACTIONS = {
  price_change: {
    schema: z.object({ sku, priceKes: kes, compareAtPriceKes: kes.nullable().optional() }).strict(),
    async check(client, p) {
      const item = await loadItem(client, p.sku, false);
      if (item.price_type === 'quote') throw new HttpError(409, 'item_is_quote', 'Quote-priced items have no price to change');
      return item;
    },
    summary: (p, item) => 'Change price of ' + p.sku + ' (' + item.name + ') from KES ' + item.price_kes + ' to KES ' + p.priceKes,
    async execute(client, p) {
      const item = await loadItem(client, p.sku, true);
      if (item.price_type === 'quote') throw new HttpError(409, 'item_is_quote', 'Quote-priced items have no price to change');
      const newCompare = p.compareAtPriceKes === undefined ? item.compare_at_price_kes : p.compareAtPriceKes;
      await client.query(
        'UPDATE catalog_items SET price_kes = $2, compare_at_price_kes = $3, updated_at = now() WHERE id = $1',
        [item.id, p.priceKes, newCompare]
      );
      return { sku: p.sku, oldPriceKes: item.price_kes, newPriceKes: p.priceKes, oldCompareAtKes: item.compare_at_price_kes, newCompareAtKes: newCompare };
    },
  },
  invoice_discount: {
    schema: z.object({ invoiceId: z.string().regex(/^\d{1,18}$/), discountKes: kes }).strict(),
    async check(client, p) {
      const { rows } = await client.query("SELECT * FROM invoices WHERE id = $1 AND status = 'issued'", [p.invoiceId]);
      const inv = rows[0];
      if (!inv) throw new HttpError(404, 'invoice_not_found', 'No live invoice with that id');
      const gross = inv.lines.reduce((s, l) => s + l.unitPriceKes * l.qty, 0) + inv.other_charges_kes;
      if (p.discountKes > gross) throw new HttpError(400, 'discount_too_big', 'The discount is bigger than the invoice');
      if (p.discountKes === inv.discount_kes) throw new HttpError(409, 'no_change', 'That is already the discount');
      return inv;
    },
    summary: (p, inv) => 'Discount on invoice ' + inv.number + ': change from KES ' + inv.discount_kes + ' to KES ' + p.discountKes,
    async execute(client, p) {
      const { rows } = await client.query("SELECT * FROM invoices WHERE id = $1 AND status = 'issued' FOR UPDATE", [p.invoiceId]);
      const inv = rows[0];
      if (!inv) throw new HttpError(404, 'invoice_not_found', 'No live invoice with that id');
      const gross = inv.lines.reduce((s, l) => s + l.unitPriceKes * l.qty, 0) + inv.other_charges_kes;
      if (p.discountKes > gross) throw new HttpError(400, 'discount_too_big', 'The discount is bigger than the invoice');
      await client.query('UPDATE invoices SET discount_kes = $2, total_kes = $3 WHERE id = $1', [inv.id, p.discountKes, gross - p.discountKes]);
      return { invoice: inv.number, oldDiscountKes: inv.discount_kes, newDiscountKes: p.discountKes, totalKes: gross - p.discountKes };
    },
  },
  product_delete: {
    schema: z.object({ sku }).strict(),
    async check(client, p) {
      const item = await loadItem(client, p.sku, false);
      if (item.status === 'draft') throw new HttpError(409, 'already_draft', 'That item is already hidden');
      return item;
    },
    summary: (p, item) => 'Remove ' + p.sku + ' (' + item.name + ') from sale (hidden, can be restored)',
    async execute(client, p) {
      const item = await loadItem(client, p.sku, true);
      if (item.status === 'draft') throw new HttpError(409, 'already_draft', 'That item is already hidden');
      await client.query("UPDATE catalog_items SET status = 'draft', updated_at = now() WHERE id = $1", [item.id]);
      return { sku: p.sku, previousStatus: item.status, newStatus: 'draft' };
    },
  },
};
