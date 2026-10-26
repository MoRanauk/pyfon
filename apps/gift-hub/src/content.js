import { createContext, useContext } from 'react';
import { SITE, DELIVER_TO, FLOWER_MEGA, ANNOUNCE } from './site.js';
import { CITIES } from './cities.js';
import { PCOLS } from './personalised.js';
export { CITIES };

// ALL words, menus and links of the gift shop live in this file.
export const wa = (t) => 'https://wa.me/' + SITE.whatsapp + '?text=' + encodeURIComponent(t);
const gf = (v) => '/c/gifts-for?for=' + v;
const oc = (v) => '/c/occasions?occasion=' + v;
// Links are ['Label', '/path']. A third item true means open in a new tab.
export const NAVTREE = [
  { title: 'Gifts For', to: '/c/gifts-for', strip: true, links: [['For Her', gf('her')], ['For Him', gf('him')], ['For Friends', gf('friends')], ['For Colleagues', gf('colleagues')], ['For Mum', gf('mum')], ['For Dad', gf('dad')], ['For Kids', gf('kids')], ['For Couples', gf('couples')]] },
  { title: 'Occasions', to: '/c/occasions', cols: [
    { title: 'Birthday', to: oc('birthday'), links: [['Birthday Flowers', '/c/flowers?occasion=birthday'], ['Birthday Cakes', '/c/sweets?sub=Cakes'], ['Birthday Cards', '/shop?style=card'], ['Birthday Ideas', oc('birthday')]] },
    { title: 'Celebrate', links: [['Anniversary', oc('anniversary')], ['Wedding', oc('wedding')], ['Graduation', oc('graduation')], ['Congratulations', oc('congratulations')], ['New baby', oc('new-baby')]] },
    { title: 'With love', links: [['Valentine\u2019s Day', oc('valentines')], ['Mother\u2019s Day', oc('mothers-day')], ['Get well soon', oc('get-well')], ['Apology', oc('apology')], ['Sympathy', oc('sympathy')]] },
  ] },
  { title: 'Flowers', to: '/c/flowers', wide: true, cols: FLOWER_MEGA },
  { title: 'Personalised', to: '/c/personalised', wide: true, cols: PCOLS },
  { title: 'Hampers & Sweets', to: '/c/hampers', cols: [
    { title: 'Hampers', to: '/c/hampers', links: [['Gift hampers', '/c/hampers'], ['Flower hampers', '/c/hampers?q=flower'], ['Flower and cake', '/c/hampers?q=cake'], ['Wine hampers', '/c/hampers?sub=Treats%20and%20wine']] },
    { title: 'Sweet extras', to: '/c/sweets', links: [['Chocolates', '/c/sweets?sub=Chocolates'], ['Birthday cakes', '/c/sweets?sub=Cakes'], ['Teddy bears', '/c/sweets?q=teddy']] },
  ] },
  { title: 'Deliver To', to: '/deliver/zones', links: CITIES.map((x) => [x.name, '/deliver/' + x.slug]) },
];

