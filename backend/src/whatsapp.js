const NUMBER = '254794802462';
const STORE_NAMES = { mco: 'M & Co. Brands', prestige: 'Prestige M', trim: 'TriM Atelier' };

const kes = (n) => 'KES ' + Number(n).toLocaleString('en-KE');
const link = (text) => 'https://wa.me/' + NUMBER + '?text=' + encodeURIComponent(text);

export function orderWhatsappUrl({ ref, storefront, contactName, totalKes, lines, deliveryNotes }) {
  const rows = lines.map((l) => '- ' + l.qty + ' x ' + l.name + ' (' + l.sku + ') ' + kes(l.unitPriceKes * l.qty));
  const text = [
    'Hello Pyfon Brands, I placed order ' + ref + ' on ' + (STORE_NAMES[storefront] || storefront) + '.',
    ...rows,
    'Total: ' + kes(totalKes),
    'Name: ' + contactName,
    deliveryNotes ? 'Delivery: ' + deliveryNotes : null,
  ].filter(Boolean).join('\n');
  return link(text);
}

export function quoteWhatsappUrl({ ref, storefront, contactName, kind, summary }) {
  const text = [
    'Hello Pyfon Brands, I sent quote request ' + ref + ' (' + kind + ') on ' + (STORE_NAMES[storefront] || storefront) + '.',
    summary,
    'Name: ' + contactName,
  ].filter(Boolean).join('\n');
  return link(text);
}
