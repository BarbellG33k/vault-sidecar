# vault-sidecar — Blueprint

## One-Sentence Pitch

Build a local-first, two-pane knowledge vault as a static site. Read Markdown, HTML, and plain text in a fast sidebar-plus-stage interface, with client-side search, drag-and-drop file ingestion, and zero production dependencies.

---

## Philosophy

**Simplicity over cleverness.** Vanilla TypeScript. No React, no Vue, no build-time framework. The site must feel like a native app but ship as static HTML. Every feature justifies its existence. If it can be done with a browser API, do not add a library.

**Frictionless authoring.** Drop a `.md` file into a folder and it appears. No CMS, no database, no deploy step for content.

**Isolation where it matters.** Uploaded HTML documents may contain arbitrary CSS. They must never leak into the app chrome. Shadow DOM is non-negotiable for HTML content.

---

## Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Static generator | **Eleventy 3 (ESM)** | Zero-config defaults, Nunjucks layouts, fast builds |
| Templates | **Nunjucks** | Logic-friendly, includes, extends, filters |
| Markdown | **markdown-it** + **@shikijs/markdown-it** | Build-time syntax highlighting; no client JS penalty |
| Search | **Fuse.js** | Client-side fuzzy search over a generated JSON index |
| Styles | **Plain CSS** with custom properties | No preprocessor, no build step for CSS |
| Frontend | **Vanilla TypeScript** → **esbuild** | Single build tool, ESM output, sourcemaps |
| File watcher | **chokidar** | Debounced, battle-tested |
| Tests | **Vitest** + **jsdom** + **fast-check** | Unit + property-based tests |
| Dev orchestration | **concurrently** | One command runs watcher + assets + Eleventy |

**Hard no's:** No Tailwind, no Sass, no frontend framework, no CSS-in-JS, no bundler beyond esbuild, no backend in production.

---

## Architecture

### Layout (`base.njk`)

```
┌─────────────────────────────────────┐
│  ☰  │  Content stage               │
│     │                              │
│ L   │                              │
│ E   │                              │
│ F   │                              │
│ T   │                              │
│     │                              │
│─────│                              │
│ drop│                              │
│ zone│                              │
└─────────────────────────────────────┘
```

- **Left pane (`#index-pane`)**: Scrollable index of all content. Search box, sort toggle (Recent / A–Z), type filter (`.md` `.html` `.txt`), tag cloud, item list, drop zone at bottom.
- **Right pane (`#stage-pane`)**: Content reader. Fades content in/out on selection.
- **Mobile**: Sidebar becomes a fixed off-canvas drawer (320px max), toggled by ☰. Backdrop overlay closes it.

### Content Pipeline

1. Source files live in `src/content/`.
2. `content.11tydata.js` assigns layouts by extension:
   - `.md` → `markdown.njk`
   - `.html` → `html-page.njk`
   - `.txt` → `text.njk`
3. Eleventy builds to `_site/`.
4. `search-index.njk` generates `/search-index.json` for Fuse.js.

### HTML Isolation Strategy

HTML uploads are **full standalone documents** (`<!DOCTYPE html>`, `<html>`, `<head>`, `<body>`, their own CSS).

**The trap to avoid:** Do not make `<html-isolator>` fetch its own page URL. That creates infinite self-nesting.

**The correct approach:**
- `html-page.njk` embeds raw HTML in `<script type="text/html" id="raw-html-content">` and points `<html-isolator src="#raw-html-content">` at it.
- `html-isolator.ts` reads `textContent` from the DOM element when `src` starts with `#`.
- `stage-pane.ts`, when loading an HTML item dynamically, fetches the page, extracts the raw HTML from the script block, and passes it directly to `renderShadow()`.
- The isolator parses the HTML with `DOMParser`, extracts `<style>`/`<link rel="stylesheet">` into the shadow root, then injects body content. Scripts are recreated so they execute.

---

## UI/UX Specification

### Color System (CSS Custom Properties)

Use a dark theme. Names should be semantic, not literal:

```css
--bg-stage:       /* main reading area */
--bg-surface:     /* sidebar */
--bg-deep:        /* inputs, code blocks */
--bg-elevated:    /* cards, hover states */
--bg-hover:       /* subtle hover overlay */
--text-primary:   /* headings */
--text-secondary: /* body */
--text-muted:     /* captions, placeholders */
--text-dim:       /* disabled, empty states */
--border:         /* default borders */
--border-hover:   /* hovered borders */
--accent:         /* primary brand color (amber) */
--accent-light:   /* accent text */
--accent-glow:    /* accent borders, focus rings */
--accent-dim:     /* accent backgrounds */
--success:        /* green */
--danger:         /* red */
```

