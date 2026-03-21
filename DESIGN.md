# DESIGN.md — Aurelia Storefront Design System

> Living design document. All token decisions and component specs live here.
> When in doubt: check this file first. Update it when decisions change.
>
> **Audience:** developers, Claude sessions, and future contributors.
> Last updated: 2026-03-20

---

## Design Philosophy

Aurelia targets B2B wholesale buyers (mayoristas) and retail customers in Argentina. The aesthetic is minimal, image-forward, and trust-building. The catalog is the product — everything else gets out of the way.

**Core principles:**
1. **Images are the product.** The buyer decides from photos. Every layout decision prioritizes image size and quality over UI chrome.
2. **The header should feel like air.** Light backdrop-blur, reduced weight. It's there when you need it, invisible when you don't.
3. **Interaction is earned, not announced.** Hover states and quick view appear when the user signals intent — not as permanent buttons cluttering every card.
4. **No add-to-cart theater.** Clicking the image goes to the product. No intermediary "add to cart" CTA sitting permanently on every card.
5. **B2B buyers use multiple devices.** Favorites and pagination state must survive navigation.

---

## Color Tokens

Defined as CSS custom properties in `globals.css`. All components reference tokens — never hardcoded hex.

```css
:root {
  /* Backgrounds */
  --background: #f4f4f4;      /* Page background */
  --surface: #f7f7f7;         /* Cards, pills, footer */
  --foreground: #111111;      /* Primary text */

  /* Brand */
  --brand-primary: #3d276b;   /* Titles (h1–h3), logo mark */
  --brand-accent: #61c3d8;    /* Buttons, badges, links, details */

  /* Interactive */
  --btn-bg: #61c3d8;          /* Primary CTA background */
  --btn-text: #111111;        /* Primary CTA text (WCAG AA: 4.7:1 on --btn-bg ✅) */
  --btn-hover-bg: #4aacbf;    /* Primary CTA hover (darkened 10%) */

  /* WhatsApp */
  --whatsapp: #25D366;        /* WhatsApp float button — always this green, no exceptions */

  /* Neutral */
  --muted: #888888;           /* Secondary text, metadata */
  --border: #e5e5e5;          /* Dividers, card borders */

  /* Product card hover buttons */
  --card-btn-add: #111111;    /* "Add to cart" circle button bg */
  --card-btn-add-icon: #ffffff;
  --card-btn-qv: rgb(105, 105, 105); /* "Vista rápida" circle button bg */
  --card-btn-qv-icon: #ffffff;
}
```

**Accessibility notes:**
- `#3d276b` on `#f4f4f4`: contrast 8.2:1 — WCAG AAA ✅
- `#111111` on `#61c3d8`: contrast 4.7:1 — WCAG AA ✅ (use for CTA button text)
- `#ffffff` on `#111111` (card hover buttons): contrast 21:1 — WCAG AAA ✅
- `#25D366` WhatsApp green: use white icon on top (contrast 2.3:1 — decorative only, icon not text)

---

## Typography

### Font Stack

```css
/* Import in layout.tsx via next/font/google */
IBM Plex Serif  → headings (h1–h3), display text, hero headline
IBM Plex Sans   → body, UI labels, prices, navigation, metadata
```

```css
:root {
  --font-display: 'IBM Plex Serif', Georgia, serif;
  --font-body: 'IBM Plex Sans', system-ui, sans-serif;
}
```

### Type Scale

| Role | Font | Size | Weight | Color |
|---|---|---|---|---|
| Hero headline | IBM Plex Serif | `text-5xl` / `text-7xl` desktop | 300 light | white |
| Section title (h2) | IBM Plex Serif | `text-3xl` | 400 | `--brand-primary` |
| Product name | IBM Plex Serif | `text-sm` | 400 | `--foreground` |
| Price | IBM Plex Sans | `text-sm` | 600 | `--foreground` |
| Nav links | IBM Plex Sans | `text-sm` | 400 | `--foreground` |
| Body / descriptions | IBM Plex Sans | `text-base` | 400 | `--foreground` |
| Metadata / labels | IBM Plex Sans | `text-xs` | 400 | `--muted` |
| CTA button text | IBM Plex Sans | `text-sm` | 500 | `--btn-text` |