// Homepage. Tags look like occasion:birthday. cat is a category slug.
export const HOME = {
  pill: 'Gifts for every moment',
  badge: '', // a short claim like '4.8 stars' ONLY if true
  rounds: ['birthday', 'romantic', 'anniversary', 'apology', 'congratulations', 'get-well', 'graduation', 'wedding', 'sympathy'].map((v) => [v.replace('-', ' ').replace(/^./, (c) => c.toUpperCase()), oc(v), 'occasion:' + v]),
  rails: [
    { title: 'For someone special', tag: 'occasion:romantic', to: oc('romantic') },
    { title: 'Something sweet', cat: 'sweets', to: '/c/sweets' },
    { title: 'Make it personal', cat: 'personalised', to: '/c/personalised' },
  ],
  circlesTitle: 'A gift for every kind of thank-you',
  circles: [['Flowers', '/c/flowers', 'flowers'], ['Hampers', '/c/hampers', 'hampers'], ['Sweets', '/c/sweets', 'sweets'], ['Personalised', '/c/personalised', 'personalised']],
  band: { eyebrow: 'Delivered with care', text: 'Fresh flowers and gifts, ready for pick-up or delivery in Nairobi.', button: 'Shop flowers', to: '/c/flowers' },
  feature: { eyebrow: 'Gift of the season', title: 'A little thought goes a long way', text: 'Choose a gift, write your own card message, and we take care of the rest.', button: 'Start gifting', to: '/shop', img: '' },
  abroad: { eyebrow: 'Sending from abroad?', text: 'Message us on WhatsApp and we will arrange your gift in Kenya.', button: 'Message us', ask: 'Hello, I am abroad and want to send a gift in Kenya.' },
  countTitle: 'What you can count on',
  count: [['clock', 'Pick-up or delivery', 'Collect from us, or have it delivered in Nairobi.'], ['pen', 'Your own words', 'Write a card message at checkout.'], ['chat', 'Chat on WhatsApp', 'Ask us anything and we reply there.'], ['gift', 'Made personal', 'Names and messages on many gifts.']],
  reviewTitle: 'What our customers say',
  glance: {
    title: 'Flowers, hampers and personal gifts from Pyfon Gift Hub',
    text: ['Pyfon Gift Hub is part of Pyfon Brands, a design and printing business. We bring flowers, hampers and personalised gifts together in one shop.', 'Choose a gift, add a card message and pay on WhatsApp or online. We will take it from there.'],
    chipsTitle: 'Shop by occasion',
    chips: [['Birthday', oc('birthday')], ['Anniversary', oc('anniversary')], ['Get well', oc('get-well')], ['Sympathy', oc('sympathy')], ['Red roses', '/c/flowers?flower=rose'], ['Under KES 3,000', '/c/flowers?price=u3']],
    facts: [['Pick-up', 'Free'], ['Nairobi delivery', 'KES 300'], ['Card message', 'Added at checkout'], ['WhatsApp', 'Order or ask on 0794 802 462']],
  },
};

