const NUMBER = '254794802462';
const STORE_NAMES = { mco: 'M & Co. Brands', prestige: 'Pyfon Gift Hub', trim: 'TriM Atelier' };

const kes = (n) => 'KES ' + Number(n).toLocaleString('en-KE');
const link = (text) => 'https://wa.me/' + NUMBER + '?text=' + encodeURIComponent(text);
const shop = (storefront) => STORE_NAMES[storefront] || 'Pyfon Brands';

export function orderWhatsappUrl({ ref, storefront, contactName, totalKes, lines, deliveryNotes }) {
  const rows = lines.map((l) => '- ' + l.qty + ' x ' + l.name + ' (' + l.sku + ') ' + kes(l.unitPriceKes * l.qty));
  const text = [
    'Hello ' + shop(storefront) + ', I placed order ' + ref + '.',
    ...rows,
    'Total: ' + kes(totalKes),
    'Name: ' + contactName,
    deliveryNotes ? 'Delivery: ' + deliveryNotes : null,
  ].filter(Boolean).join('\n');
  return link(text);
}

export function quoteWhatsappUrl({ ref, storefront, contactName, kind, summary }) {
  const text = [
    'Hello ' + shop(storefront) + ', I sent quote request ' + ref + ' (' + kind + ').',
    summary,
    'Name: ' + contactName,
  ].filter(Boolean).join('\n');
  return link(text);
}
