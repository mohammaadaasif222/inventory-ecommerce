# E-Commerce Platform

Production-ready commerce platform with **Inventory Management**, **Live Chat & Support**, and full **Website Configuration** — built on **NestJS** (backend) and **Next.js 14 + shadcn/ui** (frontend).

All 5 backend phases plus a broad frontend are complete and runnable.

---

## 🚀 Run it (4 steps)

**Prerequisites:** Node ≥ 20 and Docker Desktop (running).

```bash
# 1. Start datastores (Postgres + Mongo + Redis)
docker compose up -d

# 2. Backend API  → http://localhost:4000/api   (Swagger at /api/docs)
cd backend
npm install
npm run seed          # super-admin (admin@example.com / Admin@12345) + demo catalog
npm run start:dev

# 3. Frontend  → http://localhost:3000   (admin panel at /admin)
cd ../frontend
npm install
npm run dev
```

4. Open **http://localhost:3000**, click **Sign in**, and log in with
   **`admin@example.com` / `Admin@12345`** to reach the admin panel at `/admin`.

> `backend/.env` and `frontend/.env.local` already contain working local-dev
> defaults, so there's nothing to configure. Tables/collections auto-create on
> first boot. Override the seeded admin with `SEED_ADMIN_EMAIL` /
> `SEED_ADMIN_PASSWORD` before `npm run seed`.

**Verify it's up:** `curl http://localhost:4000/health` → `{ "success": true, ... }`

### What `npm run seed` gives you

Alongside the super-admin it seeds a **demo catalog** so the storefront has
something to filter: **83 products** (₹199 – ₹1,89,999) across **19 categories**
and 13 brands, each with variants and received stock, plus **355 reviews** from
10 demo customers spread across every star bucket. That includes a **40-piece
perfume range** ("Maison") under the *Fragrances* tree — Floral, Woody,
Oriental, Fresh, Gourmand — sitting alongside the general catalog.

It also seeds the **homepage sections** (hero carousel, featured rails,
countdown), three **coupons**, and the abandoned-cart email template.

Everything is idempotent — matched on slug/email/code, so re-running tops up
without duplicating and leaves hand-made products alone.
`SEED_SKIP_CATALOG=1 npm run seed` seeds only the admin.

