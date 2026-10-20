// Edit this file to change the shop's words, menu and colours of swatches.
export const SITE = {
  name: 'Pyfon Gift Hub',
  whatsapp: '254794802462',
  announce: 'Beautiful gifts, delivered with love across Kenya',
  hero: '',
  heroTitle: 'Say it with something beautiful',
  heroText: 'Flowers, hampers and personal gifts for every moment.',
  // Real photos: put hero-her.jpg / hero-him.jpg in apps/prestige-m/public and set '/hero-her.jpg' below.
  moods: {
    her: { title: 'Say it with something beautiful', text: 'Flowers, hampers and personal gifts for every moment.', hero: '' },
    him: { title: 'Gifts he will be proud to own', text: 'Bold, useful and made to be remembered.', hero: '' },
  },
  quote: 'Everything arrived beautifully wrapped, and she loved it.',
  quoteBy: 'Sample customer',
  showSample: true, // set to false when the quote is a real customer's words
};
// by 'cat' = the item's category slug. by 'tag' = items that have a tag like occasion:birthday.
// subs = the dropdown list as ['Name shown', 'value']. For 'cat' the value is the CSV subcategory;
// for 'tag' it is the part after the colon in the tag (occasion:birthday -> birthday).
export const MENU = [
  { key: 'flowers', title: 'Flowers', by: 'cat', subs: [['Bouquets', 'Bouquets'], ['Boxed flowers', 'Boxed flowers'], ['Vase arrangements', 'Vase arrangements'], ['Single stems', 'Single stems'], ['Bridal and wedding', 'Bridal and wedding'], ['Funeral and sympathy', 'Funeral and sympathy'], ['Plants', 'Plants'], ['Everlasting flowers', 'Everlasting flowers']] },
  { key: 'hampers', title: 'Hampers', by: 'cat', subs: [['Spa and self care', 'Spa and self care'], ['Baby', 'Baby'], ['Food hampers', 'Food hampers'], ['Treats and wine', 'Treats and wine']] },
  { key: 'personalised', title: 'Personalised', by: 'cat', subs: [['Mugs and bottles', 'Mugs and bottles'], ['Photo gifts', 'Photo gifts'], ['Name gifts', 'Name gifts'], ['Cushions', 'Cushions']] },
  { key: 'sweets', title: 'Sweets', by: 'cat', subs: [['Cakes', 'Cakes'], ['Chocolates', 'Chocolates'], ['Cookies and treats', 'Cookies and treats']] },
  { key: 'love', title: 'Love', by: 'cat', subs: [['Date-night boxes', 'Date-night boxes'], ['Roses', 'Roses'], ['Teddy bears', 'Teddy bears']] },
  { key: 'occasions', title: 'Occasions', by: 'tag', prefix: 'occasion', subs: [['Birthday', 'birthday'], ['Anniversary', 'anniversary'], ['Valentine\u2019s Day', 'valentines'], ['Mother\u2019s Day', 'mothers-day'], ['New baby', 'new-baby'], ['Wedding', 'wedding'], ['Graduation', 'graduation'], ['Get well', 'get-well']] },
  { key: 'gifts-for', title: 'Gifts For', by: 'tag', prefix: 'for', subs: [['For Her', 'her'], ['For Him', 'him'], ['For Friends', 'friends'], ['For Colleagues', 'colleagues'], ['For Mum', 'mum'], ['For Dad', 'dad'], ['For Kids', 'kids'], ['For Couples', 'couples']] },
];
export const SWATCH = {
  red: '#c0262d', pink: '#f2a0b5', white: '#ffffff', yellow: '#f4cf45', purple: '#8a5bb5',
  orange: '#f08a3c', blue: '#4a7fc1', green: '#4f9a5b', cream: '#f3e6cf', gold: '#c9a14a', black: '#222222',
  mixed: 'conic-gradient(#c0262d, #f4cf45, #4f9a5b, #4a7fc1, #8a5bb5, #c0262d)',
};
