# forge

> Build vault-sidecar: a local-first, two-pane personal knowledge vault as a fully static site.
> No backend in production. No frontend framework. No CSS preprocessor. Just files.

---

## Read This First

Five constraints that override everything else:

1. **No React, Vue, Svelte.** Vanilla TypeScript compiled with esbuild. Period.
2. **No Tailwind, no Sass.** Plain CSS with custom properties. Single file.
3. **No backend in production.** `_site/` is static files. Deploy anywhere.
4. **No stage max-width.** Content fills and breathes. Never `max-width: 680px; margin: 0 auto` on the reading pane.
5. **Progressive enhancement.** `<a>` links work before JavaScript loads. JS adds search, filtering, transitions — it does not gate basic reading.

---

## Stack

| Layer | Tool |
|---|---|
| SSG | Eleventy 3 (ESM) — Nunjucks layouts, computed data |
| Markdown | markdown-it + @shikijs/markdown-it (build-time highlighting) |
| Search | Fuse.js 7 — client-side, fuzzy, threshold 0.3 |
| Styles | Plain CSS — custom properties, no build step |
| Frontend | Vanilla TypeScript → esbuild (ESM, ES2020) |
| File watcher | chokidar (debounced 300ms) |
| Dev orchestration | concurrently |
| Tests | Vitest + jsdom + fast-check |

---

## Layout

```
┌──────────────────────────────────────────────────┐
│  #index-pane (minmax 260px, 20%)  │  #stage-pane │
│                                   │               │
│  [search ________________]        │  <article>    │
│  [Recent] [A–Z]                   │   content     │
│  [.md] [.html] [.txt]             │               │
│  #tag #tag #tag                   │               │
│  ──────────────────────           │               │
│  • title                          │               │
│  • title                          │               │
│                                   │               │
│  ┌──── drop zone ────┐            │               │
│  │  drop .md here    │            │               │
│  └───────────────────┘            │               │
└──────────────────────────────────────────────────┘
```

- Grid: `grid-template-columns: minmax(260px, 20%) 1fr`
- Stage padding: `clamp(1.25rem, 2.5vw, 2.5rem)` — no max-width, ever
- Mobile (<1024px): sidebar is fixed off-canvas `width: min(320px, 85vw)`, toggled by ☰ with backdrop overlay

---

## Content Routing

Files in `src/content/` are auto-assigned layouts by `content.11tydata.js`:

| Extension | Layout | Output |
|---|---|---|
| `.md` | `markdown.njk` | `<article class="prose">` |
| `.html` | `html-page.njk` | `<html-isolator>` with Shadow DOM |
| `.txt` | `text.njk` | `<pre class="text-content">` |

---

## The HTML Isolation Trap — Get This Right

Uploaded HTML files are full standalone documents (`<!DOCTYPE html>`, `<head>`, `<body>`, their own CSS). They must never pollute the app chrome. The app must never break them.

**Solution:** Shadow DOM via custom `<html-isolator>` element.

**The trap:** Do not make `<html-isolator>` fetch its own page URL. That causes infinite self-nesting.

**The correct approach:**

1. `html-page.njk` embeds raw HTML in a non-rendering script block:
   ```html
   <script type="text/html" id="raw-html-content">{{ content | safe }}</script>
   <html-isolator src="#raw-html-content"></html-isolator>
   ```
2. `html-isolator.ts` reads `document.querySelector(src).textContent` (not a fetch) when `src` starts with `#`.
3. When `stage-pane.ts` loads an HTML item via JS navigation, it fetches the page, extracts the raw HTML from the `<script type="text/html">` block, creates a new `<html-isolator>`, appends it to the stage, and calls `isolator.renderShadow(rawHtml)` directly.
4. Shadow DOM construction: extract `<style>` and `<link rel="stylesheet">` tags from parsed `<head>`, clone `<body>` children into the shadow root, re-create `<script>` elements so they execute.

---

## Metadata (Computed Data)

### Title — `src/_data/deriveTitle.js`
1. Use `data.title` from front matter if present
2. Derive from filename: `my_long-note.md` → `My Long Note` (replace hyphens/underscores with spaces, title case each word)

### Tags — `src/_data/tagExtractor.js`
1. Use `data.tags` from front matter if present and non-empty
2. Extract top-3 most frequent meaningful words from content body (strip stop words: a, an, the, in, on, is, to, of, for, with, and, or, it, this, that, not, be, are, was, by, at, from, as, do, its)
3. Fallback: `YYYY-MM` of file date
4. Final fallback: `"untagged"`
5. Normalize all tags: lowercase, spaces/underscores → hyphens, strip non-alphanumeric-hyphens