---

## Spacing & Sizing

| Token | Value | Usage |
|---|---|---|
| Section vertical gap | `py-12` / `py-16` | Between homepage sections |
| Content max width | `max-w-6xl mx-auto` | All page content |
| Card image (catalog) | `h-52` | Product cards in /catalog |
| Card image (featured) | `h-64` | Product cards on homepage |
| Category card | `h-40` | Category image cards |
| Card hover button | `36px × 36px` | Circular icon buttons |
| Card hover button gap | `5px` | Between the two buttons |
| Touch target minimum | `44px` | All interactive elements on mobile |

---

## Components

### Site Header

**Behavior:** Sticky. Backdrop blur, not solid fill. Reduced visual weight.

```
┌─────────────────────────────────────────────────────┐
│  AURORA  colección    [search]            👤  🛒      │
│  (logo)                                              │
└─────────────────────────────────────────────────────┘
```

- Background: `bg-white/70 backdrop-blur-md` (semi-transparent, not opaque)
- Logo: `--brand-primary` color, IBM Plex Serif
- Nav links: `text-sm`, `--foreground`, hover → `--brand-primary`
- Cart + user icons: teal (`--brand-accent`) on hover
- Favorites link: heart icon, teal, shows count badge if >0 favorites in localStorage
- Hide header entirely on `/backoffice` routes (existing behavior, keep)
- Mobile: hamburger menu, full-width drawer

### Hero

**Behavior:** Full-bleed, covers entire viewport height. 3-slide rotation (retain existing logic). Text bottom-left.

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│                    [full-bleed product photo]            │
│                                                          │
│  anillos en                                              │
│  todas las medidas                                       │
│                                                          │
│  [ver más →]                                             │
└──────────────────────────────────────────────────────────┘
```

- Height: `min-h-screen`
- Image: `object-cover`, `object-[center_top]` default
- Text: white, bottom-left, `pb-16 pl-8` padding
- Headline: IBM Plex Serif, `text-5xl md:text-7xl font-light`
- CTA: "Ver más →" — `--btn-bg` background, `--btn-text` text, `px-6 py-2 rounded-full`
- Overlay: `bg-gradient-to-t from-black/50 to-transparent` — enough to keep text legible

### Category Cards

**Behavior:** Horizontal scrollable row on mobile. 4-column grid on desktop. Click navigates to `/catalog?category=X` (filter pre-applied).

```
┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
│  [img]  │ │  [img]  │ │  [img]  │ │  [img]  │
│ collar  │ │ pulsera │ │colgante │ │pendient.│
└─────────┘ └─────────┘ └─────────┘ └─────────┘
```

- Image: first product photo for that category from Medusa (1 API call for all categories)
- Height: `h-40`
- Label: white text, bottom of card, IBM Plex Serif, small overlay gradient
- Border radius: `rounded-lg`
- Missing image fallback: `--surface` background + category name centered
- Hover: `scale-[1.02]` transform, `transition-transform duration-200`

### Product Card

**Two states: catalog grid and homepage featured grid.**

```
┌──────────────────┐
│                  │   ← image area (h-52 catalog / h-64 featured)
│                  │
│    [❤]           │   ← favorites heart, top-right, visible on hover
│                  │
│  [+btn] [👁btn]  │   ← hover buttons, animate in at bottom of image
└──────────────────┘
  Collar goita cristal    ← IBM Plex Serif, text-sm
  $2.500                  ← IBM Plex Sans, text-sm, font-semibold
