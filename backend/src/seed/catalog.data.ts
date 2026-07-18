/**
 * Dummy catalog used by `npm run seed`. Prices, ratings and categories are
 * deliberately spread across the whole range so every storefront filter
 * (category, price bracket, star rating) has something to select and exclude.
 */

export interface SeedCategory {
  name: string;
  children?: string[];
}

export interface SeedProduct {
  name: string;
  /** Slug of the (leaf) category this product belongs to. */
  category: string;
  /** Slug of the brand. */
  brand: string;
  basePrice: number;
  description: string;
  tags: string[];
  /** One entry per variant; empty object means a single default variant. */
  variants: Record<string, string>[];
  /** Explicit star ratings — drives both the review rows and the aggregate. */
  reviews: number[];
  /** Units received into the default warehouse, per variant. */
  stock: number;
}

export const SEED_CATEGORIES: SeedCategory[] = [
  { name: 'Electronics', children: ['Smartphones', 'Laptops', 'Audio'] },
  { name: 'Fashion', children: ['Men’s Clothing', 'Women’s Clothing', 'Footwear'] },
  { name: 'Home & Kitchen', children: ['Appliances', 'Cookware'] },
  { name: 'Sports & Outdoors' },
  { name: 'Books' },
];

export const SEED_BRANDS: string[] = [
  'Aurora',
  'Nimbus',
  'Vertex',
  'Kestrel',
  'Lumen',
  'Pinnacle',
  'Terra',
  'Zephyr',
];

/** Reviewers are seeded as CUSTOMER accounts; password is shared for all. */
export const SEED_REVIEWERS: { email: string; firstName: string; lastName: string }[] = [
  { email: 'priya.sharma@example.com', firstName: 'Priya', lastName: 'Sharma' },
  { email: 'arjun.mehta@example.com', firstName: 'Arjun', lastName: 'Mehta' },
  { email: 'neha.iyer@example.com', firstName: 'Neha', lastName: 'Iyer' },
  { email: 'rohan.gupta@example.com', firstName: 'Rohan', lastName: 'Gupta' },
  { email: 'ananya.rao@example.com', firstName: 'Ananya', lastName: 'Rao' },
  { email: 'vikram.singh@example.com', firstName: 'Vikram', lastName: 'Singh' },
  { email: 'meera.nair@example.com', firstName: 'Meera', lastName: 'Nair' },
  { email: 'karan.patel@example.com', firstName: 'Karan', lastName: 'Patel' },
  { email: 'divya.menon@example.com', firstName: 'Divya', lastName: 'Menon' },
  { email: 'sameer.khan@example.com', firstName: 'Sameer', lastName: 'Khan' },
];

export const SEED_REVIEWER_PASSWORD = 'Customer@12345';

/** Review copy pools, indexed by star rating. */
export const REVIEW_COPY: Record<number, { title: string; body: string }[]> = {
  5: [
    {
      title: 'Exceeded expectations',
      body: 'Genuinely impressed. Build quality is excellent and it arrived two days early. Would buy again without hesitation.',
    },
    {
      title: 'Worth every rupee',
      body: 'Been using it daily for a month now with zero complaints. Does exactly what it promises.',
    },
    {
      title: 'Perfect',
      body: 'Exactly as described. Packaging was solid and setup took less than five minutes.',
    },
  ],
  4: [
    {
      title: 'Very good, minor niggles',
      body: 'Really happy overall. Knocking off a star because the instructions were thin, but the product itself is solid.',
    },
    {
      title: 'Solid buy',
      body: 'Does the job well. Slightly heavier than I expected from the photos, but that is on me for not checking.',
    },
    {
      title: 'Recommended',
      body: 'Good value at this price. Not flawless, but nothing that would stop me recommending it to a friend.',
    },
  ],
  3: [
    {
      title: 'Does the job',
      body: 'Perfectly average. Nothing wrong with it, nothing that stands out either. Fine for the price.',
    },
    {
      title: 'Mixed feelings',
      body: 'Works as advertised but the finish feels cheaper than the listing suggests. Acceptable, not great.',
    },
  ],
  2: [
    {
      title: 'Disappointing',
      body: 'Started showing wear within a fortnight. Expected more durability at this price point.',
    },
    {
      title: 'Not for me',
      body: 'The description oversells it. It works, but only just, and the quality control seems inconsistent.',
    },
  ],
  1: [
    {
      title: 'Would not buy again',
      body: 'Stopped working within a week. Support was slow to respond. Returning it.',
    },
    {
      title: 'Poor quality',
      body: 'Arrived with a visible defect and feels flimsy overall. Not what I paid for.',
    },
  ],
};

