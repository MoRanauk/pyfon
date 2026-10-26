export const SHOP_TOURS = {
  '*': [
    { at: '/', sel: 'header input', title: 'Search', text: 'Type what you want, like roses or hamper. Or use the menu under the name.' },
    { at: ['/', '/collection'], sel: 'a[href^="/p/"]', title: 'Pick a gift', text: 'Press Next and I will open one for you.', click: { sel: 'a[href^="/p/"]' }, to: '/shop' },
    { at: '/p', sel: 'main h1', title: 'The gift', text: 'Here are the photos, the price and the details. Hover the picture to zoom in.' },
    { at: '/p', sel: '.jx-pdp', title: 'Make it yours', text: 'Choose a colour or option. If the gift allows it, add a name or short message to print. Tick any extras under Make it special.' },
    { at: '/p', txt: 'add to cart', title: 'Add to cart', text: 'Press Next and I will add one for you. You can remove it in the cart.', click: { txt: 'add to cart' } },
    { at: '/p', sel: 'a[href="/cart"]', title: 'Your cart', text: 'Press Next to open your cart.', click: { sel: 'a[href="/cart"]' } },
    { at: '/cart', sel: 'main', title: 'Check your cart', text: 'Check the items and quantities. Choose Pickup or Nairobi delivery under Cart totals.' },
    { at: '/cart', txt: 'proceed to checkout', title: 'Checkout', text: 'Press Next and I will open checkout.', click: { txt: 'proceed to checkout' } },
    { at: '/checkout', sel: 'form#co input', title: 'Your details and the recipient', text: 'Give your details and who the gift is for. Add a card message, the date and the time. Tick Surprise if the recipient should not be called.' },
    { at: '/checkout', txt: 'place order|sign in to place order', title: 'Place your order', text: 'Press this yourself. We save your order and WhatsApp opens with a summary to send us. Thank you for choosing Pyfon Gift Hub!' },
  ],
};
export const SHOP_TOPICS = {
  '/': { title: 'Home', text: 'Choose Her or Him at the top left, search, or press the button to see all gift categories.' },
  '/collection': { title: 'Categories', text: 'Pick a category to see its gifts.' },
  '/c': { title: 'Gifts', text: 'Use the filters to narrow by colour, flower, occasion or price. Open a gift to see it properly.' },
  '/p': { title: 'Gift', text: 'Hover the picture to zoom. Choose options, add a name if allowed, then Add to cart.' },
  '/cart': { title: 'Cart', text: 'Check your items and choose pickup or Nairobi delivery, then go to checkout.' },
  '/checkout': { title: 'Checkout', text: 'Give your details, the recipient, a card message and the delivery date, then place your order.' },
};
export const SHOP_FAQ = [
  { q: 'How do I order?', a: 'Add gifts to your cart, go to checkout, give your details and the recipient, and press place order. We save it and WhatsApp opens with your order summary to send us.', k: 'buy order checkout how' },
  { q: 'How much is delivery?', a: 'Pickup is free. Delivery within Nairobi is KES 300. Fresh flowers and cakes are delivered in Nairobi only.', k: 'delivery shipping pickup cost nairobi fresh' },
  { q: 'Can I choose the delivery date and time?', a: 'Yes. At checkout you choose the date and a time slot: morning, afternoon or evening.', k: 'date time slot when same day schedule' },
  { q: 'Can I add a card message?', a: 'Yes, up to 200 characters. You can sign it with your name or leave it empty to stay anonymous.', k: 'card message note anonymous from' },
  { q: 'Can I keep it a surprise?', a: 'Yes. Tick the surprise box at checkout and we will not call the recipient before delivery.', k: 'surprise secret recipient call' },
  { q: 'Can I add a name or photo?', a: 'On gifts that allow it, the product page lets you type a name or short message. For a logo or photo, send it to us on WhatsApp after you order.', k: 'personalise personalize custom name logo photo print mug' },
  { q: 'How do I pay?', a: 'For now we confirm your order and payment with you on WhatsApp. Online payment is coming later.', k: 'pay payment mpesa money' },
  { q: 'I have a problem with my order', a: 'Message us on WhatsApp on 0794802462 and the team will help you.', k: 'return refund problem complaint help contact whatsapp' },
];
