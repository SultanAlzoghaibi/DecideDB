# JevDB Design System

> Midnight precision instrument with a single orchid pulse.

A blend of two references from https://styles.refero.design/:
- **Linear** supplies the foundation: near-black surfaces, Inter type, tight tracking, hairline borders, compact spacing.
- **Supabase** supplies the developer-tool attitude: flat and shadowless, borders instead of elevation, rationed accent, focus shown by a colored border rather than a glow.
- **JevDB's own accent** is `#D45BB6` (orchid pink). It replaces Linear's acid lime and Supabase's phosphor green.

Theme: dark only (for now).

## The 60-30-10 rule

| Share | Role | Colors |
|-------|------|--------|
| **60%** | Dominant: canvas and large surfaces | `#08090a` void, `#0f1011` carbon |
| **30%** | Secondary: cards, borders, text, structure | `#161718`, `#23252a`, `#383b3f`, greys `#62666d` / `#8a8f98` / `#d0d6e0`, white |
| **10%** | Accent: the only chromatic UI color | **`#D45BB6`** |

Accent is punctuation, not paint. If more than about 10% of a screen is pink, remove some.

## Where `#D45BB6` is used (and only here)
- Primary action button fill (one per view)
- **Hover outline on every interactive element**: buttons, cards, table rows, inputs, nav items (border becomes `#D45BB6`)
- **Focus indicator**: 1px `#D45BB6` border, no glow ring
- Active nav item indicator, selected table row marker, links
- Small brand marks: logo dot, key icons, the "experimental" label

Never use it for: large backgrounds, body text, gradients, or status meanings (see semantic colors).

## Colors

### Surfaces (60%)
| Token | Value | Use |
|-------|-------|-----|
| `--color-void` | `#08090a` | Page canvas |
| `--color-carbon` | `#0f1011` | Cards, nav, table container |
| `--color-obsidian` | `#161718` | Elevated panels, popovers, row hover fill |
| `--color-slate` | `#23252a` | Interactive surface tint |

### Structure and text (30%)
| Token | Value | Use |
|-------|-------|-----|
| `--color-graphite` | `#23252a` | Default hairline border |
| `--color-smoke` | `#383b3f` | Stronger border, input border |
| `--color-ash` | `#62666d` | Disabled, inactive icons |
| `--color-fog` | `#8a8f98` | Muted text, placeholders, metadata |
| `--color-mist` | `#d0d6e0` | Body text, secondary buttons |
| `--color-paper` | `#ffffff` | Headings, max-emphasis text |

### Accent (10%)
| Token | Value | Use |
|-------|-------|-----|
| `--color-accent` | `#D45BB6` | Primary fill, hover outline, focus, active |
| `--color-accent-hover` | `#DE78C4` | Primary button hover fill (slightly lighter) |
| `--color-accent-muted` | `rgba(212, 91, 182, 0.12)` | Selected-row tint, subtle accent wash |
| `--color-on-accent` | `#08090a` | Text on accent fill (about 5.6:1 contrast; white on this pink is only about 3.5:1, so do not use white) |