const SIZES = ['S', 'M', 'L', 'XL'];

/** ~40 products spanning ₹199 – ₹1,49,999 and every star bucket. */
export const SEED_PRODUCTS: SeedProduct[] = [
  // ── Smartphones ──
  {
    name: 'Aurora Pulse 5G',
    category: 'smartphones',
    brand: 'aurora',
    basePrice: 28999,
    description:
      '6.5" AMOLED display, 5000mAh battery and a 50MP main sensor. The everyday flagship without the flagship price.',
    tags: ['5g', 'smartphone', 'amoled'],
    variants: [
      { storage: '128GB', color: 'Midnight' },
      { storage: '256GB', color: 'Midnight' },
      { storage: '256GB', color: 'Frost' },
    ],
    reviews: [5, 5, 4, 5, 4, 5],
    stock: 60,
  },
  {
    name: 'Nimbus One Mini',
    category: 'smartphones',
    brand: 'nimbus',
    basePrice: 15499,
    description:
      'A genuinely pocketable 5.8" phone with clean software and three years of security updates.',
    tags: ['compact', 'smartphone'],
    variants: [{ storage: '128GB', color: 'Slate' }, { storage: '128GB', color: 'Sage' }],
    reviews: [4, 4, 5, 3],
    stock: 45,
  },
  {
    name: 'Vertex Apex Pro Max',
    category: 'smartphones',
    brand: 'vertex',
    basePrice: 149999,
    description:
      'Titanium frame, periscope zoom and the fastest silicon we have shipped. Our halo device.',
    tags: ['flagship', 'premium', '5g'],
    variants: [
      { storage: '256GB', color: 'Titanium' },
      { storage: '512GB', color: 'Titanium' },
      { storage: '1TB', color: 'Obsidian' },
    ],
    reviews: [5, 4, 5, 5, 5, 4, 5],
    stock: 18,
  },
  {
    name: 'Kestrel Go 4G',
    category: 'smartphones',
    brand: 'kestrel',
    basePrice: 7499,
    description: 'A dependable entry-level handset with a headphone jack and removable case.',
    tags: ['budget', 'smartphone'],
    variants: [{ storage: '64GB', color: 'Black' }],
    reviews: [3, 2, 3, 3],
    stock: 120,
  },

  // ── Laptops ──
  {
    name: 'Vertex Studio 14',
    category: 'laptops',
    brand: 'vertex',
    basePrice: 124999,
    description:
      '14" colour-accurate display, 18-hour battery and a fanless chassis. Built for people who edit on trains.',
    tags: ['laptop', 'creator', 'premium'],
    variants: [
      { ram: '16GB', ssd: '512GB' },
      { ram: '32GB', ssd: '1TB' },
    ],
    reviews: [5, 5, 5, 4, 5],
    stock: 22,
  },
  {
    name: 'Nimbus Air 13',
    category: 'laptops',
    brand: 'nimbus',
    basePrice: 68999,
    description: 'Under 1.1kg with a full day of battery. The commuter’s laptop.',
    tags: ['laptop', 'ultrabook', 'lightweight'],
    variants: [
      { ram: '8GB', ssd: '256GB' },
      { ram: '16GB', ssd: '512GB' },
    ],
    reviews: [4, 4, 4, 5, 3],
    stock: 34,
  },
  {
    name: 'Pinnacle Forge 17',
    category: 'laptops',
    brand: 'pinnacle',
    basePrice: 189999,
    description:
      'Desktop-class GPU in a 17" chassis with a vapour chamber. Loud under load, and unapologetic about it.',
    tags: ['laptop', 'gaming', 'premium'],
    variants: [
      { ram: '16GB', ssd: '1TB' },
      { ram: '32GB', ssd: '2TB' },
    ],
    reviews: [4, 5, 3, 4],
    stock: 9,
  },
  {
    name: 'Kestrel Book Basic',
    category: 'laptops',
    brand: 'kestrel',
    basePrice: 32999,
    description: 'A no-frills 15" laptop for documents, browsing and video calls.',
    tags: ['laptop', 'budget'],
    variants: [{ ram: '8GB', ssd: '256GB' }],
    reviews: [3, 3, 2, 4, 3],
    stock: 75,
  },

  // ── Audio ──
  {
    name: 'Lumen Halo ANC Headphones',
    category: 'audio',
    brand: 'lumen',
    basePrice: 24999,
    description:
      'Over-ear active noise cancellation with 40-hour battery and genuinely comfortable earcups.',
    tags: ['headphones', 'anc', 'wireless'],
    variants: [{ color: 'Black' }, { color: 'Ivory' }, { color: 'Navy' }],
    reviews: [5, 5, 4, 5, 5, 4],
    stock: 55,
  },
  {
    name: 'Lumen Drop Wireless Earbuds',
    category: 'audio',
    brand: 'lumen',
    basePrice: 6999,
    description: 'Compact earbuds with a pocketable case and eight hours per charge.',
    tags: ['earbuds', 'wireless'],
    variants: [{ color: 'White' }, { color: 'Graphite' }],
    reviews: [4, 3, 4, 4, 5],
    stock: 140,
  },
  {
    name: 'Zephyr Boom Portable Speaker',
    category: 'audio',
    brand: 'zephyr',
    basePrice: 4499,
    description: 'IP67 speaker that floats, with a strap and 20 hours of playback.',
    tags: ['speaker', 'bluetooth', 'waterproof'],
    variants: [{ color: 'Coral' }, { color: 'Forest' }],
    reviews: [4, 4, 5],
    stock: 90,
  },
  {
    name: 'Kestrel Wired Earphones',
    category: 'audio',
    brand: 'kestrel',
    basePrice: 599,
    description: 'Simple 3.5mm earphones with an inline mic. No pairing, no charging.',
    tags: ['earphones', 'wired', 'budget'],
    variants: [{ color: 'Black' }],
    reviews: [2, 3, 2, 1, 3],
    stock: 300,
  },
  {
    name: 'Aurora Sound Bar 320',
    category: 'audio',
    brand: 'aurora',
    basePrice: 18999,
    description: '3.1 channel bar with a wireless subwoofer and HDMI eARC.',
    tags: ['soundbar', 'home-theatre'],
    variants: [{ color: 'Black' }],
    reviews: [],
    stock: 26,
  },

  // ── Men's Clothing ──
  {
    name: 'Terra Everyday Oxford Shirt',
    category: 'men-s-clothing',
    brand: 'terra',
    basePrice: 2499,
    description: 'Garment-washed cotton oxford that only gets better after a dozen washes.',
    tags: ['shirt', 'cotton', 'formal'],
    variants: SIZES.map((size) => ({ size, color: 'White' })),
    reviews: [5, 4, 4, 5, 4],
    stock: 80,
  },
  {
    name: 'Terra Merino Crew Sweater',
    category: 'men-s-clothing',
    brand: 'terra',
    basePrice: 5999,
    description: 'Fine-gauge merino that layers under a jacket without bulk.',
    tags: ['sweater', 'merino', 'winter'],
    variants: [
      { size: 'M', color: 'Charcoal' },
      { size: 'L', color: 'Charcoal' },
      { size: 'L', color: 'Oat' },
    ],
    reviews: [5, 5, 4],
    stock: 40,
  },
  {
    name: 'Zephyr Tech Chinos',
    category: 'men-s-clothing',
    brand: 'zephyr',
    basePrice: 3299,
    description: 'Four-way stretch chinos with a hidden zip pocket. Wrinkle-resistant.',
    tags: ['trousers', 'chinos', 'stretch'],
    variants: [
      { size: '30', color: 'Stone' },
      { size: '32', color: 'Stone' },
      { size: '34', color: 'Navy' },
    ],
    reviews: [4, 3, 4, 4],
    stock: 65,
  },
  {
    name: 'Kestrel Basic Tee (3-pack)',
    category: 'men-s-clothing',
    brand: 'kestrel',
    basePrice: 999,
    description: 'Three combed-cotton crew tees. Plain, cheap, replaceable.',
    tags: ['t-shirt', 'basics', 'multipack'],
    variants: SIZES.map((size) => ({ size, color: 'Assorted' })),
    reviews: [3, 2, 3, 3, 4],
    stock: 200,
  },

  // ── Women's Clothing ──
  {
    name: 'Terra Linen Wrap Dress',
    category: 'women-s-clothing',
    brand: 'terra',
    basePrice: 4299,
    description: 'European linen with a self-tie waist. Creases, beautifully, on purpose.',
    tags: ['dress', 'linen', 'summer'],
    variants: [
      { size: 'S', color: 'Sand' },
      { size: 'M', color: 'Sand' },
      { size: 'M', color: 'Olive' },
    ],
    reviews: [5, 5, 4, 5],
    stock: 38,
  },
  {
    name: 'Zephyr Cloud Knit Cardigan',
    category: 'women-s-clothing',
    brand: 'zephyr',
    basePrice: 3799,
    description: 'An oversized cardigan with deep pockets and a dropped shoulder.',
    tags: ['cardigan', 'knit', 'oversized'],
    variants: [
      { size: 'S', color: 'Cream' },
      { size: 'M', color: 'Cream' },
      { size: 'L', color: 'Rust' },
    ],
    reviews: [4, 4, 5, 3],
    stock: 52,
  },
  {
    name: 'Lumen Silk Blouse',
    category: 'women-s-clothing',
    brand: 'lumen',
    basePrice: 6499,
    description: 'Mulberry silk with French seams and a concealed placket.',
    tags: ['blouse', 'silk', 'formal'],
    variants: [
      { size: 'S', color: 'Ivory' },
      { size: 'M', color: 'Ink' },
    ],
    reviews: [5, 4],
    stock: 24,
  },
  {
    name: 'Kestrel Jersey Leggings',
    category: 'women-s-clothing',
    brand: 'kestrel',
    basePrice: 1299,
    description: 'High-rise cotton-blend leggings with a wide waistband.',
    tags: ['leggings', 'basics'],
    variants: SIZES.slice(0, 3).map((size) => ({ size, color: 'Black' })),
    reviews: [2, 1, 3, 2],
    stock: 160,
  },

  // ── Footwear ──
  {
    name: 'Pinnacle Trail Runner GTX',
    category: 'footwear',
    brand: 'pinnacle',
    basePrice: 12999,
    description: 'Waterproof trail shoe with a rock plate and aggressive lugs.',
    tags: ['shoes', 'running', 'waterproof'],
    variants: ['8', '9', '10', '11'].map((size) => ({ size, color: 'Slate' })),
    reviews: [5, 4, 5, 5, 4, 5],
    stock: 44,
  },
  {
    name: 'Terra Leather Derby',
    category: 'footwear',
    brand: 'terra',
    basePrice: 8999,
    description: 'Goodyear-welted derby in full-grain leather. Resoleable.',
    tags: ['shoes', 'leather', 'formal'],
    variants: ['8', '9', '10'].map((size) => ({ size, color: 'Chestnut' })),
    reviews: [5, 5, 4],
    stock: 20,
  },
  {
    name: 'Zephyr Court Sneaker',
    category: 'footwear',
    brand: 'zephyr',
    basePrice: 4999,
    description: 'A clean low-top court sneaker with a cupsole and leather upper.',
    tags: ['sneakers', 'casual'],
    variants: ['7', '8', '9', '10'].map((size) => ({ size, color: 'White' })),
    reviews: [4, 4, 3, 4],
    stock: 88,
  },
  {
    name: 'Kestrel Foam Slides',
    category: 'footwear',
    brand: 'kestrel',
    basePrice: 799,
    description: 'One-piece EVA slides for the pool, the shower, or the bin.',
    tags: ['slides', 'budget'],
    variants: ['M', 'L'].map((size) => ({ size, color: 'Black' })),
    reviews: [1, 2, 1],
    stock: 0,
  },

  // ── Appliances ──
  {
    name: 'Aurora Precision Air Fryer 6L',
    category: 'appliances',
    brand: 'aurora',
    basePrice: 11499,
    description: 'Digital air fryer with a 6L basket, dishwasher-safe and genuinely quiet.',
    tags: ['kitchen', 'air-fryer', 'appliance'],
    variants: [{ color: 'Black' }],
    reviews: [5, 4, 5, 5, 4],
    stock: 48,
  },
  {
    name: 'Nimbus Cold Brew Coffee Maker',
    category: 'appliances',
    brand: 'nimbus',
    basePrice: 3499,
    description: 'Borosilicate carafe with a fine-mesh filter. Twelve hours, no electricity.',
    tags: ['kitchen', 'coffee'],
    variants: [{ size: '1L' }],
    reviews: [4, 5, 4],
    stock: 70,
  },
  {
    name: 'Pinnacle Stand Mixer 5.5L',
    category: 'appliances',
    brand: 'pinnacle',
    basePrice: 42999,
    description: 'Die-cast metal mixer with planetary action and a ten-year motor warranty.',
    tags: ['kitchen', 'baking', 'premium'],
    variants: [{ color: 'Cream' }, { color: 'Racing Green' }],
    reviews: [5, 5, 5, 4, 5],
    stock: 12,
  },
  {
    name: 'Kestrel Electric Kettle 1.7L',
    category: 'appliances',
    brand: 'kestrel',
    basePrice: 1499,
    description: 'Fast-boil kettle with auto shut-off and a washable limescale filter.',
    tags: ['kitchen', 'kettle', 'budget'],
    variants: [{ color: 'White' }],
    reviews: [3, 3, 4, 2],
    stock: 110,
  },
  {
    name: 'Vertex Robot Vacuum L9',
    category: 'appliances',
    brand: 'vertex',
    basePrice: 54999,
    description: 'Lidar mapping, self-emptying base and per-room no-go zones.',
    tags: ['cleaning', 'robot', 'premium'],
    variants: [{ color: 'Graphite' }],
    reviews: [],
    stock: 15,
  },

  // ── Cookware ──
  {
    name: 'Terra Cast Iron Skillet 12"',
    category: 'cookware',
    brand: 'terra',
    basePrice: 3999,
    description: 'Pre-seasoned cast iron with a helper handle. Will outlive you.',
    tags: ['cookware', 'cast-iron'],
    variants: [{ size: '12in' }],
    reviews: [5, 5, 5, 4, 5, 5],
    stock: 58,
  },
  {
    name: 'Pinnacle Tri-Ply Saucepan Set',
    category: 'cookware',
    brand: 'pinnacle',
    basePrice: 16999,
    description: 'Three fully-clad stainless saucepans with vented glass lids.',
    tags: ['cookware', 'stainless', 'set'],
    variants: [{ size: '3-piece' }],
    reviews: [5, 4, 4],
    stock: 30,
  },
  {
    name: 'Nimbus Ceramic Nonstick Pan',
    category: 'cookware',
    brand: 'nimbus',
    basePrice: 2299,
    description: 'PFOA-free ceramic coating with an oven-safe handle to 220°C.',
    tags: ['cookware', 'nonstick'],
    variants: [{ size: '24cm' }, { size: '28cm' }],
    reviews: [3, 2, 3, 3],
    stock: 95,
  },
  {
    name: 'Kestrel Bamboo Chopping Board',
    category: 'cookware',
    brand: 'kestrel',
    basePrice: 199,
    description: 'A plain bamboo board with a juice groove. Does one thing.',
    tags: ['cookware', 'budget'],
    variants: [{ size: 'Medium' }],
    reviews: [4, 3, 4],
    stock: 240,
  },

  // ── Sports & Outdoors ──
  {
    name: 'Pinnacle Carbon Road Bike',
    category: 'sports-outdoors',
    brand: 'pinnacle',
    basePrice: 139999,
    description: 'Full carbon frameset with electronic shifting and tubeless-ready wheels.',
    tags: ['cycling', 'premium', 'carbon'],
    variants: [{ size: '54cm' }, { size: '56cm' }],
    reviews: [5, 5, 4],
    stock: 6,
  },
  {
    name: 'Terra Insulated Bottle 750ml',
    category: 'sports-outdoors',
    brand: 'terra',
    basePrice: 1899,
    description: 'Double-walled steel that holds ice for 24 hours. Leakproof lid.',
    tags: ['hydration', 'steel'],
    variants: [{ color: 'Moss' }, { color: 'Charcoal' }],
    reviews: [5, 4, 5, 4, 5],
    stock: 175,
  },
  {
    name: 'Zephyr 2-Person Tent',
    category: 'sports-outdoors',
    brand: 'zephyr',
    basePrice: 9999,
    description: 'Freestanding three-season tent, 2.4kg packed, with a full-coverage fly.',
    tags: ['camping', 'tent'],
    variants: [{ color: 'Sunset' }],
    reviews: [4, 4, 3, 5],
    stock: 28,
  },
  {
    name: 'Kestrel Yoga Mat 6mm',
    category: 'sports-outdoors',
    brand: 'kestrel',
    basePrice: 1099,
    description: 'Closed-cell TPE mat with an alignment line and carry strap.',
    tags: ['yoga', 'fitness'],
    variants: [{ color: 'Teal' }, { color: 'Grey' }],
    reviews: [3, 4, 2, 3],
    stock: 130,
  },
  {
    name: 'Vertex Adjustable Dumbbell 24kg',
    category: 'sports-outdoors',
    brand: 'vertex',
    basePrice: 27999,
    description: 'Dial-adjustable from 2.5kg to 24kg, replacing fifteen pairs.',
    tags: ['fitness', 'strength'],
    variants: [{ size: 'Single' }, { size: 'Pair' }],
    reviews: [5, 4, 5, 5],
    stock: 19,
  },

  // ── Books ──
  {
    name: 'The Quiet Algorithm',
    category: 'books',
    brand: 'lumen',
    basePrice: 649,
    description:
      'A field guide to designing software that people can actually reason about. Paperback, 384 pages.',
    tags: ['book', 'technology', 'paperback'],
    variants: [{ format: 'Paperback' }, { format: 'Hardcover' }],
    reviews: [5, 5, 4, 5, 5],
    stock: 220,
  },
  {
    name: 'Salt, Smoke & Time',
    category: 'books',
    brand: 'lumen',
    basePrice: 1499,
    description: 'A cookbook about preservation, with 90 recipes and far too many photographs.',
    tags: ['book', 'cooking', 'hardcover'],
    variants: [{ format: 'Hardcover' }],
    reviews: [5, 4, 5],
    stock: 85,
  },
  {
    name: 'Notes from a Small Server',
    category: 'books',
    brand: 'lumen',
    basePrice: 399,
    description: 'Collected essays on the early web, written by someone who was there.',
    tags: ['book', 'essays'],
    variants: [{ format: 'Paperback' }],
    reviews: [3, 4, 3, 2],
    stock: 150,
  },
  {
    name: 'The Long Commute',
    category: 'books',
    brand: 'lumen',
    basePrice: 299,
    description: 'A novel about three people who take the same train and never speak.',
    tags: ['book', 'fiction'],
    variants: [{ format: 'Paperback' }],
    reviews: [],
    stock: 190,
  },
];
