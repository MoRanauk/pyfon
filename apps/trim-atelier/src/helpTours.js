export const SHOP_TOURS = {
  '*': [
    { at: '/', sel: 'header input', title: 'Search', text: 'Type a piece or a brand, like watch or Creed.' },
    { at: '/', sel: '.th-hero .btn', title: 'The collection', text: 'Press Next and the collection slides in, with all six categories.', click: { sel: '.th-hero .btn' }, to: '/collection' },
    { at: '/collection', sel: '.th-tile', title: 'Categories and brands', text: 'Each category shows its brands underneath. Press a category to see everything in it.' },
    { at: ['/collection', '/c'], sel: 'a[href^="/p/"]', title: 'Open a piece', text: 'Press Next and I will open one for you.', click: { sel: 'a[href^="/p/"]' }, to: '/collection' },
    { at: '/p', sel: 'main h1', title: 'The piece', text: 'Here are the photos, the price and the details. Hover the picture to zoom in.' },
    { at: '/p', txt: 'add to cart|enquire on whatsapp', title: 'Add to cart or enquire', text: 'Fixed-price pieces go in your cart. For pieces priced on request, press Enquire on WhatsApp and we reply with the price.' },
    { at: '/cart', sel: 'main', title: 'Your cart', text: 'Check the pieces and quantities, choose pickup or delivery, then press Proceed to checkout.' },
    { at: '/checkout', sel: 'form#co input', title: 'Your details', text: 'Give your name, phone and email, then choose delivery.' },
    { at: '/checkout', txt: 'place order|sign in to place order', title: 'Place your order', text: 'Press this yourself. We save your order and WhatsApp opens with a summary to send us. Thank you for choosing TriM Atelier!' },
  ],
};
export const SHOP_TOPICS = {
  '/': { title: 'Home', text: 'Press Shop the collection to see the six categories.' },
  '/collection': { title: 'The collection', text: 'Pick a category, or a brand under it, to see the pieces.' },
  '/c': { title: 'Category', text: 'Open a piece to see its photos, details and price.' },
  '/p': { title: 'Piece', text: 'Hover the picture to zoom. Add fixed-price pieces to your cart, or enquire on WhatsApp for the rest.' },
  '/cart': { title: 'Cart', text: 'Check your pieces, choose pickup or delivery, then go to checkout.' },
  '/checkout': { title: 'Checkout', text: 'Give your details, choose delivery and place your order.' },
};
export const SHOP_FAQ = [
  { q: 'How do I order?', a: 'Add a piece to your cart, go to checkout and press place order. We save it and WhatsApp opens with your order summary to send us.', k: 'buy order checkout how' },
  { q: 'How much is delivery?', a: 'Pickup is free. Delivery within Nairobi is KES 300.', k: 'delivery shipping pickup cost nairobi' },
  { q: 'Some pieces have no price. Why?', a: 'Those are priced on request. Press Enquire on WhatsApp on the piece and we reply with the price and availability.', k: 'price quote cost how much enquire request' },
  { q: 'Can you tell me about a piece before I buy?', a: 'Yes. Message us on WhatsApp and we will tell you about its origin, its box and papers, and help with sizing.', k: 'genuine authentic origin box papers size ring necklace watch certificate' },
  { q: 'How do I pay?', a: 'For now we confirm your order and payment with you on WhatsApp. Online payment is coming later.', k: 'pay payment mpesa money' },
  { q: 'Can I add engraving or initials?', a: 'On pieces that allow it, the product page lets you type the text. Otherwise ask us on WhatsApp.', k: 'engrave engraving initials personalise personalize custom name' },
  { q: 'I have a problem with my order', a: 'Message us on WhatsApp on 0794802462 and the team will help you.', k: 'return refund problem complaint help contact whatsapp' },
];
