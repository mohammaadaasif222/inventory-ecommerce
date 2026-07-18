import { INestApplicationContext, Logger } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DataSource } from 'typeorm';
import {
  HomepageSection,
  SectionType,
} from '../homepage-builder/schemas/homepage-section.schema';
import { NotificationTemplate } from '../notifications/schemas/notification-template.schema';
import { NotificationChannel } from '../notifications/enums/notification.enum';
import { Coupon } from '../coupons/entities/coupon.entity';
import { CouponType } from '../coupons/enums/coupon.enum';
import { Product } from '../products/entities/product.entity';
import { CART_ABANDONED_TEMPLATE } from '../carts/carts.constants';
import { ORDER_CONFIRMED_TEMPLATE } from '../orders/order-mailer';
import {
  Article,
  ArticleKind,
  ArticleStatus,
} from '../knowledge-base/schemas/article.schema';

/** Slides reference seeded perfume categories so the CTAs land somewhere real. */
const HERO_SLIDES = [
  {
    heading: 'Maison Noir — Nuit Blanche',
    subheading:
      'Tuberose, oud and a trail of smoke. The house signature, reformulated for its tenth year.',
    ctaLabel: 'Shop the collection',
    ctaHref: '/products?category=oriental',
    image: 'https://picsum.photos/seed/perfume-hero-noir/1600/900',
    align: 'left',
  },
  {
    heading: 'The Fresh Edit',
    subheading:
      'Bergamot, sea salt and vetiver — everything that smells like a window left open.',
    ctaLabel: 'Explore fresh',
    ctaHref: '/products?category=fresh',
    image: 'https://picsum.photos/seed/perfume-hero-fresh/1600/900',
    align: 'center',
  },
  {
    heading: 'Gourmand, but grown up',
    subheading:
      'Tonka, burnt sugar and black coffee. Sweet without the sugar rush.',
    ctaLabel: 'Discover gourmand',
    ctaHref: '/products?category=gourmand',
    image: 'https://picsum.photos/seed/perfume-hero-gourmand/1600/900',
    align: 'right',
  },
];

const TESTIMONIALS = [
  {
    quote:
      'I get asked what I am wearing every single time. It lasts through a twelve-hour day and still leaves something behind on the scarf.',
    author: 'Priya S.',
    location: 'Bengaluru',
  },
  {
    quote:
      'The sample set sold me. I went in for one bottle and came out with three — the woody range is extraordinary.',
    author: 'Arjun M.',
    location: 'Mumbai',
  },
  {
    quote:
      'Finally a house that does gourmand without it smelling like dessert. Restrained and genuinely grown up.',
    author: 'Neha I.',
    location: 'Delhi',
  },
];

const COUPONS = [
  {
    code: 'WELCOME10',
    type: CouponType.PERCENT,
    value: 10,
    minSpend: 1000,
    maxDiscount: 500,
    perUserLimit: 1,
    description: '10% off your first order (max ₹500)',
  },
  {
    code: 'FLAT500',
    type: CouponType.FIXED,
    value: 500,
    minSpend: 3000,
    description: '₹500 off orders over ₹3,000',
  },
  {
    code: 'FREESHIP',
    type: CouponType.FREE_SHIPPING,
    value: 0,
    minSpend: 999,
    description: 'Free shipping on orders over ₹999',
  },
];

const ABANDONED_EMAIL_BODY = `<p>Hi {{firstName}},</p>
<p>You left {{itemCount}} item(s) in your bag — we've kept them for you.</p>
<ul>
  {{#each items}}
  <li>{{this.name}} × {{this.quantity}} — {{../currency}} {{this.price}}</li>
  {{/each}}
</ul>
<p><strong>Subtotal: {{currency}} {{subtotal}}</strong></p>
<p><a href="{{cartUrl}}">Return to your bag</a></p>
<p>— The Maison</p>`;

/**
 * Journal posts for the storefront blog (`kind: post`). Written as editorial
 * content, not lorem ipsum, so the themed /blog demonstrates real pacing.
 */