export const TICKS = ['Pick-up or Nairobi delivery', 'Your own card message', 'Order online or on WhatsApp'];
export const TRUST = ['Pick-up or Nairobi delivery', 'Card message at checkout', 'Order on WhatsApp', 'Made with care by Pyfon Brands'];
export const FAQ = [
  ['How do I order?', 'Open a gift, choose your options and add it to your cart. You can also message us on WhatsApp and we will take your order there.'],
  ['Can I add a card message?', 'Yes. At checkout you can write a card message and tell us who it is from.'],
  ['Do you deliver outside Nairobi?', 'Send us the town on WhatsApp and we will confirm if we can deliver and what it costs.'],
];
export const MORE = [
  ['Flowers', 'Bouquets, boxes and vases for every moment.', '/c/flowers'],
  ['Hampers', 'Treat hampers for birthdays, babies and thank-yous.', '/c/hampers'],
  ['Sweets', 'Cakes, chocolates and little treats.', '/c/sweets'],
  ['Personalised', 'Names and messages on gifts used every day.', '/c/personalised'],
  ['Occasions', 'Find a gift by the moment you are marking.', '/c/occasions'],
  ['Gifts for Him', 'Bold, useful gifts he will keep.', '/c/gifts-for?for=him'],
];
// One sentence per page. The key is the page title in lower case.
export const MSG = {
  'gifts for': 'Start with who it is for, and find a gift that fits them.',
  occasions: 'Every moment deserves a gift. Pick the occasion and see what suits it.',
  flowers: 'Bouquets, boxes and vases for every mood, from a simple thank-you to a grand gesture.',
  'hampers & sweets': 'Hampers and sweet extras that make a gift feel complete.',
  hampers: 'Hampers packed with treats, ready to give.',
  sweets: 'Cakes, chocolates and treats for sharing, or for keeping to yourself.',
  'for her': 'Thoughtful gifts for the woman in your life, from soft blooms to little luxuries.',
  'for him': 'Bold, useful gifts for the man who says he wants nothing.',
  'for friends': 'Small surprises that tell a friend you were thinking of them.',
  'for colleagues': 'Tidy, friendly gifts for a teammate, a boss or a thank-you at work.',
  'for mum': 'Show Mum how loved she is with something she will keep on display.',
  'for dad': 'Practical, proud gifts for Dad that he will actually use.',
  'for kids': 'Cheerful gifts that put a smile on a child\u2019s face.',
  'for couples': 'Gifts to share, for two people who make a good pair.',
  'for wife or girlfriend': 'Gifts that say you still choose her, every single day.',
  'for a sister or friend': 'Easy, happy gifts for the people who know you best.',
  'for a colleague or boss': 'Smart, friendly gifts that suit the office.',
  birthday: 'Make the birthday feel like theirs, with flowers, cakes and ideas for every age.',
  'birthday flowers': 'Bright, cheerful arrangements to start a birthday morning.',
  'birthday cakes': 'Something sweet to carry the candles.',
  'birthday cards': 'Pair your gift with a card and a few words from you.',
  'birthday ideas': 'Not sure what to give? Start with these birthday favourites.',
  anniversary: 'Mark another year together with something that says you remember.',
  wedding: 'Celebrate the couple, or dress the day, with gifts for a new beginning.',
  graduation: 'Congratulate the graduate on all the late nights that paid off.',
  congratulations: 'A new job, a big win or a small victory: say well done properly.',
  'new baby': 'Welcome the little one, and the parents, with something gentle and kind.',
  'valentine\u2019s day': 'Say I love you the old-fashioned way, with roses and little surprises.',
  'mother\u2019s day': 'A thank-you for the person who did it all.',
  'get well soon': 'Bring a little brightness to someone who is recovering.',
  apology: 'Sometimes sorry is easier to say with a gift. Start the conversation gently.',
  sympathy: 'Quiet, respectful ways to be there for someone who is grieving.',
  romantic: 'Red roses, heart arrangements and gift boxes for the person who deserves to feel it.',
  roses: 'The classic. Roses for love, thanks and everything in between.',
  carnations: 'Soft, long-lasting carnations that keep their colour for days.',
  lilies: 'Elegant lilies with a gentle scent that fills a room.',
  gerberas: 'Happy, daisy-faced gerberas that bring instant cheer.',
  chrysanthemums: 'Full, generous chrysanthemums in warm colours.',
  bouquets: 'Classic bouquets to hand over with a smile.',
  'flowers in a vase': 'Arranged and ready to place on a table the moment they arrive.',
  'flowers in a box': 'Neatly packed in a gift box for a more special reveal.',
  'envelope flowers': 'A modern way to give flowers, tucked into an envelope-style sleeve.',
  'flower baskets': 'Woven baskets of blooms with a homely, generous feel.',
  'heart shaped': 'Flowers shaped into a heart, for when words fall short.',
  red: 'Red for love, passion and bold statements.',
  pink: 'Soft pinks for sweetness, gratitude and new beginnings.',
  white: 'Clean white blooms for peace, purity and calm.',
  yellow: 'Sunny yellow for friendship and good news.',
  orange: 'Warm oranges for energy, joy and celebration.',
  purple: 'Rich purples for admiration and a little royalty.',
  'under kes 3,000': 'Lovely flowers that are kind to your budget.',
  'kes 3,000 to 5,000': 'A comfortable middle range with plenty of choice.',
  'kes 5,000 to 8,000': 'Generous arrangements for the bigger moments.',
  'kes 8,000 and above': 'Statement pieces for when you want to make an entrance.',
  'gift hampers': 'Ready-to-give hampers packed with treats.',
  'flower hampers': 'Flowers and treats together in one gift.',
  'flower and cake': 'The best pairing: something fresh and something sweet.',
  'wine hampers': 'A hamper with something to raise a glass to.',
  chocolates: 'Chocolates for the sweet-toothed and the sentimental.',
  'teddy bears': 'Soft, huggable companions to send with love.',
  'mugs and bottles': 'Everyday favourites, printed with a name or message.',
};
// A second sentence that depends on the category, so no two pages read the same.
export const CTX = {
  flowers: 'Browse the arrangements below, choose your options and add your card message at checkout.',
  occasions: 'Flowers, hampers and personal gifts picked for this moment.',
  'gifts-for': 'Everything below is chosen with them in mind.',
  hampers: 'Each hamper is packed for gifting.',
  sweets: 'Sweet things to share or to keep.',
  personalised: 'Add a name or message and we print it for you.',
  all: 'Order online, or message us on WhatsApp and we will help you choose.',
};
export const CONTENT = { announce: ANNOUNCE, home: HOME, msg: MSG, ctx: CTX, ticks: TICKS, trust: TRUST, faq: FAQ, more: MORE, cities: {} };
const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
export function mergeContent(base, over) {
  if (!isObj(base) || !isObj(over)) return over === undefined ? base : over;
  const out = { ...base };
  Object.keys(over).forEach((k) => { out[k] = mergeContent(base[k], over[k]); });
  return out;
}
const Ctx = createContext(CONTENT);
export const ContentProvider = Ctx.Provider;
export const useContent = () => useContext(Ctx);