### Semantic (status only, never decorative)
| Token | Value | Meaning |
|-------|-------|---------|
| `--color-good` | `#27a644` | Good grade, success |
| `--color-bad` | `#F0653A` | Bad grade, error (orange-red on purpose, so it can't be confused with the pink accent) |
| `--color-warn` | `#E3B341` | Warning, experimental caution |

## Logo
Two floating isometric records (a database), with the top face of the upper record filled `#D45BB6` as the newest log. Source: `src/components/Logo.tsx`; favicon: `src/favicon.svg`.
- Geometry (48×48 viewBox): record half-width 18.75, thickness 6.38, gap 7.25, stroke 3, round joins.
- Strokes `#d0d6e0` on dark; shapes filled with the background so the top record hides the one behind it.
- Always on dark. Never place it on a pink background, because that reads as TypeSafe's mark.
- Minimum size 16px. Nav size 22px next to the "JevDB" wordmark (Inter 510).

## Typography
- **UI font:** Inter Variable, with `font-feature-settings: "cv01", "ss03", "zero"`. Fallback: system-ui.
- **Mono font:** JetBrains Mono (Berkeley Mono is paid). Use for request IDs, JSON, timestamps, keyboard shortcuts.
- **Weights:** 400 regular, 510 emphasis and buttons, 590 rare strong emphasis. Never 700+.
- **Letter spacing:** -0.011em body, -0.022em at 48px and above.

| Role | Size / line height | Weight |
|------|--------------------|--------|
| display | 72 / 1.0 | 510 |
| heading | 48 / 1.0 | 510 |
| heading-sm | 32 / 1.13 | 400 |
| subheading | 24 / 1.33 | 400 |
| body | 16 / 1.5 | 400 |
| body-sm (tables) | 14 / 1.43 | 400 |
| caption | 13 / 1.2 | 400 |
| label | 12 / 1.4 | 400 |

Dashboard tables use 14px body-sm and 13px captions to stay dense.

## Spacing, radius, elevation
- **Base unit:** 4px. Scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 96.
- **Density:** compact (a dashboard, not a marketing page). Card padding 24px (16px inside dense panels). Section gap 64-96px on the landing page.
- **Page max-width:** 1200px for the landing page; the dashboard is full-width.
- **Radius:** buttons 6px, inputs 6px, badges 4px, cards 12px, pills 9999px (tags and status chips only). No other values.
- **Elevation:** none. Separate surfaces with 1px `#23252a` borders and the surface ladder above. No box-shadows and no gradients.

## Components

### Primary button
Fill `#D45BB6`, text `#08090a`, radius 6px, padding 10px 16px, Inter 14 / 510. Hover: fill `#DE78C4`. One per view.

### Secondary (ghost) button
Transparent, 1px `#23252a` border, text `#d0d6e0`, radius 6px, padding 8px 12px, Inter 13 / 400. **Hover: border `#D45BB6`**, background `rgba(255,255,255,0.04)`.

### Input
Background `rgba(255,255,255,0.02)`, 1px `#383b3f` border, radius 6px, padding 10px 12px, text `#d0d6e0`, placeholder `#8a8f98`. Hover: border `#D45BB6` at 50% opacity. **Focus: border `#D45BB6`**, no glow.

### Card
Background `#0f1011`, 1px `#23252a` border, radius 12px, padding 24px. **Hover (if clickable): border `#D45BB6`.**

### Requests table (the core screen)
- Container: card surface, radius 12px, hairline border.
- Header row: 12px, uppercase off, `#8a8f98`, bottom border `#23252a`.
- Rows: 14px, height about 40px, bottom border `#23252a`. **Row hover: `#161718` fill and a 2px `#D45BB6` marker on the left edge.**
- Selected row: `rgba(212, 91, 182, 0.12)` fill.
- IDs, timestamps and JSON are in mono.
- Confidence: a slim bar (neutral `#383b3f` track, filled in `#d0d6e0`), with the number beside it. Do not use pink for confidence.

### Badge / status chip
Background `rgba(255,255,255,0.05)`, text `#8a8f98`, radius 4px (pill for chips), padding 0 6px, 12px. Good/bad grades use `--color-good` / `--color-bad` text with a matching 12% tint background.

### Grade buttons (good / bad)
Ghost buttons. Hover border uses the semantic color (green or orange-red), not the pink accent, so the meaning stays clear.

### Experimental label
Small pill: `--color-warn` text, 12% warn tint background, text "Experimental". Used on the retrieval toggle everywhere it appears.

### Navigation
64px top bar (or a left sidebar in the dashboard), `#08090a`, 1px bottom border `#23252a`. Links `#d0d6e0` 13px. Active item: `#ffffff` text plus a `#D45BB6` indicator. Hover: text `#ffffff`.

## Do
- Keep 60-30-10 honest: mostly void/carbon, structure in greys, pink as punctuation.
- Use the pink border for hover and focus on every interactive element, consistently.
- Use dark text on pink fills.
- Show empty, loading and error states on every screen.
- Use the mono font for machine-y data.

## Don't
- No bold 700+, no gradients, no shadows, no radii outside the list.
- No second accent color; do not use lime, green or violet as UI accents.
- Don't use pink for status, confidence, or large backgrounds.
- Don't use white text on pink fills.

## Tokens (CSS)

```css
:root {
  /* Surfaces (60%) */
  --color-void: #08090a;
  --color-carbon: #0f1011;
  --color-obsidian: #161718;
  --color-slate: #23252a;

  /* Structure and text (30%) */
  --color-graphite: #23252a;
  --color-smoke: #383b3f;
  --color-ash: #62666d;
  --color-fog: #8a8f98;
  --color-mist: #d0d6e0;
  --color-paper: #ffffff;

  /* Accent (10%) */
  --color-accent: #D45BB6;
  --color-accent-hover: #DE78C4;
  --color-accent-muted: rgba(212, 91, 182, 0.12);
  --color-on-accent: #08090a;

  /* Semantic */
  --color-good: #27a644;
  --color-bad: #F0653A;
  --color-warn: #E3B341;

  /* Typography */
  --font-ui: 'Inter Variable', Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  --weight-regular: 400;
  --weight-medium: 510;
  --weight-strong: 590;

  /* Spacing (4px base) */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
  --space-24: 96px;

  /* Radius */
  --radius-badge: 4px;
  --radius-button: 6px;
  --radius-input: 6px;
  --radius-card: 12px;
  --radius-pill: 9999px;

  /* Border */
  --border: 1px solid var(--color-graphite);
  --border-hover: 1px solid var(--color-accent);
}
```
