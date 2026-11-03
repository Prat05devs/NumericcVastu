/**
 * Adarshh's product store, numericcvaastucrystal.in (a WooCommerce shop). The Shop menu, footer and homepage open
 * the store directly; the site guide, structured data and llms.txt read this file.
 *
 * The store blocks automated visits, so its category pages could not be checked when this was written
 * (November 2026). Each category links to the store's own product search for its name. To link a category page
 * instead, open it in a browser and paste its address into `url`, e.g.
 * https://numericcvaastucrystal.in/product-category/rudraksha/
 *
 * Keep descriptions to what a product is and how it is traditionally used. Never promise health, money or
 * relationship results.
 */
export const store = {
  name: 'NumericcVaastu Crystal',
  url: 'https://numericcvaastucrystal.in/',
  domain: 'numericcvaastucrystal.in',
};

const search = (term) => `${store.url}?s=${encodeURIComponent(term)}&post_type=product`;

export const shopCategories = [
  {id: 'rudraksha', name: 'Rudraksha', icon: 'rudraksha', url: '', search: 'rudraksh',
    text: 'Rudraksh beads, malas and bracelets, worn in Indian tradition for daily practice and as a remedy.',
    examples: ['Rudraksh malas', 'Rudraksh and crystal bracelets', 'Mukhi beads']},
  {id: 'crystals', name: 'Crystals', icon: 'crystals', url: '', search: 'crystal',
    text: 'Crystal bracelets, pyramids and charging plates, including amethyst, pyrite, selenite and howlite.',
    examples: ['Crystal bracelets', 'Pyrite and selenite pyramids', 'Selenite charging plates']},
  {id: 'gemstones', name: 'Gemstones', icon: 'gemstones', url: '', search: 'gemstone',
    text: 'Gemstones linked in Indian tradition to the planets and numbers. Ask which stone suits your chart before you buy.',
    examples: ['Planetary gemstones', 'Stones for your birth number', 'Rings and pendants']},
  {id: 'yantras', name: 'Yantras', icon: 'yantras', url: '', search: 'yantra',
    text: 'Yantras for the home, office and puja space, used in Vaastu and daily worship.',
    examples: ['Shree Yantra', 'Vaastu yantras', 'Yantras for the workplace']},
].map((category) => ({...category, href: category.url || search(category.search)}));

/** Made to order, not stocked: a watch chosen for the wearer's numbers after a Wristwatch Analysis. */
export const wristwatches = {
  name: 'Wristwatches on demand',
  text: 'A wristwatch chosen for your numbers, made to order after a Wristwatch Analysis with Adarshh: the watch, and the wrist to wear it on.',
  consultationId: 'consult-watch',
  whatsappMessage: 'Namaste Adarshh ji 🙏 I would like a wristwatch made for my numbers. Please tell me how it works.',
};
