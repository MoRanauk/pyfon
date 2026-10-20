export const SHOP_TOURS = {
  '*': [
    { at: '/', sel: '.hbar input', title: 'Search', text: 'Type what you want, like mug or notebook, to find it fast.' },
    { at: '/', sel: '.gbar', title: 'Browse by group', text: 'Or browse the groups here. Slide sideways to see them all.' },
    { at: ['/', '/shop'], sel: 'a[href^="/p/"]', title: 'Pick a product', text: 'Press Next and I will open one for you.', click: { sel: 'a[href^="/p/"]' }, to: '/shop' },
    { at: '/p', sel: 'main h1', title: 'The product', text: 'Here are the photos, the price and the details.' },
    { at: '/p', sel: 'main select, main input', title: 'Choose options', text: 'Pick options such as colour or size. If the product allows it, you can add a name, text, logo or photo.' },
    { at: '/p', txt: 'add to cart', title: 'Add to cart', text: 'Press Next and I will add one for you. You can remove it in the cart.', click: { txt: 'add to cart' } },
    { at: '/p', sel: '.cartlink', title: 'Your cart', text: 'The number shows what is in your cart. Press Next to open it.', click: { sel: '.cartlink' } },
    { at: '/cart', sel: 'main', title: 'Check your cart', text: 'Check the items and quantities. Remove anything you do not want.' },
    { at: '/cart', sel: 'main input', title: 'Your details', text: 'Give your name, a working phone number and email so we can reach you. Pickup is free and Nairobi delivery is KES 300.' },
    { at: '/cart', txt: 'place order|checkout|whatsapp', title: 'Place your order', text: 'Press this yourself. We save your order and WhatsApp opens with a summary to send us. Thank you for shopping with us!' },
  ],
};
export const SHOP_TOPICS = {
  '/': { title: 'Home', text: 'Search at the top, browse the groups under it, and open any picture to see the product.' },
  '/shop': { title: 'Shop', text: 'All products. Open one to choose options and add it to your cart.' },
  '/p': { title: 'Product', text: 'Choose options, add personalisation if allowed, then Add to cart.' },
  '/cart': { title: 'Cart', text: 'Check your items, give your contact details and place your order.' },
  '/orders': { title: 'My orders', text: 'See each order and its stage, from Order Made to Delivered or Collected.' },
  '/quote': { title: 'Quote', text: 'Describe the printing or design job you want and we reply with a price.' },
};
export const SHOP_FAQ = [
  { q: 'How do I order?', a: 'Add products to your cart, give your details and press place order. We save it and WhatsApp opens with your order summary to send us.', k: 'buy order checkout how' },
  { q: 'How much is delivery?', a: 'Pickup is free. Delivery within Nairobi is KES 300.', k: 'delivery shipping pickup cost nairobi' },
  { q: 'How do I pay?', a: 'For now we confirm your order and payment with you on WhatsApp. Online payment is coming later.', k: 'pay payment mpesa money' },
  { q: 'Can I add my name, logo or photo?', a: 'Yes, on products that allow it. The product page shows the choices: text, logo or photo.', k: 'personalise personalize custom name logo photo print' },
  { q: 'How do I follow my order?', a: 'Open My orders. Each order shows its stage, from Order Made to Delivered or Collected.', k: 'track tracking status where order' },
  { q: 'I need a price for a printing job', a: 'Use the Quote page and describe the size, material, finish and quantity. We reply with a price.', k: 'quote price printing design poster banner bulk corporate' },
  { q: 'I have a problem with my order', a: 'Message us on WhatsApp on 0794802462 and the team will help you.', k: 'return refund problem complaint help contact whatsapp' },
];