const JOURNAL_POSTS: Array<{
  title: string;
  slug: string;
  excerpt: string;
  paragraphs: string[];
}> = [
  {
    title: 'How to make a fragrance last the whole day',
    slug: 'make-fragrance-last-all-day',
    excerpt:
      'Longevity is mostly technique, not concentration. Where you apply matters more than how much.',
    paragraphs: [
      'The biggest lever is skin, not spray count. Fragrance binds to moisture and lipids, so a scent applied to skin fresh from a shower — still warm, lightly moisturised — can outlast the same scent on dry skin by hours.',
      'Aim for pulse points that stay covered: chest and the base of the throat hold scent far longer than wrists that get washed a dozen times a day. A single spray in the hair (from distance) carries further than three on the forearm.',
      'Finally, resist the urge to rub. Rubbing wrists together crushes the volatile top notes and skips the opening act entirely — let it dry untouched and the composition unfolds the way the perfumer sequenced it.',
    ],
  },
  {
    title: 'Top, heart, base: reading a scent pyramid honestly',
    slug: 'reading-the-scent-pyramid',
    excerpt:
      'The pyramid on the box is a promise about time, not a list of ingredients.',
    paragraphs: [
      'A note pyramid is a timeline. Top notes are what you smell in the first fifteen minutes — bright, volatile molecules that evaporate fast. The heart is the fragrance’s actual character, emerging as the opening lifts. The base is what your collar remembers tomorrow.',
      'This is why judging a perfume on the first spray is like judging a film by its trailer. The shop-strip impression is nearly all top notes; the scent you will actually live with is the heart-to-base transition, which needs an hour on skin to show itself.',
      'When you test, wear one scent per arm at most, and walk away from the counter. Smell it again at the thirty-minute mark and once more after lunch. Buy the drydown, not the opening.',
    ],
  },
  {
    title: 'Attar, EDT, EDP: what concentration actually changes',
    slug: 'attar-edt-edp-concentration',
    excerpt:
      'Concentration decides how a scent behaves in a room — projection, sillage and sitting distance.',
    paragraphs: [
      'Eau de toilette sits around 5–15% aromatic oils, eau de parfum 15–25%, and traditional attars are oil all the way down. More oil does not simply mean “stronger” — it changes the shape of the scent around you.',
      'An EDT projects: it announces you within the first hour and then politely leaves. An EDP carries: lower projection at any moment, but a presence that persists into the evening. An attar wears closest of all — a private scent for the people allowed within arm’s reach.',
      'Choose by the room you will be in. Open offices reward the discretion of an oil; a winter evening out can carry an EDP’s weight; high summer almost always wants the levity of an EDT.',
    ],
  },
];

const ORDER_CONFIRMED_EMAIL_BODY = `<p>Hi {{firstName}},</p>
<p>Thank you — your order <strong>{{orderNumber}}</strong> is confirmed.</p>
<ul>
  {{#each items}}
  <li>{{this.name}} × {{this.quantity}} — {{../currency}} {{this.price}}</li>
  {{/each}}
</ul>
<p><strong>Total: {{currency}} {{grandTotal}}</strong></p>
<p><a href="{{orderUrl}}">View your order</a></p>
<p>We'll email you again when it ships.</p>`;

/**
 * Seeds storefront content: homepage sections, demo coupons, transactional
 * email templates and journal posts. Idempotent — each row is matched on its
 * natural key and only created when missing.
 */