### Search Index — `src/_data/searchIndex.js`
Built as a global data file. Each entry: `{ id, title, tags, date, url, type }`.
Rendered to `/search-index.json` via `src/search-index.njk`. Exclude from Eleventy collections.

---

## Design System

### Midnight Palette

These exact values define the look. Do not approximate.

```css
:root {
  --bg-stage:    #0b1120;
  --bg-surface:  #0f172a;
  --bg-deep:     #020814;
  --bg-elevated: #1e293b;
  --bg-hover:    rgba(255, 255, 255, 0.04);

  --text-primary:   #f8fafc;
  --text-secondary: #e2e8f0;
  --text-muted:     #94a3b8;
  --text-dim:       #64748b;

  --border:       rgba(255, 255, 255, 0.08);
  --border-hover: rgba(255, 255, 255, 0.15);

  --accent:       #f59e0b;
  --accent-light: #fcd34d;
  --accent-glow:  rgba(245, 158, 11, 0.4);
  --accent-dim:   rgba(245, 158, 11, 0.1);

  --success: #4ade80;
  --danger:  #f87171;

  --transition-fast: 150ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-base: 200ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-slow: 300ms cubic-bezier(0.4, 0, 0.2, 1);

  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;
}
```

Add a near-invisible grain texture overlay (`opacity: 0.025`) with a `body::before` fixed pseudo-element using an SVG `feTurbulence` noise filter. Nearly imperceptible — adds tactile depth without visual noise.

Stage has a subtle radial amber glow in one corner:
```css
background: radial-gradient(ellipse at 80% 15%, rgba(245, 158, 11, 0.045) 0%, transparent 60%);
```

### Typography

- Body: `'Inter', system-ui, sans-serif` — weights 300–700, antialiased
- Code: `ui-monospace, 'JetBrains Mono', monospace`
- Sizes: `rem` and `clamp()` throughout. Never `px` for text or layout sizes (border widths and icon sizes excepted)
- Prose h1: `clamp(1.5rem, 3vw, 2.25rem)`, line-height 1.75 for body text

### Interaction States

**Index items:**
- Default: `color: --text-muted`, left border transparent
- Hover: `background: --bg-elevated`, left border `3px solid var(--accent)` scales in via `transform: scaleY()`
- Active: `background: --accent-dim`, `color: --text-primary`, border with glow

**Delete button (trash SVG, 14×14):**
- Hidden by default (`opacity: 0; pointer-events: none`)
- Visible on parent item hover/focus
- Click: item animates `opacity: 0; transform: translateX(-16px)` over 280ms, then removed from DOM
- Persists to `localStorage['vault-sidecar-deleted']`

**Tag buttons:**
- `::before` content: `"#"` — renders as `#javascript` visually, data is just `javascript`
- Default: muted text, faint border
- Active: `background: --accent-dim`, `border-color: var(--accent-glow)`, `color: --accent-light`

**Type buttons (.md / .html / .txt):**
- Square (~32px), monospace, uppercase
- Default: dashed border
- Active: solid border + accent glow

**Sort buttons:**
- Pill shape (`border-radius: 999px`), uppercase, letter-spaced
- Active: accent background

**Drop zone:**
- Default: dashed border, muted text
- Drag over: amber glow, elevated background
- Uploading: `opacity: 0.6`
- Success: green border for 3s then reset
- Error: red border + message below zone

**Search input:**
- Magnifier SVG as `background-image` with matching left padding
- Focus: `border-color: var(--accent-glow); box-shadow: 0 0 0 3px var(--accent-dim)`

**Focus rings (all interactive elements):**
```css
:focus-visible {
  outline: none;
  border-color: var(--accent-glow);
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.08);
}
```

### Accessibility
- Skip-to-content link (`:focus-visible` only)
- `<aside>` for sidebar, `<main>` for stage, `<article>` for content
- `aria-pressed` on sort/type/tag buttons
- `aria-current="page"` on active index item
- `aria-expanded` on mobile hamburger

---

## Feature Behavior

### Index Pane State

```ts
interface IndexState {
  items: ContentItem[];
  query: string;
  selectedTags: Set<string>;   // AND: all must match
  selectedTypes: Set<ContentType>; // OR: any can match
  deletedIds: Set<string>;     // localStorage persisted
  sortMode: 'recent' | 'alpha';
  activeItemId: string | null;
}
```

**Filter pipeline — run in this order:**
1. Exclude `deletedIds`
2. Type filter: if any types selected, keep items matching any selected type (OR)
3. Fuse.js search: if query non-empty, filter and reorder by relevance
4. Tag filter: keep items that have ALL selected tags (AND)
5. Sort: `recent` → date descending; `alpha` → title ascending, case-insensitive