```

**Image area:**
- `overflow-hidden`, `relative`
- `object-cover`, `w-full`
- Clicking the image → navigate to product page (no intermediary button)

**Favorites heart button:**
- Position: `absolute top-2 right-2`
- Always in DOM, `opacity-0 group-hover:opacity-100` on desktop
- Always visible on mobile (no hover)
- Icon: heart outline → teal fill when saved
- `aria-label="Guardar en favoritos"` + `aria-pressed={isSaved}`
- Storage: localStorage key `aurelia_favorites` (array of product IDs)

**Hover action buttons (desktop only):**
- Hidden on mobile (touch users tap image directly)
- Container: `absolute bottom-0 left-0 right-0`, centered flex row
- Default: `opacity-0 translate-y-[10px]`
- On `:hover` and `:focus-within`: `opacity-100 translate-y-0 transition-all duration-[350ms] ease-[ease]`
- Background: `bg-white`, `py-[10px]`, `gap-[5px]`, `z-[7]`
- `will-change: opacity, transform`

**Add-to-cart button (left):**
- Shape: circle, `w-9 h-9 rounded-full` (36px)
- Background: `var(--card-btn-add)` (#111111)
- Icon: white `+` SVG, 18×18px
- Tooltip: "Seleccionar opciones" — appears above on `:hover`, dark rounded bubble
- `transition-all duration-[350ms]`

**Vista rápida button (right):**
- Shape: circle, `w-9 h-9 rounded-full` (36px)
- Background: `var(--card-btn-qv)` (rgb(105,105,105))
- Icon: white eye SVG, 18×18px
- Tooltip: "Vista rápida" — same tooltip style
- `transition-all duration-[150ms] ease-in-out`
- Action: opens `ProductQuickView` modal (reuse existing component)

**Tooltip style (both buttons):**
```css
position: absolute;
bottom: calc(100% + 8px);
left: 50%;
transform: translateX(-50%);
background: rgba(0,0,0,0.75);
color: #fff;
font-size: 11px;
white-space: nowrap;
padding: 4px 8px;
border-radius: 4px;
pointer-events: none;
opacity: 0;
transition: 0.2s;
/* show on button :hover */
```

### Trust Signals Row

Three columns: "Como comprar", "Envíos", "Medios de pago". Each with icon + title + short text.

```
┌──────────────┬──────────────┬──────────────┐
│  [icon]      │  [icon]      │  [icon]      │
│ Como comprar │ Envíos       │Medios de pago│
│ [text]       │ [text]       │ [text]       │
└──────────────┴──────────────┴──────────────┘
```

- Background: `--surface` (#f7f7f7)
- Icons: stroke style, `--brand-accent` teal
- Copy: B2B-specific (real copy TBD by business before shipping — do not ship with lorem ipsum)
- Mobile: stacked single column

### Shop the Look

Full-width image with product tag dots overlaid. Clicking a dot opens `ProductQuickView` modal (NOT navigate to product page).

- Dot: `w-4 h-4 rounded-full`, `bg-white/80`, pulsing animation
- Hover dot → small product name tooltip
- Click dot → `ProductQuickView` overlay (reuse existing component)
- Mobile: same behavior (tap dot → quick view)

### Favorites Page (`/favoritos`)

**Empty state (important — not "No items found"):**
```
[heart outline illustration]
Todavía no guardaste nada
Explorá la colección →
```
- CTA links to `/catalog`
- Warm tone, not clinical

**Filled state:** Same product card grid as catalog. Heart icon pre-filled (teal). Remove from favorites via heart toggle.

### WhatsApp Float Button

- Position: `fixed bottom-6 right-6 z-50`
- Color: `--whatsapp` (#25D366) — always this green, no design substitutions
- Icon: official WhatsApp white SVG logo
- Size: `w-14 h-14 rounded-full`
- Shadow: `shadow-lg`
- No label text — icon only

---

## Interaction Patterns

### Pagination — URL State

Catalog pagination uses `?page=N` query param. Browser back button restores position.

- `<Link href={`/catalog?page=${n}&category=${current}`}>`
- On load, read `searchParams.page` to initialize state
- Never use client-only state for pagination (breaks back button)

### Category Filter Persistence

Category cards on homepage navigate to `/catalog?category=collar` (etc.) with filter pre-applied. The catalog page reads from `searchParams.category` on initial render.

### Quick View

`ProductQuickView` is a slide-up sheet on mobile, centered modal on desktop. Triggered by:
1. "Vista rápida" hover button on product cards
2. Dot overlays on Shop the Look section

Do NOT open a new page. Do NOT navigate away from current scroll position.

### Hover States — Desktop Only

All hover-only interactions (card buttons, quick view trigger) must degrade gracefully on mobile:
- Mobile: tap image → navigate to product page
- Desktop: hover → show buttons, click button → add to cart or quick view

---

## Animation & Motion

| Element | Property | Duration | Easing |
|---|---|---|---|
| Card hover button group | opacity + translateY | 350ms | ease |
| Add-to-cart button | all | 350ms | ease |
| Vista rápida button | all | 150ms | ease-in-out |
| Category card | transform scale | 200ms | ease |
| Button tooltip | opacity | 200ms | ease |
| Product image zoom | transform | 300ms | ease |

**Principle:** Entrance animations are slower (feel deliberate), exit is faster (feel responsive).

---

## Responsive Behavior

| Breakpoint | Grid | Hero text | Category cards | Hover buttons |
|---|---|---|---|---|
| Mobile (`< md`) | 2 columns | `text-3xl` | Horizontal scroll, 2.5 visible | Hidden — tap image |
| Tablet (`md`) | 2–3 columns | `text-4xl` | 3 columns | Shown |
| Desktop (`lg+`) | 3–4 columns | `text-7xl` | 4 columns | Shown |

**Mobile-specific:**
- Touch targets minimum 44px
- Favorites heart always visible (not hover-only)
- No card hover button container in DOM on mobile (conditional render, not just CSS hidden)

---

## Accessibility

- All interactive elements keyboard-navigable (Tab + Enter/Space)
- Hover button group triggers on `:focus-within` as well as `:hover`
- `aria-label` on all icon-only buttons
- Favorites heart: `aria-pressed` reflects saved state
- Quick view modal: focus trap, `Escape` closes, focus returns to trigger
- Image `alt` text: product name from Medusa (never empty, never generic)
- Color contrast: all text passes WCAG AA minimum
- Category card labels: maintain legibility at all image sizes (dark overlay required)

---

## Design Rationale

**Why IBM Plex Serif + Sans?**
Plex Serif gives Aurelia a jewelry brand feel — editorial, refined, not sterile. Plex Sans pairs cleanly for UI text without fighting the serif. Both are variable fonts — single file, no FOUT, fast load. David selected these explicitly.

**Why #3d276b (deep violet) for titles?**
It reads as premium and unconventional for a jewelry brand in Argentina (most competitors use black or gold). It also pairs well with the teal accent — complementary without being garish.

**Why #61c3d8 (teal) as accent?**
Creates energy against the violet without competing. Works on light backgrounds. Approved by David explicitly for "detalles."

**Why no persistent "Add to cart" button on cards?**
B2B buyers browse large catalogs. A button on every card creates visual noise. The pattern is: browse images → tap to product → decide there. Hover buttons serve power users who know what they want. David specified: "para ir al producto que directamente hagan Click en la imagen."

**Why full-bleed hero?**
The first impression is the product, not the interface. David specified: "el banner principal que ocupe toda la pantalla."

**Why URL-based pagination?**
David raised this explicitly: "si estas en la pagina 2, entras a un articulo y después volves atrás, volves para la pagina 1." URL params fix this for free via browser history.

**Why teal WhatsApp button over the default (current) color?**
The WhatsApp green (#25D366) is the official brand color and users recognize it immediately as "tap to message." David specified: "que el botón de wpp este en verde como su icono."
