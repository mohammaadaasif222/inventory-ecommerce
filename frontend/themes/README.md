# Theme engine

A theme is a self-contained package in this directory. Installing one is a
filesystem operation — drop a folder in, run `npm run themes:sync`, and it is
selectable in **Admin → Website → Theme**. No route, component or backend file
changes.

## Anatomy

```
themes/<slug>/
  theme.config.json          required — identity, tokens, layout, checkout shape
  templates/<template>.tsx   optional — overrides a page
  components/<slot>.tsx      optional — overrides a recurring component
```

`<slug>` must match `theme.config.json`'s `slug`: the directory name is the id
the registry, the database's active-theme field and the resolver all agree on.

**Templates** (`templates/*.tsx`) — one per page: `home`, `category`, `product`,
`cart`, `checkout`, `account`, `search`, `blog`, `not-found`. Each default-exports
a component typed by `contract.ts`.

**Slots** (`components/*.tsx`) — recurring pieces: `header`, `footer`,
`product-card`, `hero`, `filter-sidebar`, `checkout-stepper`,
`order-confirmation`.

## Inheritance

`extends` points at a parent slug. Resolution is **nearest-first**: asking
Maison for `product` checks Maison, then `base`. Override what you want, inherit
the rest — the WordPress child-theme rule.

This is why Maison, Noir and Botanica are ~70 lines of JSON each with zero
template files: they are pure token deltas over `base`. Essence and Universal
extend the same base but override templates where their design genuinely
differs.

A theme with no `extends` is a root theme and must implement all nine templates
itself. `sync-themes.mjs` rejects one that doesn't, rather than letting a
visitor find the gap.

## Tokens

`tokens.colors.light` / `.dark` are the shadcn token contract plus three
storefront tokens (`brand`, `brand-foreground`, `ink`). Because they *are* the
shadcn contract, a theme's palette reaches every `components/ui` primitive for
free — which is why checkout is themed rather than falling back to something
unstyled.

Values are **bare HSL** — `"36 46% 52%"`, not `hsl(...)` and not hex.

Fonts are keys, not family names (`cormorant`, `fraunces`, `jost`, `sans`).
`next/font` can only load faces declared at build time, so adding one means a
declaration in `app/layout.tsx` plus an entry in `FONT_VARS`.

## Layout

Design and arrangement are orthogonal. A theme names a `layoutPreset`
(`classic` / `editorial` / `compact` — see `layouts.ts`) and may override
individual fields; the merchant can switch preset in the customiser. Five themes
× three layouts.

Templates read layout *fields* (`layout.density`, `layout.filters`) rather than
branching on a theme slug. Keep it that way: the moment a template asks "am I
Essence?", adding a theme stops being free.

## How rendering works

1. `app/(storefront)/layout.tsx` calls `getActiveTheme()` → the API (Redis-cached).
2. `resolver.ts` flattens the `extends` chain and dynamically imports the
   template.
3. `ThemeRuntime` writes both palettes as inline CSS variables; `globals.css`
   binds one to the shadcn tokens based on `.dark`.

All server-side, so the first byte is already themed — no flash, and crawlers
see the real markup.

## Gotchas

- **Run `npm run themes:sync`** after adding/removing a package, template or
  slot. `predev`/`prebuild` do it too. The generated `registry.generated.ts` is
  a build artifact — never edit it.
- **Tailwind must see your classes.** `tailwind.config.ts` includes
  `./themes/**/*.{ts,tsx}`. Without it, classes are purged silently — the build
  passes and the page renders unstyled.
- **Never write `--background` inline.** Inline styles outrank stylesheet
  rules, so a `.dark` selector could never override it. Emit `--light-*` /
  `--dark-*` and let `globals.css` choose. See `themeStyleVars`.
- **Contract changes are breaking.** Adding an optional prop is safe; reshaping
  an existing one breaks every installed theme.

## Adding a theme

```bash
mkdir themes/mytheme
# write theme.config.json with { "slug": "mytheme", "extends": "base", ... }
npm run themes:sync
```

It now appears in the admin. Override a template only when the design needs a
different structure — if it only needs different colours, tokens are enough.
