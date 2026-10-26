// Edit this file to change the shop's words, menu and colours of swatches.
export const SITE = {
  name: 'Pyfon Gift Hub',
  whatsapp: '254794802462',
  announce: 'Beautiful gifts, delivered with love across Kenya',
  hero: '',
  heroTitle: 'Say it with something beautiful',
  heroText: 'Flowers, hampers and personal gifts for every moment.',
  // Real photos: put hero-her.jpg / hero-him.jpg in apps/gift-hub/public and set '/hero-her.jpg' below.
  moods: {
    her: { title: 'Say it with something beautiful', text: 'Flowers, hampers and personal gifts for every moment.', hero: '' },
    him: { title: 'Gifts he will be proud to own', text: 'Bold, useful and made to be remembered.', hero: '' },
  },
  quote: '',
  quoteBy: '',
  showSample: false, // set to false when the quote is a real customer's words
};
// by 'cat' = the item's category slug. by 'tag' = items that have a tag like occasion:birthday.
// subs = the dropdown list as ['Name shown', 'value']. For 'cat' the value is the CSV subcategory;
// for 'tag' it is the part after the colon in the tag (occasion:birthday -> birthday).
export const MENU = [
  { key: 'flowers', title: 'Flowers', by: 'cat', subs: [['Bouquets', 'Bouquets'], ['Boxed flowers', 'Boxed flowers'], ['Vase arrangements', 'Vase arrangements'], ['Single stems', 'Single stems'], ['Bridal and wedding', 'Bridal and wedding'], ['Funeral and sympathy', 'Funeral and sympathy'], ['Plants', 'Plants'], ['Everlasting flowers', 'Everlasting flowers']] },
  { key: 'hampers', title: 'Hampers', by: 'cat', subs: [['Spa and self care', 'Spa and self care'], ['Baby', 'Baby'], ['Food hampers', 'Food hampers'], ['Treats and wine', 'Treats and wine']] },
  { key: 'personalised', title: 'Personalised', by: 'cat', subs: [['Mugs and bottles', 'Mugs and bottles'], ['Photo gifts', 'Photo gifts'], ['Name gifts', 'Name gifts'], ['Cushions', 'Cushions']] },
  { key: 'sweets', title: 'Sweets', by: 'cat', subs: [['Cakes', 'Cakes'], ['Chocolates', 'Chocolates'], ['Cookies and treats', 'Cookies and treats']] },
  { key: 'occasions', title: 'Occasions', by: 'tag', prefix: 'occasion', subs: [['Birthday', 'birthday'], ['Anniversary', 'anniversary'], ['Valentine\u2019s Day', 'valentines'], ['Mother\u2019s Day', 'mothers-day'], ['New baby', 'new-baby'], ['Wedding', 'wedding'], ['Graduation', 'graduation'], ['Get well', 'get-well']] },
  { key: 'gifts-for', title: 'Gifts For', by: 'tag', prefix: 'for', subs: [['For Her', 'her'], ['For Him', 'him'], ['For Friends', 'friends'], ['For Colleagues', 'colleagues'], ['For Mum', 'mum'], ['For Dad', 'dad'], ['For Kids', 'kids'], ['For Couples', 'couples']] },
];
export const SWATCH = {
  red: '#c0262d', pink: '#f2a0b5', white: '#ffffff', yellow: '#f4cf45', purple: '#8a5bb5',
  orange: '#f08a3c', blue: '#4a7fc1', green: '#4f9a5b', cream: '#f3e6cf', gold: '#c9a14a', black: '#222222',
  mixed: 'conic-gradient(#c0262d, #f4cf45, #4f9a5b, #4a7fc1, #8a5bb5, #c0262d)',
};

// Blooms-style extras. Edit the words here. Only keep messages that are TRUE.
export const ANNOUNCE = [
  'A free message card comes with every order',
  'Beautiful gifts, delivered with love across Kenya',
];
// Put your real page links between the quotes. Empty ones are hidden.
export const SOCIAL = [['IG', ''], ['TT', ''], ['FB', ''], ['X', '']];
// Set to a short text like 'Get 15% off' ONLY if you really offer it.
SITE.offer = '';
export const HAMPERS_MEGA = [
  { title: 'Hampers', links: [['Gift hampers', '/c/hampers'], ['Flower hampers', '/shop?q=flower'], ['Flower and cake', '/shop?q=cake'], ['Wine hampers', '/c/hampers?sub=Treats%20and%20wine']] },
  { title: 'Sweet extras', links: [['Chocolates', '/c/sweets?sub=Chocolates'], ['Birthday cakes', '/c/sweets?sub=Cakes'], ['Teddy bears', '/c/love?sub=Teddy%20bears']] },
];
// [town, WhatsApp question]. 'shop' means open the shop.
export const DELIVER_TO = [
  ['Nairobi', 'shop'], ['Mombasa', 'Hello, do you deliver gifts to Mombasa?'], ['Kisumu', 'Hello, do you deliver gifts to Kisumu?'],
  ['Nakuru', 'Hello, do you deliver gifts to Nakuru?'], ['Eldoret', 'Hello, do you deliver gifts to Eldoret?'], ['Thika', 'Hello, do you deliver gifts to Thika?'],
  ['Order from abroad', 'Hello, I am abroad and want to send a gift in Kenya.'], ['Delivery zones and fees', 'Hello, what are your delivery zones and fees?'],
];

// Flowers mega menu. Links open /c/flowers filtered by the tag. Edit the words here.
const F = (tag, list) => list.map((x) => [x[0], '/c/flowers?' + tag + '=' + x[1]]);
export const FLOWER_MEGA = [
  { title: 'Who she is', links: F('for', [['For Mum', 'mum'], ['For Wife or Girlfriend', 'wife-girlfriend'], ['For a Sister or Friend', 'sister-friend'], ['For a Colleague or Boss', 'colleague-boss']]) },
  { title: 'By occasion', links: F('occasion', [['Romantic', 'romantic'], ['Anniversary', 'anniversary'], ['Get Well Soon', 'get-well'], ['Graduation', 'graduation'], ['Congratulations', 'congratulations'], ['Wedding', 'wedding'], ['Apology', 'apology'], ['Sympathy', 'sympathy']]) },
  { title: 'By flower', links: F('flower', [['Roses', 'rose'], ['Carnations', 'carnation'], ['Lilies', 'lily'], ['Gerberas', 'gerbera'], ['Chrysanthemums', 'chrysanthemum']]), more: { title: 'By style', links: F('style', [['Bouquets', 'bouquet'], ['Flowers in a Vase', 'vase'], ['Flowers in a Box', 'box'], ['Envelope Flowers', 'envelope'], ['Flower Baskets', 'basket'], ['Heart Shaped', 'heart']]) } },
  { title: 'By colour', links: F('colour', [['Red', 'red'], ['Pink', 'pink'], ['White', 'white'], ['Yellow', 'yellow'], ['Orange', 'orange'], ['Purple', 'purple']]), more: { title: 'By budget', links: F('price', [['Under KES 3,000', 'u3'], ['KES 3,000 to 5,000', 'm3'], ['KES 5,000 to 8,000', 'm5'], ['KES 8,000 and above', 'o8']]) } },
];