**Hydration boundary:** Render items into `#index-content` (child of `#index-pane`). The drop zone lives in `#index-pane` but outside `#index-content` — it survives re-renders.

### Stage Pane Loading

**Markdown / text:**
1. Fade out (200ms)
2. `fetch(item.url)` → `DOMParser` → extract `<article>` innerHTML
3. Set `stageEl.innerHTML`
4. Fade in (200ms)

**HTML:**
1. Fade out
2. Fetch → parse → find `<script type="text/html" id="raw-html-content">` → `.textContent`
3. Clear stage → create `<html-isolator>` → append → `renderShadow(rawHtml)`
4. Fade in

On any failure: show inline error in stage. Never throw uncaught.

### Watcher Server

- Port 3001 (env: `WATCHER_PORT`)
- Plain `http.createServer` — no Express, no Koa
- Custom multipart/form-data parser: split on `--${boundary}`, parse `Content-Disposition` headers, extract `file` buffer and optional `overwrite` field string

**Routes:**
- `OPTIONS /ingest` → CORS preflight, 200
- `POST /ingest` → parse, validate, write, respond
- All others → 404

**CORS:** `Access-Control-Allow-Origin: *`, `Access-Control-Allow-Methods: POST, OPTIONS`

**Validation** (pure function in `watcher-validation.js`, shared with tests):
1. Extension in `{.md, .html, .txt}`
2. MIME in `{text/markdown, text/html, text/plain, application/octet-stream}`
3. `path.basename(filename)` — strip directory components before writing
4. Conflict: file exists + `overwrite !== 'true'` → `{ status: 'conflict', filename }`

**Responses:**
```json
{ "status": "ok" }
{ "status": "conflict", "filename": "notes.md" }
{ "status": "error", "message": "..." }
```

**Port conflict:** log `[watcher] Port 3001 is already in use.` and `process.exit(1)`

---

## File Tree

```
vault-sidecar/
├── .eleventy.js             — Shiki + markdown-it, passthrough copy
├── build-js.js              — esbuild: TS → ESM JS
├── watcher.js               — ingestion server
├── watcher-validation.js    — pure validation (shared with tests)
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── src/
│   ├── _data/
│   │   ├── deriveTitle.js
│   │   ├── searchIndex.js
│   │   ├── tagExtractor.js
│   │   └── watcher.js       — exposes watcher URL to templates
│   ├── _includes/
│   │   ├── base.njk         — two-pane shell
│   │   ├── markdown.njk
│   │   ├── html-page.njk
│   │   └── text.njk
│   ├── assets/
│   │   ├── css/main.css
│   │   └── js/
│   │       ├── html-isolator.ts
│   │       ├── index-pane.ts
│   │       ├── ingestion-zone.ts
│   │       └── stage-pane.ts
│   ├── content/
│   │   ├── content.11tydata.js
│   │   ├── sample.md
│   │   ├── sample.html
│   │   └── sample.txt
│   ├── tests/
│   ├── search-index.njk
│   └── index.njk
└── _site/
```

---

## Tests

| Suite | Type | Verifies |
|---|---|---|
| `deriveTitle` | Property-based | Non-empty string for any filename input |
| `tagExtractor` | Unit | Stop words excluded, top-3 returned, all fallbacks |
| Tag normalization | Unit | Spaces→hyphens, lowercase, special chars stripped |
| HTML isolator | DOM | Shadow root created, styles isolated, body injected |
| CSS isolation | Property-based | No style leakage in either direction |
| MIME validation | Unit | Allowed and denied types |
| Conflict detection | Unit | `conflict` when file exists; `ok` when overwrite=true |
| Index filtering | Property-based | Every matching item appears after filter |
| Markdown render | Unit | Code blocks and headings present in output |
| Ingestion zone | DOM | State transitions: default → drag-over → uploading → success/error |

---

## Dev Scripts

```json
"scripts": {
  "dev": "concurrently \"node watcher.js\" \"node build-js.js --watch\" \"eleventy --serve\"",
  "build": "node build-js.js && eleventy",
  "test": "vitest"
}
```

---

## Done When

- `npm run dev` starts cleanly; dropping a `.md` file causes it to appear in the index
- Search filters in real-time; clearing restores all items
- Two selected tags show only items with both (AND, not OR)
- Uploaded HTML renders without its styles leaking into the sidebar
- Deleted items are hidden and stay hidden after page refresh
- Mobile: sidebar slides in and out; stage is full-width
- `npm run build` produces a static `_site/` with no broken links
- `npm test` passes
