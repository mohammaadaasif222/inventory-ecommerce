/**
 * Dummy fragrance catalogue used by `npm run seed`. Fragrance families, houses,
 * concentrations and star ratings are deliberately spread across the whole range
 * so every storefront filter (family, price bracket, star rating, stock status)
 * has something to select and exclude.
 */

import type { SeedCategory, SeedProduct } from './catalog.data';

export const PERFUME_CATEGORIES: SeedCategory[] = [
  {
    name: 'Fragrances',
    children: ['Floral', 'Woody', 'Oriental', 'Fresh', 'Gourmand'],
  },
];

/** In-house perfume houses. Slugs: maison-noir, atelier-lumiere, veil-ash, solstice-perfumes, ivory-cordial. */
export const PERFUME_BRANDS: string[] = [
  'Maison Noir',
  'Atelier Lumière',
  'Veil & Ash',
  'Solstice Perfumes',
  'Ivory Cordial',
];

/** 40 perfumes spanning ₹1,499 – ₹24,999 and every star bucket. */
export const PERFUME_PRODUCTS: SeedProduct[] = [
  // ── Floral ──
  {
    name: 'Midnight Tuberose',
    category: 'floral',
    brand: 'maison-noir',
    basePrice: 18999,
    description:
      'Tuberose opened at the hour it turns narcotic, cut with green cardamom and a slick of coconut milk. It settles into warm skin and sandalwood, and refuses to leave the room quietly.',
    tags: ['tuberose', 'cardamom', 'sandalwood', 'white-floral', 'evening'],
    variants: [
      { concentration: 'EDP', size: '50ml' },
      { concentration: 'EDP', size: '100ml' },
      { concentration: 'Parfum', size: '30ml' },
    ],
    reviews: [5, 5, 4, 5, 5, 4],
    stock: 42,
  },
  {
    name: 'Peony Rainfall',
    category: 'floral',
    brand: 'atelier-lumiere',
    basePrice: 4299,
    description:
      'Wet peony petals and pink pepper over a wash of cucumber water. Dries down to clean musk, like a bouquet carried home through a spring shower.',
    tags: ['peony', 'pink-pepper', 'musk', 'aquatic-floral', 'daytime'],
    variants: [
      { concentration: 'EDT', size: '50ml' },
      { concentration: 'EDT', size: '100ml' },
    ],
    reviews: [4, 4, 5, 4, 3],
    stock: 120,
  },
  {
    name: 'White Iris Vigil',
    category: 'floral',
    brand: 'veil-ash',
    basePrice: 12499,
    description:
      'Cold, powdered iris root held above a bed of orris butter and grey suede. Austere at first spray, then quietly devastating an hour in.',
    tags: ['iris', 'orris', 'suede', 'powdery', 'unisex'],
    variants: [
      { concentration: 'EDP', size: '30ml' },
      { concentration: 'EDP', size: '50ml' },
      { concentration: 'Parfum', size: '50ml' },
    ],
    reviews: [5, 4, 5, 4],
    stock: 55,
  },
  {
    name: 'Jasmine at Dusk',
    category: 'floral',
    brand: 'solstice-perfumes',
    basePrice: 6999,
    description:
      'Sambac jasmine picked after sundown, when the indoles come out. Neroli lifts the opening; a smear of benzoin keeps it on the skin until morning.',
    tags: ['jasmine', 'neroli', 'benzoin', 'indolic', 'evening'],
    variants: [
      { concentration: 'EDP', size: '50ml' },
      { concentration: 'EDT', size: '100ml' },
    ],
    reviews: [4, 3, 4, 4, 3],
    stock: 88,
  },
  {
    name: 'Rose Ossuary',
    category: 'floral',
    brand: 'maison-noir',
    basePrice: 21999,
    description:
      'Turkish rose absolute laid over dry incense and a bone-white note of ambrette. Romantic in the way a cathedral is romantic — beautiful, and slightly afraid of itself.',
    tags: ['rose', 'incense', 'ambrette', 'gothic', 'unisex'],
    variants: [
      { concentration: 'Parfum', size: '30ml' },
      { concentration: 'Parfum', size: '50ml' },
      { concentration: 'EDP', size: '100ml' },
    ],
    reviews: [5, 5, 4, 5, 5],
    stock: 24,
  },
  {
    name: 'Powdered Violet',
    category: 'floral',
    brand: 'ivory-cordial',
    basePrice: 2499,
    description:
      'Violet leaf and heliotrope dusted with soft almond powder. A nostalgic, cosmetic sweetness that sits close and stays polite.',
    tags: ['violet', 'heliotrope', 'almond', 'powdery', 'feminine'],
    variants: [
      { concentration: 'EDT', size: '30ml' },
      { concentration: 'EDT', size: '50ml' },
    ],
    reviews: [3, 2, 3, 3],
    stock: 160,
  },
  {
    name: 'Neroli Confession',
    category: 'floral',
    brand: 'atelier-lumiere',
    basePrice: 9499,
    description:
      'Bitter orange blossom wrung out over petitgrain and honeyed beeswax. Bright, faintly soapy, and warmer than it first lets on.',
    tags: ['neroli', 'petitgrain', 'beeswax', 'citrus-floral', 'unisex'],
    variants: [
      { concentration: 'EDP', size: '50ml' },
      { concentration: 'EDT', size: '100ml' },
    ],
    reviews: [],
    stock: 60,
  },
  {
    name: 'Gardenia Nocturne',
    category: 'floral',
    brand: 'veil-ash',
    basePrice: 15999,
    description:
      'Gardenia rendered in green sap and creamy tiaré rather than sugar, with a shadow of black tea underneath. Lush without ever tipping into perfume-counter sweetness.',
    tags: ['gardenia', 'tiare', 'black-tea', 'green', 'white-floral'],
    variants: [
      { concentration: 'EDP', size: '50ml' },
      { concentration: 'Parfum', size: '30ml' },
      { concentration: 'EDP', size: '100ml' },
    ],
    reviews: [4, 5, 4, 4, 5, 4],
    stock: 34,
  },

  // ── Woody ──
  {
    name: 'Smoke & Cedar',
    category: 'woody',
    brand: 'veil-ash',
    basePrice: 16999,
    description:
      'Virginia cedar thrown on a fire that has been burning since noon. Juniper and black pepper crackle at the top; birch smoke and dry vetiver hold the embers for hours.',
    tags: ['cedar', 'birch', 'juniper', 'smoky', 'unisex'],
    variants: [
      { concentration: 'EDP', size: '50ml' },
      { concentration: 'EDP', size: '100ml' },
      { concentration: 'Parfum', size: '30ml' },
    ],
    reviews: [5, 5, 5, 4, 5, 5],
    stock: 40,
  },
  {
    name: 'Vetiver Meridian',
    category: 'woody',
    brand: 'solstice-perfumes',
    basePrice: 7499,
    description:
      'Haitian vetiver scrubbed clean with grapefruit peel, then rooted again in damp earth and a thread of tobacco leaf. Sharp at noon, mellow by evening.',
    tags: ['vetiver', 'grapefruit', 'tobacco', 'earthy', 'unisex'],
    variants: [
      { concentration: 'EDT', size: '50ml' },
      { concentration: 'EDP', size: '50ml' },
      { concentration: 'EDT', size: '100ml' },
    ],
    reviews: [4, 4, 4, 5, 3],
    stock: 95,
  },
  {
    name: 'Sandalwood Elegy',
    category: 'woody',
    brand: 'maison-noir',
    basePrice: 22999,
    description:
      'Mysore-style sandalwood at full weight, buttered with tonka and steadied by a whisper of cumin. Meditative, milky, and unmistakably expensive.',
    tags: ['sandalwood', 'tonka', 'cumin', 'creamy', 'luxury'],
    variants: [
      { concentration: 'Parfum', size: '30ml' },
      { concentration: 'Parfum', size: '50ml' },
    ],
    reviews: [5, 4, 5, 5],
    stock: 20,
  },
  {
    name: 'Driftwood Hours',
    category: 'woody',
    brand: 'atelier-lumiere',
    basePrice: 3499,
    description:
      'Sun-bleached timber, sea salt and a little dried seaweed. The smell of a boathouse in August, kept deliberately thin and airy.',
    tags: ['driftwood', 'sea-salt', 'seaweed', 'airy', 'summer'],
    variants: [
      { concentration: 'EDT', size: '50ml' },
      { concentration: 'EDT', size: '100ml' },
    ],
    reviews: [3, 3, 4, 2],
    stock: 145,
  },
  {
    name: 'Oakmoss Cathedral',
    category: 'woody',
    brand: 'veil-ash',
    basePrice: 13499,
    description:
      'A chypre spine of oakmoss and bergamot, vaulted over patchouli and cold stone. Green, shadowed, and built to last the whole day.',
    tags: ['oakmoss', 'bergamot', 'patchouli', 'chypre', 'unisex'],
    variants: [
      { concentration: 'EDP', size: '50ml' },
      { concentration: 'EDP', size: '100ml' },
    ],
    reviews: [4, 3, 4, 4],
    stock: 48,
  },
  {
    name: 'Birch Tar Letter',
    category: 'woody',
    brand: 'maison-noir',
    basePrice: 19499,
    description:
      'Birch tar and cured leather with an ink-black note of styrax. Reads like a note written in a cold room and never sent.',
    tags: ['birch-tar', 'leather', 'styrax', 'smoky', 'masculine'],
    variants: [
      { concentration: 'EDP', size: '50ml' },
      { concentration: 'Parfum', size: '30ml' },
      { concentration: 'EDP', size: '100ml' },
    ],
    reviews: [4, 5, 4, 5, 4, 5, 4],
    stock: 0,
  },
  {
    name: 'Papyrus & Pine',
    category: 'woody',
    brand: 'ivory-cordial',
    basePrice: 2999,
    description:
      'Dry papyrus reed against fresh pine needle and a squeeze of lime. Brisk, a bit stationery-shop, and gone in about four hours.',
    tags: ['papyrus', 'pine', 'lime', 'dry', 'unisex'],
    variants: [
      { concentration: 'EDT', size: '30ml' },
      { concentration: 'EDT', size: '100ml' },
    ],
    reviews: [2, 3, 2, 3, 2],
    stock: 175,
  },
  {
    name: 'Cypress Silence',
    category: 'woody',
    brand: 'solstice-perfumes',
    basePrice: 11999,
    description:
      'Mediterranean cypress standing in still air, with clary sage and a resinous drop of elemi. Contemplative, almost architectural.',
    tags: ['cypress', 'clary-sage', 'elemi', 'resinous', 'unisex'],
    variants: [
      { concentration: 'EDP', size: '50ml' },
      { concentration: 'EDP', size: '100ml' },
    ],
    reviews: [],
    stock: 30,
  },

  // ── Oriental ──
  {
    name: 'Amber Reliquary',
    category: 'oriental',
    brand: 'maison-noir',
    basePrice: 24999,
    description:
      'Labdanum, benzoin and vanilla absolute melted into a single golden mass, spiked with clove and a rasp of dried orange peel. Our heaviest, slowest, most unrepentant amber.',
    tags: ['amber', 'labdanum', 'benzoin', 'clove', 'luxury'],
    variants: [
      { concentration: 'Parfum', size: '30ml' },
      { concentration: 'Parfum', size: '50ml' },
      { concentration: 'EDP', size: '100ml' },
    ],
    reviews: [5, 5, 5, 4, 5, 5, 4],
    stock: 22,
  },
  {
    name: 'Oud Vespers',
    category: 'oriental',
    brand: 'veil-ash',
    basePrice: 23499,
    description:
      'Real agarwood, barn and all, softened with damask rose and a long trail of frankincense. Difficult for the first ten minutes and rewarding for the next ten hours.',
    tags: ['oud', 'rose', 'frankincense', 'animalic', 'luxury'],
    variants: [
      { concentration: 'Parfum', size: '30ml' },
      { concentration: 'EDP', size: '50ml' },
    ],
    reviews: [5, 4, 5, 5, 4],
    stock: 26,
  },
  {
    name: 'Incense & Saffron',
    category: 'oriental',
    brand: 'atelier-lumiere',
    basePrice: 17499,
    description:
      'Saffron threads bloomed in warm milk, then carried through a corridor of olibanum smoke. Leathery, spiced, and faintly medicinal in the best way.',
    tags: ['saffron', 'olibanum', 'leather', 'spicy', 'unisex'],
    variants: [
      { concentration: 'EDP', size: '50ml' },
      { concentration: 'EDP', size: '100ml' },
      { concentration: 'Parfum', size: '30ml' },
    ],
    reviews: [4, 4, 5, 4],
    stock: 38,
  },
  {
    name: 'Myrrh Passage',
    category: 'oriental',
    brand: 'solstice-perfumes',
    basePrice: 8999,
    description:
      'Bitter myrrh resin thinned with anise and dry cocoa nib. Cool and balsamic, less a fragrance than a draught from somewhere older.',
    tags: ['myrrh', 'anise', 'cocoa', 'balsamic', 'unisex'],
    variants: [
      { concentration: 'EDP', size: '50ml' },
      { concentration: 'EDT', size: '100ml' },
    ],
    reviews: [4, 3, 3, 4, 4],
    stock: 70,
  },
  {
    name: 'Velvet Labdanum',
    category: 'oriental',
    brand: 'maison-noir',
    basePrice: 14999,
    description:
      'Labdanum resin brushed the wrong way, revealing nutmeg and a nap of dark plum. Rich, slightly sticky, and best worn under a coat.',
    tags: ['labdanum', 'nutmeg', 'plum', 'resinous', 'winter'],
    variants: [
      { concentration: 'EDP', size: '50ml' },
      { concentration: 'EDP', size: '100ml' },
    ],
    reviews: [3, 4, 3, 3],
    stock: 52,
  },
  {
    name: 'Spiced Resin No. 7',
    category: 'oriental',
    brand: 'ivory-cordial',
    basePrice: 5499,
    description:
      'Cinnamon bark and pink peppercorn over a simple amber accord. Comfortable, familiar, and honestly not trying to reinvent anything.',
    tags: ['cinnamon', 'peppercorn', 'amber', 'spicy', 'unisex'],
    variants: [
      { concentration: 'EDT', size: '50ml' },
      { concentration: 'EDT', size: '100ml' },
    ],
    reviews: [2, 2, 3, 2],
    stock: 130,
  },
  {
    name: 'Tonka Curfew',
    category: 'oriental',
    brand: 'veil-ash',
    basePrice: 19999,
    description:
      'Tonka bean and hay absolute lit by a single match of lavender. Sweet, hazy and hypnotic — the last hour before the lights go out.',
    tags: ['tonka', 'hay', 'lavender', 'sweet', 'evening'],
    variants: [
      { concentration: 'EDP', size: '50ml' },
      { concentration: 'Parfum', size: '30ml' },
      { concentration: 'EDP', size: '100ml' },
    ],
    reviews: [5, 4, 4, 5, 5, 4],
    stock: 28,
  },
  {
    name: 'Patchouli Basilica',
    category: 'oriental',
    brand: 'atelier-lumiere',
    basePrice: 10499,
    description:
      'Raw patchouli leaf, camphor and a heavy hand of vanilla. Ambitious on paper; on skin it argues with itself and never quite settles.',
    tags: ['patchouli', 'camphor', 'vanilla', 'heavy', 'unisex'],
    variants: [
      { concentration: 'EDP', size: '50ml' },
      { concentration: 'EDP', size: '100ml' },
    ],
    reviews: [1, 2, 1, 2],
    stock: 90,
  },

  // ── Fresh ──
  {
    name: 'Salt Bloom',
    category: 'fresh',
    brand: 'solstice-perfumes',
    basePrice: 3999,
    description:
      'Sea spray and mineral salt over a pale wash of ambrette and driftwood musk. Skin after a long swim, before the towel.',
    tags: ['sea-salt', 'ambrette', 'musk', 'marine', 'summer'],
    variants: [
      { concentration: 'EDT', size: '50ml' },
      { concentration: 'EDT', size: '100ml' },
    ],
    reviews: [4, 5, 4, 4, 4],
    stock: 150,
  },
  {
    name: 'Bergamot Morning',
    category: 'fresh',
    brand: 'ivory-cordial',
    basePrice: 1499,
    description:
      'Calabrian bergamot and green tea, sharpened with a slice of ginger. An honest citrus cologne that does forty good minutes and then bows out.',
    tags: ['bergamot', 'green-tea', 'ginger', 'citrus', 'daytime'],
    variants: [
      { concentration: 'EDT', size: '30ml' },
      { concentration: 'EDT', size: '100ml' },
    ],
    reviews: [3, 3, 4, 3],
    stock: 200,
  },
  {
    name: 'Grapefruit Signal',
    category: 'fresh',
    brand: 'atelier-lumiere',
    basePrice: 2799,
    description:
      'Pink grapefruit rind snapped over juniper and a clean vetiver base. Bracing, a little bitter, and impossible to dislike.',
    tags: ['grapefruit', 'juniper', 'vetiver', 'citrus', 'unisex'],
    variants: [
      { concentration: 'EDT', size: '50ml' },
      { concentration: 'EDT', size: '100ml' },
      { concentration: 'EDP', size: '50ml' },
    ],
    reviews: [4, 4, 3, 4, 4, 4],
    stock: 185,
  },
  {
    name: 'Cold Rain Terrace',
    category: 'fresh',
    brand: 'maison-noir',
    basePrice: 12999,
    description:
      'Petrichor built from geosmin, wet slate and crushed shiso leaf, warmed underneath by grey musk. Rain arriving on a stone balcony at four in the afternoon.',
    tags: ['petrichor', 'slate', 'shiso', 'musk', 'unisex'],
    variants: [
      { concentration: 'EDP', size: '50ml' },
      { concentration: 'EDP', size: '100ml' },
      { concentration: 'Parfum', size: '30ml' },
    ],
    reviews: [5, 4, 5, 4, 5],
    stock: 44,
  },
  {
    name: 'Marine Fig Leaf',
    category: 'fresh',
    brand: 'veil-ash',
    basePrice: 8499,
    description:
      'Green fig leaf and coconut water against an open-air accord of salt and sun. Milky, leafy and quietly Mediterranean.',
    tags: ['fig', 'coconut', 'sea-salt', 'green', 'summer'],
    variants: [
      { concentration: 'EDT', size: '50ml' },
      { concentration: 'EDP', size: '50ml' },
    ],
    reviews: [4, 3, 4, 4],
    stock: 76,
  },
  {
    name: 'Sea Glass Verbena',
    category: 'fresh',
    brand: 'solstice-perfumes',
    basePrice: 4499,
    description:
      'Lemon verbena and mint over a translucent white musk. Pretty for a moment, then thins out to almost nothing.',
    tags: ['verbena', 'mint', 'white-musk', 'light', 'unisex'],
    variants: [
      { concentration: 'EDT', size: '50ml' },
      { concentration: 'EDT', size: '100ml' },
    ],
    reviews: [2, 3, 2, 2, 3],
    stock: 0,
  },
  {
    name: 'Alpine Mint Vector',
    category: 'fresh',
    brand: 'ivory-cordial',
    basePrice: 1899,
    description:
      'Peppermint, eucalyptus and a synthetic ozone note pitched high. Reads more like a cooling gel than a fragrance.',
    tags: ['mint', 'eucalyptus', 'ozone', 'sporty', 'unisex'],
    variants: [{ concentration: 'EDT', size: '100ml' }],
    reviews: [1, 2, 1, 1, 2],
    stock: 195,
  },
  {
    name: 'Linen Aldehyde',
    category: 'fresh',
    brand: 'atelier-lumiere',
    basePrice: 16499,
    description:
      'Fizzing aldehydes over ironed cotton, orris and a soft cashmere musk. Impeccably clean, in the way a well-made bed is clean.',
    tags: ['aldehydes', 'cotton', 'orris', 'clean', 'unisex'],
    variants: [
      { concentration: 'EDP', size: '50ml' },
      { concentration: 'EDP', size: '100ml' },
      { concentration: 'Parfum', size: '30ml' },
    ],
    reviews: [],
    stock: 33,
  },

  // ── Gourmand ──
  {
    name: 'Burnt Sugar Waltz',
    category: 'gourmand',
    brand: 'ivory-cordial',
    basePrice: 5999,
    description:
      'Caramel taken one second past the turn, with rum and toasted hazelnut trailing behind. Sweet, but with a bitter edge that keeps it upright.',
    tags: ['caramel', 'rum', 'hazelnut', 'sweet', 'winter'],
    variants: [
      { concentration: 'EDP', size: '50ml' },
      { concentration: 'EDT', size: '100ml' },
    ],
    reviews: [4, 5, 4, 5, 4],
    stock: 110,
  },
  {
    name: 'Vanilla Obscura',
    category: 'gourmand',
    brand: 'maison-noir',
    basePrice: 20499,
    description:
      'Madagascan vanilla darkened with smoked bourbon and a shaving of black truffle. Edible for about a minute, then it turns strange and wonderful.',
    tags: ['vanilla', 'bourbon', 'truffle', 'smoky', 'luxury'],
    variants: [
      { concentration: 'Parfum', size: '30ml' },
      { concentration: 'Parfum', size: '50ml' },
      { concentration: 'EDP', size: '100ml' },
    ],
    reviews: [5, 5, 4, 5, 5, 5, 4, 5],
    stock: 25,
  },
  {
    name: 'Praline Undertow',
    category: 'gourmand',
    brand: 'atelier-lumiere',
    basePrice: 6499,
    description:
      'Sugared almond pulled down by a current of coffee and patchouli. Confectionery with something serious moving beneath it.',
    tags: ['praline', 'coffee', 'patchouli', 'sweet', 'unisex'],
    variants: [
      { concentration: 'EDP', size: '50ml' },
      { concentration: 'EDP', size: '100ml' },
    ],
    reviews: [4, 4, 3, 4],
    stock: 82,
  },
  {
    name: 'Cacao & Leather',
    category: 'gourmand',
    brand: 'veil-ash',
    basePrice: 18499,
    description:
      'Unsweetened cacao rubbed into a worn leather jacket, with chilli and dried fig at the edges. Bitter, tactile, and quietly filthy.',
    tags: ['cacao', 'leather', 'chilli', 'fig', 'unisex'],
    variants: [
      { concentration: 'EDP', size: '50ml' },
      { concentration: 'Parfum', size: '30ml' },
      { concentration: 'EDP', size: '100ml' },
    ],
    reviews: [5, 4, 5, 4, 4],
    stock: 36,
  },
  {
    name: 'Honeyed Tobacco',
    category: 'gourmand',
    brand: 'solstice-perfumes',
    basePrice: 15499,
    description:
      'Raw honeycomb poured over pipe tobacco and dried apricot. Golden and drowsy, with just enough beeswax funk to stop it cloying.',
    tags: ['honey', 'tobacco', 'apricot', 'beeswax', 'autumn'],
    variants: [
      { concentration: 'EDP', size: '50ml' },
      { concentration: 'EDP', size: '100ml' },
    ],
    reviews: [4, 5, 4, 4, 5],
    stock: 29,
  },
  {
    name: 'Almond Requiem',
    category: 'gourmand',
    brand: 'maison-noir',
    basePrice: 9999,
    description:
      'Bitter almond and cherry pit over sandalwood and a trace of incense ash. Solemn where most gourmands are cheerful.',
    tags: ['almond', 'cherry', 'sandalwood', 'incense', 'unisex'],
    variants: [
      { concentration: 'EDP', size: '50ml' },
      { concentration: 'Parfum', size: '30ml' },
    ],
    reviews: [3, 3, 2, 3, 4],
    stock: 64,
  },
  {
    name: 'Chai Smoke Hour',
    category: 'gourmand',
    brand: 'ivory-cordial',
    basePrice: 3299,
    description:
      'Cardamom, ginger and boiled milk over a thin curl of smoke. The idea is lovely; the execution goes flat within the hour.',
    tags: ['cardamom', 'ginger', 'milk', 'tea', 'spicy'],
    variants: [
      { concentration: 'EDT', size: '50ml' },
      { concentration: 'EDT', size: '100ml' },
    ],
    reviews: [2, 3, 2, 3],
    stock: 140,
  },
  {
    name: 'Marzipan Nightfall',
    category: 'gourmand',
    brand: 'solstice-perfumes',
    basePrice: 2199,
    description:
      'Marzipan, orange peel and a dusting of tonka, closing on plain white musk. Pleasant, uncomplicated, and priced accordingly.',
    tags: ['marzipan', 'orange-peel', 'tonka', 'musk', 'sweet'],
    variants: [
      { concentration: 'EDT', size: '30ml' },
      { concentration: 'EDT', size: '50ml' },
    ],
    reviews: [3, 4, 3, 3, 2],
    stock: 168,
  },
];