### Typography

- **Body**: `'Inter', system-ui, sans-serif`
- **Code / Monospace**: `ui-monospace, 'JetBrains Mono', monospace`
- **Scale**: Use `rem` and `clamp()`. No hard `px` for layout sizing except border widths and icon sizes.

### Sidebar Width

- Desktop: `minmax(260px, 20%) 1fr` (≈ 1:4 to 1:5 ratio on wide screens)
- Mobile: Sidebar is fixed off-canvas, `width: min(320px, 85vw)`

### Stage Padding

- Tight but not flush: `padding: clamp(1.25rem, 2.5vw, 2.5rem)`
- **No max-width container.** Content should breathe and expand. Do not center a narrow column with `max-width: 680px` and `margin: 0 auto`.

### Transitions

```css
--transition-fast: 150ms ease;
--transition-base: 200ms ease;
--transition-slow: 300ms ease;
```

Use `transform` and `opacity` for animations. No layout-thrashing transitions on `width`, `height`, `top`, `left`.

### Focus Rings

All interactive elements get visible focus states:
```css
outline: none;
border-color: var(--accent-glow);
box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.08);
```

---

## Features (Detailed Behavior)

### 1. Index Pane (`index-pane.ts`)

**State:**
```ts
interface IndexState {
  items: ContentItem[];      // { id, title, tags[], date, url, type }
  query: string;
  selectedTags: Set<string>;
  selectedTypes: Set<ContentType>;
  deletedIds: Set<string>;   // persisted in localStorage
  sortMode: 'recent' | 'alpha';
  activeItemId: string | null;
}
```

**Filtering logic (AND, in order):**
1. Exclude `deletedIds`
2. Type filter (OR across selected types)
3. Fuse.js search (if query non-empty)
4. Tag intersection (all selected tags must match)
5. Sort by mode

**Hydration boundary:** Render dynamic content into `#index-content`, **not** `#index-pane`. The drop zone lives inside `#index-pane` but outside `#index-content` so it survives re-renders.

### 2. Stage Pane (`stage-pane.ts`)

- **Markdown / Text items:** `fetch(item.url)`, extract `<article>` from response HTML, swap `stageEl.innerHTML`. Fade out (200ms), swap, fade in.
- **HTML items:** Fetch page, extract raw HTML from `<script type="text/html">`, create `<html-isolator>`, call `renderShadow(rawHtml)` directly, append to stage.
- **Error handling:** On any failure, show `stage-error` message inline. Do not crash.

### 3. Search

- Fuse.js over `title` and `tags`.
- Threshold: `0.3` (tolerant but not sloppy).
- Index generated at build time via `search-index.njk` → `/search-index.json`.
- Fetched on page load. Before it resolves, native navigation works (links behave like normal `<a>` tags).

### 4. Tag Cloud

- Collect all unique tags from non-deleted items.
- Click toggles inclusion. Multiple tags = intersection (AND).
- Active tags: accent background + glow border.
- Prefix each tag with `#` via CSS `::before` for instant visual recognition.

### 5. Type Filter

- Three buttons: `.md`, `.html`, `.txt`.
- Dashed border when idle, solid when active.
- Square shape with monospace font to evoke "file extension" semantics.

### 6. Sort Toggle

- Two buttons: **Recent** / **A–Z**.
- Pill-shaped (`border-radius: 999px`), uppercase, letter-spaced.
- Active state uses accent color.

### 7. Drag-and-Drop Ingestion (`ingestion-zone.ts`)

**Client-side validation (before upload):**
- Extensions: `.md`, `.html`, `.txt`
- Unsupported files get immediate error: "Unsupported file type(s): filename1, filename2"

**Upload flow:**
```
Drop files → validate extensions → show "Uploading N file(s)…"
→ POST multipart/form-data to watcher /ingest
→ Handle responses:
   - status='ok' → success
   - status='conflict' → window.confirm() to overwrite
   - status='error' → display message
→ Update UI state: default | drag-over | uploading | success | error
```

**Network error detection:** `err instanceof TypeError` OR `/fetch|network/i.test(err.message)`. Only show "Ingestion server unreachable" for true network errors. For HTTP responses (404, 422, 500), read `response.json().message` and show the actual server error.

### 8. Delete (Local Hide)

- Trash-can icon (`<svg>`), 14×14, visible on hover/focus.
- Clicking adds item ID to `localStorage` key `vault-sidecar-deleted`.
- Animates out with `opacity: 0` + `translateX(-16px)` over 280ms before DOM removal.
- Deletion is client-side only; file remains on disk.

