const C = (slug, name, promise, facts, faq) => ({
  slug, name, title: 'Gifts delivered to ' + name, promise, facts,
  ask: 'Hello, I would like to send a gift to ' + name + '.', faq,
});
const FREE = ['Pick-up', 'Free, from us in Nairobi'];
const CONFIRM = ['Delivery', 'Message us to confirm and quote'];
const CARD = ['Card message', 'Added at checkout'];
const OTHER = [['Can you deliver there?', 'Message us on WhatsApp with the town and the gift. We will confirm and give you a quote.'], ['Can I add a card message?', 'Yes. Write it at checkout and tell us who it is from.']];
export const CITIES = [
  C('nairobi', 'Nairobi', 'Flowers and gifts, ready for free pick-up or delivery in Nairobi.', [FREE, ['Delivery', 'KES 300'], CARD], [['How much is delivery in Nairobi?', 'Delivery in Nairobi is KES 300. Pick-up from us is free.'], OTHER[1]]),
  C('mombasa', 'Mombasa', 'Sending to someone in Mombasa? Tell us what you have in mind and we will confirm.', [CONFIRM, CARD], OTHER),
  C('kisumu', 'Kisumu', 'A gift for someone in Kisumu? Message us and we will confirm what we can do.', [CONFIRM, CARD], OTHER),
  C('nakuru', 'Nakuru', 'A gift for someone in Nakuru? Message us and we will confirm what we can do.', [CONFIRM, CARD], OTHER),
  C('eldoret', 'Eldoret', 'A gift for someone in Eldoret? Message us and we will confirm what we can do.', [CONFIRM, CARD], OTHER),
  C('thika', 'Thika', 'A gift for someone in Thika? Message us and we will confirm what we can do.', [CONFIRM, CARD], OTHER),
  { slug: 'abroad', name: 'Order from Abroad', title: 'Sending a gift from abroad', promise: 'Living away from home? Choose a gift here, or message us and we will arrange it in Kenya.', facts: [['How', 'Order here or on WhatsApp'], CONFIRM, CARD], ask: 'Hello, I am abroad and want to send a gift in Kenya.', faq: [['How do I order from abroad?', 'Choose a gift and message us on WhatsApp with the recipient town. We will confirm the details and the price.'], OTHER[1]] },
  { slug: 'zones', name: 'Delivery Zones and Fees', title: 'Delivery zones and fees', promise: 'Pick-up is free. Delivery in Nairobi is KES 300. For other towns, message us to confirm and quote.', facts: [FREE, ['Nairobi delivery', 'KES 300'], ['Other towns', 'Message us to quote']], ask: 'Hello, what are your delivery zones and fees?', faq: [OTHER[0]] },
];