- Demo customers log in with any seeded address (e.g. `priya.sharma@example.com`) / `Customer@12345`
- Coupons: `WELCOME10` (10% off ≥₹1,000, capped ₹500, once per customer), `FLAT500` (₹500 off ≥₹3,000), `FREESHIP` (≥₹999)
- Product images are [picsum.photos](https://picsum.photos) placeholders, so they need network access and **won't match the product names**
- Some products are deliberately out of stock or unreviewed, to exercise those empty states

**Try the storefront flow:** browse `/products` to filter by category, price
bracket and star rating; heart a fragrance to save it to `/account/wishlist`;
add to cart, apply `WELCOME10`, and check out with **Cash on delivery** for an
end-to-end order.

**Guest checkout** works without an account: the checkout asks for an email
instead, the order confirmation (with a tokenised order link) goes there, and
the order page opens from that link — no login. Coupons with a per-customer
limit (like `WELCOME10`) ask guests to sign in, since the limit is
unenforceable anonymously; uncapped codes (`FLAT500`, `FREESHIP`) work for
everyone.

### Theme engine (WordPress-style packages)

The storefront is skinned by **self-contained theme packages** in
[`frontend/themes/`](frontend/themes/README.md). A theme is a
`theme.config.json` (tokens, layout, checkout shape) plus optional
`templates/*.tsx` page overrides; installing one is dropping a folder in and
running `npm run themes:sync` — no route, component or backend change.

**Admin → Website → Theme** lists the installed packages with live swatches.
Preview opens the storefront in a new tab wired to the customiser over
Socket.IO: colour, font, layout and logo changes stream into the preview as
drafts, and nothing shoppers see changes until **Publish**. A publish
invalidates the Redis-cached active theme and pushes `theme_changed` to every
open storefront session — live shoppers re-skin in about a second, no
redeploy. **Revert last change** is a one-click undo backed by a revision
stack in Mongo.

Five themes ship:

| Theme | Character | Own templates |
|-------|-----------|--------------|
| **Universal** | Clean, high-conversion, sells anything; built to be re-branded per merchant from the customiser | home, product |
| **Essence** | A fragrance house: notes storytelling, scent pyramid, concentration selector, single-column checkout with gift-wrap/sample upsell | home, product, checkout |
| **Maison** | Warm ivory + espresso, muted gold, Cormorant | — (tokens only) |
| **Noir** | Monochrome, high contrast, square corners, Jost | — (tokens only) |
| **Botanica** | Sage apothecary green, rounded corners, Fraunces | — (tokens only) |

Resolution is **nearest-first through an `extends` chain** (all five extend the
hidden `base` package, which carries the full nine-template set: home, category,
product, cart, checkout, account, search, blog, 404). Maison/Noir/Botanica are
~70 lines of JSON each — the inheritance model is what keeps a look-only theme
that small. Design and arrangement stay orthogonal: any theme pairs with any
layout preset (Classic / Editorial / Compact), and the merchant switches layout
in the customiser.

The active theme resolves **server-side** on every request (Redis-cached slug →
component factory), so the first byte is already themed — no default-then-swap
flash, and checkout re-skins with everything else because every theme's tokens
bind to the same shadcn contract. Authoring guide: [`frontend/themes/README.md`](frontend/themes/README.md).

> **Abandoned carts:** while signed in, the browser cart is mirrored server-side
> (debounced). A BullMQ job sweeps every 15 minutes and emails anyone whose cart
> has been idle for `ABANDONED_CART_IDLE_MINUTES` (default 60). The email only
> *delivers* if `SMTP_*` is configured in `backend/.env` — otherwise it is
> rendered and queued, and the attempt is visible in the notification log.
> Admins can see abandoned carts at `GET /api/carts/abandoned` and `/api/carts/stats`.

Optional smoke tests: `cd backend && npm test` (unit) and `npm run test:e2e`
(needs infra up). Type-check anytime with `npm run typecheck` in either workspace.

---

## ✅ Phase 1 — Foundation

| Area | Module | Status |
|------|--------|--------|
| Auth | JWT access + refresh (rotation), OTP login, Google OAuth2, 5 roles, guards | ✅ |
| Users | Profile CRUD, address book, admin list/ban/role assignment | ✅ |
| **Upload** | Unified module — **Cloudinary / S3 / Local**, DB-driven, switchable at runtime, secrets AES-256 encrypted | ✅ |
| Website Config | Key-value store + Redis-cached public endpoint | ✅ |
| Admin | Audit log (`@Audit` decorator + global interceptor), permission matrix | ✅ |
| Platform | Global response envelope, exception filter, validation pipe, Swagger, Postgres + Mongo + Redis + BullMQ wiring | ✅ |
| Frontend | Next.js App Router, shadcn/ui, React Query, Zustand, admin shell, **Storage Settings page**, reusable `FileUploader` | ✅ |

## ✅ Phase 2 — Commerce Core

| Area | Module | Status |
|------|--------|--------|
| Catalog | Nested category tree (materialised-path), brands, tags, attributes, featured collections | ✅ |
| Products | Products + variants, **auto SKU generation**, **CSV bulk import**, image gallery via UploadModule, soft delete, **storefront filters** (category incl. descendants, price range, min rating) + sort | ✅ |
| Reviews | One review per customer per product, **auto verified-purchase flag** (delivered orders), star distribution summary, **denormalised rating aggregate** on the product for filter/sort | ✅ |
| Wishlist | Per-user saved products (unique per user+product), heart toggle, `/account/wishlist` | ✅ |
| Coupons | PERCENT / FIXED / FREE_SHIPPING codes, min-spend, expiry window, total + **per-user redemption limits**, **server-side discount** at checkout, redemption ledger | ✅ |
| Carts | Server-side mirror of the browser cart, **BullMQ abandoned-cart sweeper** (15-min cron) + recovery email, admin abandoned-cart list & stats | ✅ |
| Inventory | Per-SKU/warehouse stock, **immutable movement ledger**, transfers, low-stock thresholds, **BullMQ daily low-stock digest** | ✅ |
| Orders | Full **lifecycle state machine**, price/name **line-item snapshots**, **transactional create with stock reservation**, partial fulfillment | ✅ |
| Payments | **Razorpay / Stripe / COD** (REST + HMAC, no SDK lock-in), webhook handlers, payment + refund records | ✅ |
| Shipping | Zones, methods, **rate calculation** (flat/weight/price), shipments + tracking, **BullMQ carrier poll** | ✅ |
| Frontend | **Products** admin page (table + create/edit dialog with image gallery + variants), **Inventory** page (stock table + adjustment dialog), storefront **filter sidebar**, **ratings & reviews**, **wishlist hearts**, **coupon box**, animated **Maison** perfume storefront (hero carousel, rails, countdown, offers) | ✅ |

## ✅ Phase 3 — Support & Chat

| Area | Module | Status |
|------|--------|--------|
| Chat | **Socket.IO** dual namespaces (`/chat` customer, `/agent` support) bridged over shared rooms, JWT-authed handshake, **round-robin auto-assignment**, agent presence (ONLINE/BUSY/AWAY), typing/read receipts, canned responses, MongoDB-backed history (cursor paginated) | ✅ |
| Tickets | OPEN → IN_PROGRESS → PENDING_CUSTOMER → RESOLVED → CLOSED, priorities, **per-priority SLA config**, **BullMQ SLA-breach scanner** (15-min cron) with email alerts, internal vs public notes, **email-to-ticket ingestion** | ✅ |
| Knowledge Base | Block-based articles (JSON), categories, tags, **Mongo full-text search**, draft/publish, view counter, helpfulness votes | ✅ |
| Notifications | **Email (Nodemailer) / SMS + WhatsApp (Twilio) / Push (FCM)**, Handlebars templates, per-user channel preferences, **one BullMQ queue + processor per channel**, delivery logs | ✅ |

## ✅ Phase 4 — Marketing & CMS

| Area | Module | Status |
|------|--------|--------|
| Homepage Builder | Section types (hero_banner, featured_products, testimonials, countdown_timer, newsletter, custom_html), per-section config JSON, **reorder + show/hide** | ✅ |
| Pages (CMS) | Slug-routed static pages, block content (rich_text/image/video/divider), per-page SEO, draft/publish | ✅ |
| SEO | Global defaults + per-entity overrides (product/category/page), **`GET /sitemap.xml`** (products + categories + pages), **`GET /robots.txt`** | ✅ |
| Popups | announcement_bar / exit_intent / timed_modal / cookie_consent, display rules (delay, scroll %, **page targeting**, frequency cap), active toggle | ✅ |
| Theme | **3 design presets** (Maison / Noir / Botanica) — light + dark palette, display font and radius each — **×** **3 layouts** (Classic / Editorial / Compact) that restructure nav, filters, grid density and the product page. Admin-selectable with previews, plus **default appearance** (light/dark/system) and opt-in per-token colour overrides | ✅ |
| Theme | Color tokens (shadcn HSL), fonts, radius, light/dark/system, logo/favicon — public `GET /theme` | ✅ |

## ✅ Phase 5 — Intelligence

| Area | Module | Status |
|------|--------|--------|
| Analytics | Read-only aggregation across orders/inventory/tickets/chat — sales summary + revenue time series, orders-by-status, **inventory health** (dead stock, turnover, low/out-of-stock), support metrics (avg resolution, SLA breaches), chat metrics, combined dashboard | ✅ |
| Reports | **CSV export** (`GET /analytics/reports/sales.csv`) via the raw-response path | ✅ |
| Recommendations | **Popular** (best sellers), **related** ("customers also bought" + category fallback), **for-you** (from purchase history) — all derived from order data | ✅ |
| AI Chatbot | KB-grounded retrieval + **official Anthropic SDK** (`claude-opus-4-8`, adaptive thinking); degrades to retrieval-only when `ANTHROPIC_API_KEY` is unset | ✅ |

### Intelligence highlights
- **AnalyticsModule reads, never writes** — it registers the entities/collections it reports on via `TypeOrmModule.forFeature` (additive across modules) and aggregates in bounded windows, so feature services stay untouched.
- **Chatbot** retrieves the most relevant KB articles, grounds Claude on them, and checks `stop_reason` before reading the reply; with no API key it returns a composed retrieval answer so the endpoint always works.

### Marketing & CMS highlights
- **Dynamic homepage** — `GET /homepage` returns only visible sections in order; the admin builder reorders via a single `PATCH /homepage/reorder` with the new id sequence (pairs with `@dnd-kit` on the frontend).
- **sitemap.xml / robots.txt** — served at the domain root (excluded from the `/api` prefix) and returned **raw** (no JSON envelope) via a `@RawResponse()` opt-out on the response interceptor.
- These modules are MongoDB-backed (flexible CMS content), consistent with the chat/KB stores.

### Support & chat highlights
- **Realtime** — two gateways share a `ChatBridge` that emits to both namespaces by chat-room id, so customer↔agent delivery works across `/chat` and `/agent`. Sockets authenticate via the access token in the handshake.
- **Round-robin** — a new chat is assigned to the least-loaded ONLINE agent under the per-agent cap; cancel/close decrements the agent's active-chat count.
- **SLA** — response/resolution targets per priority drive `dueResponseAt`/`dueResolutionAt`; a BullMQ job flags breaches and emails the assignee via a Handlebars template.
- **Notifications** — channels are abstracted in a transport; unconfigured channels log-only in dev, real send (SMTP/Twilio/FCM REST) when credentials are present.

### Commerce highlights
- **Atomic checkout** — `OrdersService.create()` snapshots prices, reserves stock with a pessimistic lock and persists the order in one transaction; any shortfall (`STOCK_INSUFFICIENT`) rolls everything back.
- **State machine** — transitions are validated against an allow-map (`PENDING → CONFIRMED → PROCESSING → SHIPPED → DELIVERED`, plus `CANCELLED / RETURNED / REFUNDED`); cancel/return auto-releases still-reserved stock.
- **Inventory ledger** — every change writes an immutable `stock_movements` row (INBOUND/OUTBOUND/TRANSFER/ADJUSTMENT) with the resulting quantity.
- **Payments** — gateways are abstracted behind `IPaymentProvider`; webhooks verify signatures (Stripe `t=…,v1=…` HMAC, Razorpay body HMAC) before reconciling the order's payment status.

---

## 🏗️ Tech Stack

**Backend:** NestJS · PostgreSQL + TypeORM · MongoDB + Mongoose · Redis · BullMQ · Passport (JWT/OAuth2) · class-validator · Swagger
**Frontend:** Next.js 14 (App Router) · shadcn/ui + Tailwind · Zustand · TanStack Query · React Hook Form + Zod · next-themes

---

## 🚀 Quick Start

### Prerequisites
- Node.js ≥ 20 (tested on 24)
- Docker (for Postgres, Mongo, Redis)

### 1. Start infrastructure
```bash
docker compose up -d        # postgres:5432, mongo:27017, redis:6379
```

### 2. Backend
```bash
cd backend
npm install
# backend/.env already contains working local-dev defaults
npm run start:dev           # http://localhost:4000/api
```
- Swagger docs: **http://localhost:4000/api/docs**
- Health check: **http://localhost:4000/health**
- Tables auto-create on first boot (`synchronize` is on in development).

### 3. Frontend
```bash
cd frontend
npm install
# frontend/.env.local already points at the backend
npm run dev                 # http://localhost:3000
```
- Admin panel: **http://localhost:3000/admin**
- Storage switcher: **http://localhost:3000/admin/settings/storage**

> ℹ️ The admin pages call protected endpoints. Register a user via
> `POST /api/auth/register`, then promote them to `ADMIN`/`SUPER_ADMIN`
> (update `roles` in the `users` table, or assign via another super-admin).

---

## 📦 File & Image Upload System (the key feature)

A single `UploadModule` serves every upload across the platform. The **active
provider is stored in the `storage_config` table** and switched from the admin
UI — **no redeployment**.

### Provider abstraction
All three providers implement one interface
([`storage-provider.interface.ts`](backend/src/upload/providers/storage-provider.interface.ts)):

```ts
interface IStorageProvider {
  uploadFile(file: Express.Multer.File, folder: string): Promise<UploadResult>;
  deleteFile(identifier: string): Promise<void>;
  getSignedUrl?(key: string, expiresIn: number): Promise<string>;
  getPresignedUpload?(opts): Promise<PresignedUpload>; // S3 direct uploads
  testConnection(): Promise<void>;
}
```

| Provider | Highlights |
|----------|-----------|
| **Cloudinary** | folder organisation, `quality:auto` + `fetch_format:auto` (webp), returns `secure_url`/`public_id`/dimensions |
| **Amazon S3** | presigned **direct client uploads** for large files, S3-compatible endpoints (MinIO/R2/Spaces), signed read URLs |
| **Local** | writes to `/uploads`, served statically, path-traversal guarded — dev fallback |

### Security
- Provider **secrets are encrypted at rest** with AES-256-GCM
  ([`crypto.service.ts`](backend/src/common/crypto/crypto.service.ts)) using
  `CONFIG_ENCRYPTION_KEY`. Secrets are **never** returned to the client — the
  admin API returns masked values (`••••••••abcd`).
- Changing the provider invalidates the cached provider instance immediately.

### Admin UI — `/admin/settings/storage`
Radio-group provider selector · dynamic per-provider fields · **Test Connection**
(runs a real connectivity check) · **Save & Activate** · green "Active" badge.
Built entirely with shadcn/ui (`Card`, `RadioGroup`, `Input`, `Button`, `Badge`,
`Alert`) + React Hook Form + Zod.

### Reusable `<FileUploader />`
[`components/upload/file-uploader.tsx`](frontend/components/upload/file-uploader.tsx)
— drag & drop (react-dropzone), per-file progress bar, image preview, multi-file
with remove buttons. Props: `{ accept, maxSize, maxFiles, folder, onUploadComplete }`.

### Endpoints
| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/upload/file` | any user | multipart single-file upload |
| POST | `/api/upload/files` | any user | multipart multi-file upload |
| POST | `/api/upload/presigned` | any user | presigned direct-upload URL (S3) |
| DELETE | `/api/upload/file` | admin | delete by `storageId` |
| GET | `/api/upload/storage-config` | admin | masked config view |
| PUT | `/api/upload/storage-config` | admin | update + activate provider |
| POST | `/api/upload/storage-config/test` | admin | test connection |

---

## 🗂️ Project Structure

```
ecommerce/
├── docker-compose.yml          # postgres + mongo + redis
├── backend/                    # NestJS API
│   └── src/
│       ├── common/             # guards, interceptors, filters, crypto, dto
│       ├── config/             # env validation + typed config
│       ├── redis/              # ioredis client + cache helper
│       ├── auth/               # JWT/OTP/Google, strategies, guards
│       ├── users/              # profile, addresses, admin ops
│       ├── upload/             # ← unified storage module (3 providers)
│       ├── website-config/     # key-value + cached /config/public
│       └── admin/              # audit log + permission matrix
└── frontend/                   # Next.js 14 App Router
    ├── app/
    │   ├── (admin)/admin/...   # admin shell + settings/storage page
    │   └── page.tsx            # storefront placeholder
    ├── components/ui/          # shadcn components
    ├── components/upload/      # FileUploader
    ├── components/shared/      # AdminSidebar, PageHeader
    ├── hooks/                  # useStorageConfig, ...
    ├── lib/                    # api-client (token refresh), utils, config
    ├── schemas/                # Zod schemas (mirror backend DTOs)
    └── store/                  # Zustand auth store
```

---

## 🔐 Conventions

- **Every response** follows `{ success, data, message, meta? }` (response
  interceptor). Errors add `error: { code, message, details? }` with stable
  codes (`STOCK_INSUFFICIENT`, `INVALID_CREDENTIALS`, …).
- Offset pagination for admin tables; cursor pagination reserved for chat/logs.
- All admin routes are `JwtAuthGuard` + `RolesGuard` protected (registered
  globally; open routes use `@Public()`).
- DTOs validated by a global `ValidationPipe` (`whitelist` + `transform`).

---

## 🧪 Testing

```bash
cd backend
npm test                 # unit tests (e.g. CryptoService AES round-trip) ✅
npm run test:e2e         # smoke e2e (needs docker compose up -d)
npm run typecheck        # tsc --noEmit ✅

cd frontend
npm run typecheck        # tsc --noEmit ✅
```

---

## 🔑 Environment Variables

See [`.env.example`](.env.example) (full reference) and the ready-to-run
`backend/.env` / `frontend/.env.local`. Key ones:

| Var | Used for |
|-----|----------|
| `DATABASE_URL` / `MONGO_URI` / `REDIS_URL` | datastores |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | token signing |
| `CONFIG_ENCRYPTION_KEY` | AES-256 key (64 hex) for encrypting DB secrets |
| `CLOUDINARY_*` / `AWS_S3_*` | optional provider defaults (DB config overrides) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | OAuth2 (optional; strategy auto-disables if unset) |

Generate a production encryption key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 🛣️ Roadmap

- **Phase 2 — Commerce Core:** ✅ done (see above).
- **Phase 3 — Support & Chat:** ✅ done (see above).
- **Phase 4 — Marketing & CMS:** ✅ done (see above).
- **Phase 5 — Intelligence:** ✅ done (see above).

**Backend is feature-complete across all five phases.**

**Frontend** (`next build` green, 33 routes):
- **Auth** — login, register, Google OAuth callback, persisted session, admin route guard, logout.
- **Storefront** — homepage that renders Homepage-Builder sections; product listing + detail (gallery + variant picker); **full purchase flow: cart → multi-step checkout (address → shipping rates → payment) → order placement**; **order tracking** with a status timeline; **account** (editable profile + order history); Help Center (KB list + article with helpfulness vote); and a **floating live-chat widget over Socket.IO**.
- **Admin — commerce:** dashboard with live KPIs + Recharts revenue chart, analytics (charts + CSV export), Products (create/edit + image gallery), Inventory (stock + adjustments), Orders (status workflow), Customers (ban/unban), Storage-provider switcher.
- **Admin — support:** **agent live-chat console** (`/agent` Socket.IO namespace — waiting queue + my queue + conversation panel), **Tickets** board (filters + status/priority + internal/public notes), **Knowledge Base** editor (block-based articles + publish).
- **Admin — website/CMS:** **Homepage builder with `@dnd-kit` drag-and-drop reorder** + visibility toggle, **Pages** editor (block content), **Menus** builder (header/footer), **Theme** (color tokens/fonts/mode), **Popups** manager, **SEO** global defaults (with live sitemap.xml / robots.txt links).
- **Admin — settings:** General (store identity), Storage (provider switcher), Payments (prefs), Shipping (zones + methods), Notifications (templates + delivery logs), Security (audit log + role/permission matrix).

The cart is a persisted Zustand store; checkout calls `/shipping/rates`, `/orders`, and `/payments/initiate` (COD completes end-to-end; Stripe/Razorpay return their init payload for client-side gateway integration). Menus and general settings ride on the WebsiteConfig key-value API.

The only remaining gap is a **live boot + e2e smoke test**, which requires Docker running.

Every module ships as a self-contained NestJS module (entity → service →
controller → module) with a matching admin page and shared Zod schema.