### 9. Watcher Server (`watcher.js`)

- HTTP server on port `3001` (configurable via `WATCHER_PORT` env).
- Endpoints:
  - `OPTIONS /ingest` — CORS preflight
  - `POST /ingest` — multipart upload
- Minimal multipart parser (no external library). Extracts `file` and optional `overwrite` field.
- Writes to `src/content/`.
- Validation:
  - Extension in `{.md, .html, .txt}`
  - MIME type in `{text/markdown, text/html, text/plain, application/octet-stream}`
  - Conflict detection: 409 if file exists and `overwrite !== 'true'`
- CORS headers: `Access-Control-Allow-Origin: *`, methods `POST, OPTIONS`.
- On `EADDRINUSE`: log clear error and exit with code 1. Do not silently fail.
- chokidar watches `src/content/` and logs changes (Eleventy handles its own rebuild).

---

## File Structure

```
vault-sidecar/
├── .eleventy.js              # ESM config, Shiki markdown, passthrough copy
├── build-js.js               # esbuild: src/assets/js/*.ts → src/assets/js/*.js
├── watcher.js                # Node ingestion server
├── watcher-validation.js     # Pure validation fn (shared with tests)
├── package.json
├── tsconfig.json
├── vitest.config.ts
│
├── src/
│   ├── _data/
│   │   └── watcher.js        # exposes watcher URL to templates
│   ├── _includes/
│   │   ├── base.njk          # root layout: sidebar + stage
│   │   ├── markdown.njk      # <article class="prose">{{ content | safe }}</article>
│   │   ├── html-page.njk     # <script type="text/html">{{ content | safe }}</script> + <html-isolator src="#raw-html-content">
│   │   └── text.njk          # <article class="prose text-document"><pre class="text-content">{{ content }}</pre></article>
│   ├── assets/
│   │   ├── css/main.css      # all styles, custom properties, media queries
│   │   └── js/
│   │       ├── html-isolator.ts   # custom element: Shadow DOM renderer
│   │       ├── index-pane.ts      # sidebar: search, filter, sort, render
│   │       ├── ingestion-zone.ts  # drag-and-drop upload
│   │       └── stage-pane.ts      # content loader + fade transitions
│   ├── content/
│   │   ├── content.11tydata.js    # per-directory layout routing by extension
│   │   ├── sample.md              # example Markdown (repo ships with this)
│   │   ├── sample.txt             # example text file
│   │   └── sample.html            # example standalone HTML
│   ├── tests/
│   │   └── *.test.{js,ts}         # Vitest suite
│   ├── search-index.njk      # generates /search-index.json
│   └── index.njk             # homepage (extends base.njk)
│
├── docs/
│   └── (documentation, daily logs)
│
└── _site/                    # build output (gitignored)
```

---

## Constraints & Non-Goals

**Must:**
- Work without JavaScript for basic navigation (progressive enhancement).
- Be fully static in production (`_site/` is just files).
- Handle HTML uploads without style leakage.
- Gracefully degrade search if `search-index.json` fails to load.
- Work on mobile (touch, small screens, off-canvas sidebar).

**Must not:**
- Add a database.
- Add authentication.
- Add a CMS UI.
- Add server-side rendering beyond Eleventy's build step.
- Add a frontend framework (React, Vue, Svelte, etc.).
- Use a CSS preprocessor.
- Use Tailwind or any utility-first CSS framework.
- Bundle more than one JS build tool.

---

## Quality Bar

- **Accessibility:** Skip link, ARIA labels, `aria-pressed` for toggles, `aria-current="page"` for active item, focus-visible states.
- **Performance:** No render-blocking JS. TypeScript bundles are ESM. CSS is a single file.
- **Error resilience:** Watcher port conflicts print actionable messages. Fetch failures show inline errors. Hydration failures fall back to server-rendered HTML.
- **Test coverage:** Property-based tests for deriveTitle, HTML isolator CSS encapsulation, and index completeness. Unit tests for MIME validation, conflict detection, tag extraction, and Markdown rendering.

---

## Prompt for Reproduction

If you are an AI reading this, your task is:

1. Create the file structure above.
2. Implement every feature with the exact behavior described.
3. Use the specified tech stack. Do not swap tools.
4. Follow the UI/UX specification precisely — colors, spacing, shapes, transitions.
5. Handle the HTML self-referencing trap correctly. Never fetch a page into itself.
6. Make the watcher port configurable. Fail loudly on port conflicts.
7. Write tests matching the coverage described.
8. Keep it simple. If a feature requires more than 200 lines, reconsider the approach.