export async function seedStorefront(
  app: INestApplicationContext,
  logger: Logger,
): Promise<void> {
  const dataSource = app.get(DataSource);
  const sections = app.get<Model<HomepageSection>>(
    getModelToken(HomepageSection.name),
  );
  const templates = app.get<Model<NotificationTemplate>>(
    getModelToken(NotificationTemplate.name),
  );
  const articles = app.get<Model<Article>>(getModelToken(Article.name));
  const couponRepo = dataSource.getRepository(Coupon);
  const productRepo = dataSource.getRepository(Product);

  // ── homepage sections ──
  // Featured rails reference real products so the carousels aren't empty.
  const topRated = await productRepo
    .createQueryBuilder('p')
    .where('p.status = :s', { s: 'ACTIVE' })
    .andWhere('p.ratingCount > 0')
    .orderBy('p.ratingAverage', 'DESC')
    .take(8)
    .getMany();
  const newest = await productRepo.find({
    where: { status: 'ACTIVE' as Product['status'] },
    order: { createdAt: 'DESC' },
    take: 8,
  });

  const desired: Partial<HomepageSection>[] = [
    {
      type: SectionType.HERO_BANNER,
      title: 'Hero',
      order: 0,
      isVisible: true,
      config: { slides: HERO_SLIDES, autoplayMs: 6000 },
    },
    {
      type: SectionType.FEATURED_PRODUCTS,
      title: 'Best sellers',
      order: 1,
      isVisible: true,
      config: {
        subtitle: 'What the house is known for',
        productIds: topRated.map((p) => p.id),
      },
    },
    {
      type: SectionType.COUNTDOWN_TIMER,
      title: 'Festive edit — 20% off oriental',
      order: 2,
      isVisible: true,
      config: {
        subtitle: 'Use code WELCOME10 at checkout',
        // Always ~3 days out from the seed run so the timer is live in a demo.
        endsAt: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString(),
        ctaLabel: 'Shop the edit',
        ctaHref: '/products?category=oriental',
      },
    },
    {
      type: SectionType.FEATURED_PRODUCTS,
      title: 'New arrivals',
      order: 3,
      isVisible: true,
      config: {
        subtitle: 'Fresh from the atelier',
        productIds: newest.map((p) => p.id),
      },
    },
    {
      type: SectionType.TESTIMONIALS,
      title: 'What people say',
      order: 4,
      isVisible: true,
      config: { items: TESTIMONIALS },
    },
    {
      type: SectionType.NEWSLETTER,
      title: 'Join the list',
      order: 5,
      isVisible: true,
      config: {
        text: 'Early access to new releases and a sample with your first order.',
      },
    },
  ];

  let sectionsCreated = 0;
  for (const s of desired) {
    // Keyed on type+title so re-runs update config rather than duplicate.
    const existing = await sections.findOne({ type: s.type, title: s.title });
    if (existing) {
      await sections.updateOne({ _id: existing._id }, { $set: { config: s.config } });
      continue;
    }
    await sections.create(s);
    sectionsCreated += 1;
  }

  // ── coupons ──
  let couponsCreated = 0;
  for (const c of COUPONS) {
    const existing = await couponRepo.findOne({ where: { code: c.code } });
    if (existing) continue;
    await couponRepo.save(couponRepo.create(c));
    couponsCreated += 1;
  }

  // ── transactional email templates ──
  const templateExists = await templates.findOne({
    key: CART_ABANDONED_TEMPLATE,
  });
  if (!templateExists) {
    await templates.create({
      key: CART_ABANDONED_TEMPLATE,
      channel: NotificationChannel.EMAIL,
      subject: 'You left something behind, {{firstName}}',
      body: ABANDONED_EMAIL_BODY,
      isActive: true,
    });
  }

  const confirmExists = await templates.findOne({
    key: ORDER_CONFIRMED_TEMPLATE,
  });
  if (!confirmExists) {
    await templates.create({
      key: ORDER_CONFIRMED_TEMPLATE,
      channel: NotificationChannel.EMAIL,
      subject: 'Order {{orderNumber}} confirmed',
      body: ORDER_CONFIRMED_EMAIL_BODY,
      isActive: true,
    });
  }

  // ── journal posts (storefront /blog) ──
  let postsCreated = 0;
  for (const post of JOURNAL_POSTS) {
    const exists = await articles.findOne({ slug: post.slug });
    if (exists) continue;
    await articles.create({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      blocks: post.paragraphs.map((text) => ({
        type: 'paragraph',
        data: { text },
      })),
      searchText: [post.title, post.excerpt, ...post.paragraphs].join(' '),
      kind: ArticleKind.POST,
      status: ArticleStatus.PUBLISHED,
      publishedAt: new Date(),
    });
    postsCreated += 1;
  }

  logger.log('──────────────────────────────────────────────');
  logger.log('✅ Storefront content seeded');
  logger.log(`   homepage sections: ${sectionsCreated} new (${desired.length} total)`);
  logger.log(`   coupons:           ${couponsCreated} new — WELCOME10, FLAT500, FREESHIP`);
  logger.log(`   email templates:   ${CART_ABANDONED_TEMPLATE}, ${ORDER_CONFIRMED_TEMPLATE}`);
  logger.log(`   journal posts:     ${postsCreated} new (${JOURNAL_POSTS.length} total)`);
  logger.log('──────────────────────────────────────────────');
}
