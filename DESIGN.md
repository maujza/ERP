# DESIGN.md — Aurelia Frontend Guide

Living document of Aurelia's actual frontend. Describes the current visual direction, the main components, and the decisions that are actually implemented today.

**Audience:** development and future UI sessions.
**Last updated:** 2026-04-06

## Product

Aurelia isn't just a store. The frontend today covers four distinct surfaces:

- B2B/mobile-first storefront
- catalog and product pages for wholesale sales
- checkout
- visual backoffice for commercial operations

The visual stack aims to make all of those pieces feel like part of the same product, without becoming a heavy corporate interface.

## Current visual direction

The app today rests on these ideas:

1. **Neutral, warm base.** Very light cream background, white surfaces, soft borders.
2. **Strong, commercial accent.** The visible brand color is red/fuchsia, used for CTAs, badges, and highlights.
3. **Single, clean typeface.** The whole app uses Plus Jakarta Sans; there's no separate display family today.
4. **Cards first.** Most of the experience lives in cards: product, filters, quick actions, backoffice modules.
5. **Light header, dense UI below.** Navigation is understated; the important content lives in the body.

## Actual tokens

Defined in [`storefront/src/app/globals.css`](storefront/src/app/globals.css).

```css
:root {
  --background: #f6f5f2;
  --foreground: #111111;
  --surface: #ffffff;
  --muted: #deddd8;
  --brand-red: #ff174f;
  --brand-red-dark: #e3043c;
  --brand-red-soft: #ff6b8f;
  --brand-red-tint: #ffd9e3;
  --card-btn-add: rgba(17, 17, 17, 0.72);
  --card-btn-add-icon: #ffffff;
  --card-btn-qv: rgba(105, 105, 105, 0.72);
  --card-btn-qv-icon: #ffffff;
}
```

## Actual typography

The app uses [`Plus_Jakarta_Sans`](https://fonts.google.com/specimen/Plus+Jakarta+Sans) in [`storefront/src/app/layout.tsx`](storefront/src/app/layout.tsx).

Current rules:

- headings: same sans, heavier weight/larger size
- body: same sans
- prices and CTAs: same sans, higher contrast and weight

There's no second serif family or complex editorial hierarchy today. If that changes, this document needs to be updated.

## Main surfaces

### 1. App shell

Implemented in [`storefront/src/components/app-chrome.tsx`](storefront/src/components/app-chrome.tsx).

Includes:

- `SiteHeader`
- `SiteFooter`
- floating WhatsApp button
- toast system
- sticky mobile checkout bar if there's a cart

The backoffice lives inside the same shell, but with less top-level separation.

### 2. Header

Current characteristics:

- fixed at the top
- translucent white background with blur
- simple navigation
- access to search, account, and cart
- mobile drawer

The intent is for it not to steal focus from the catalog.

### 3. Global background

The `body` doesn't use a flat color. It has:

- a soft radial red gradient
- a barely-perceptible dark radial
- a vertical cream → white → cream gradient

That gives it atmosphere without becoming overly decorative.

## Key components

### Product Card

Implemented in [`storefront/src/components/product-card.tsx`](storefront/src/components/product-card.tsx).

Current behavior:

- image as the main surface
- favorites heart in the top right
- discount badge when applicable
- hover actions on desktop
- quick view modal
- "Select options" instead of "buy now"
- `OUT OF STOCK` badge when there's no inventory

Current design decisions:

- white cards with a very soft black border
- large radii (`rounded-2xl`)
- floating actions over a white background
- slight zoom on the image on hover

### Quick View

Used for quick inspection without leaving the context.

Triggered from:

- the product hover button
- other interactive points where it makes sense

The correct rule: if the user is still browsing, avoid pulling them out of the flow with unnecessary navigation.

### Sticky mobile checkout

Exists today and is well aligned with the product:

- only appears if there are items
- hidden on checkout and the backoffice
- shows quantity + subtotal + CTA

It's an important piece because the app sees heavy mobile usage.

## Pages and visual tone

### Home

The home page today combines:

- rotating hero
- featured products
- quick actions
- collection blocks
- shop-the-look

Visual tone:

- light editorial
- commercial
- direct

It's not designed as a corporate homepage but as a shopping entry point.

### Catalog

Implemented in [`storefront/src/app/catalog/page.tsx`](storefront/src/app/catalog/page.tsx).

Current patterns:

- horizontal subcategory rail
- side filter panel on desktop
- filter modal on mobile
- local sorting and pagination
- products loaded from Medusa

Important note:

- product loading is client-side today
- that makes the initial render show empty and hydrate afterward
- it works functionally, but the UX isn't ideal

Recommended future improvement:

- server-side initial load for home, catalog, and search

### Product page

The product page is more utilitarian than expressive:

- focus on photo, price, options, and purchase
- needs to keep feeling consistent with the card

### Checkout

Should feel more transactional and less editorial:

- clarity
- visible validation
- little visual noise
- clear hierarchy between the form and the summary

### Backoffice

The current backoffice isn't Medusa's technical admin. It's a custom visual layer for commercial operations.

It should communicate:

- control
- quick reading
- modules
- actionable data

It shouldn't look like a storefront screen inherited with two tables bolted on. If it keeps expanding, it needs its own identity while keeping shared tokens.

## Language and content

The app already supports Spanish and Korean across several surfaces.

Rules:

- Spanish is the base language
- Korean is a functional translation, not a visual reinterpretation
- short, commercial labels
- avoid bureaucratic microcopy

## Responsive

The app needs to work well on:

- small mobile
- vertical tablet
- wide desktop

Current patterns that work well:

- grids that collapse to 1 or 2 columns
- filters in a mobile drawer
- sticky mobile checkout
- hover actions hidden on touch where appropriate

## Where the frontend falls short today

These are real gaps, not styling bugs:

1. **Product loading too client-side**
   The home and catalog can look empty at first.

2. **Product loading still too client-side**
   Even though the `/api/medusa` proxy already simplifies connectivity, the home and catalog still hydrate late.

3. **Stale visual documentation**
   The previous version of this document described a different color system, different typography, and a different visual intent.

## Reasonable next improvements

Recommended order:

1. move initial product loading to server-side
2. finish moving initial loading to server-side wherever it makes sense
3. visually consolidate the storefront and backoffice without merging them
4. review empty and loading states so they don't look like errors

## Rule for future changes

When any of these elements changes, this file must be updated:

- tokens in `globals.css`
- global typography
- `ProductCard` behavior
- shell structure
- product loading strategy
- visual relationship between storefront and backoffice
