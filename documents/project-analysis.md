# vault-sidecar — Project Analysis & Enhancement Roadmap

> **Generated:** 2026-04-23

## 1. Executive Summary

**vault-sidecar** is a local-first, static-site digital repository built on [Eleventy 3](https://www.11ty.dev/). It features a two-pane editorial UI (index + stage), drag-and-drop file ingestion, fuzzy search, automatic tag extraction, and an HTML-isolation layer for sandboxed content rendering. The codebase is well-structured, uses modern ESM, TypeScript for frontend modules, and has solid test coverage with Vitest.

However, there are **critical gaps** in the build pipeline, security hardening, and progressive enhancement that should be addressed before the project is production-ready.

---

## 2. Architecture Overview

| Layer | Technology | Purpose |
|-------|-----------|---------|
| SSG Engine | Eleventy 3 (ESM) | Build-time page generation |
| Templating | Nunjucks (`*.njk`) | Layouts & pages |
| Markdown | `markdown-it` + Shiki | Content rendering & syntax highlighting |
| Frontend | Vanilla TypeScript (ES2020) | Index pane, stage pane, ingestion, isolation |
| Search | Fuse.js | Client-side fuzzy search |
| File Watcher | `chokidar` + Node `http` | Ingestion server & auto-rebuild |
| Testing | Vitest + jsdom + fast-check | Unit & property-based tests |
| Styling | Plain CSS (custom properties) | Editorial design system |

### Key Directories

```
src/
  _data/           # Computed data (deriveTitle, tagExtractor, searchIndex)
  _includes/       # Nunjucks layouts
  assets/          # Static assets (CSS, JS/TS, images)
  content/         # User content (currently empty)
  tests/           # Test suites
```

---

## 3. Critical Findings

### 🔴 High Priority

#### 3.1 Missing TypeScript Compilation Step
**Issue:** The HTML layout references `/assets/js/*.js` (e.g., `index-pane.js`), but the source files are `.ts`. Eleventy 3 does **not** compile TypeScript. There is no build script, `tsc` invocation, or bundler (Vite, esbuild, Rollup) in `package.json`.

**Impact:** The frontend will 404 in a fresh build, rendering the app completely non-functional.

**Fix:** Add an asset pipeline. Options:
- **Vite** (recommended): Integrates cleanly with Eleventy via `@11ty/eleventy-plugin-vite`.
- **esbuild**: Fast, minimal config for TS→JS only.
- **tsc**: Slower, but strictest type checking.

#### 3.2 Path Traversal in Ingestion Server
**Issue:** `watcher.js` writes uploaded files using `path.join(CONFIG.contentDir, uploadedFile.filename)`. The `filename` comes directly from the multipart payload and is not sanitized. A malicious filename like `../../../.bashrc` could escape `contentDir`.

**Impact:** Arbitrary file overwrite on the host filesystem.

**Fix:** Strip path segments before writing:
```js
const safeFilename = path.basename(uploadedFile.filename);
const destPath = path.join(CONFIG.contentDir, safeFilename);
```

#### 3.3 No CORS / Origin Validation on Watcher Server
**Issue:** The ingestion server (`:3001`) accepts requests from any origin. A malicious website could POST files to `localhost:3001` if the user visits it while the dev server is running.

**Impact:** Cross-site file injection.

**Fix:** Validate `Origin` / `Host` headers, or bind to `127.0.0.1` and reject non-localhost origins.

### 🟡 Medium Priority

#### 3.4 Zero Progressive Enhancement
**Issue:** The entire UI is client-side rendered. The `<main>` element is empty until JavaScript fetches `search-index.json` and hydrates the DOM. If JS is disabled or fails to load, the user sees a blank stage and a non-functional index.

**Impact:** Poor accessibility, SEO, and resilience.

**Fix:** Use Eleventy's `collections.all` to render the index server-side in `base.njk`, then enhance it with JS for search/sorting.

#### 3.5 Direct URL Navigation Broken for Content Pages
**Issue:** `base.njk` always shows the "Select an item from the index" welcome message. If a user navigates directly to `/content/my-post/`, they see the welcome screen instead of the article.

**Fix:** Detect direct navigation server-side (e.g., `{% if page.url != "/" %}...{% endif %}`) or client-side (parse URL on load).

#### 3.6 Missing Documentation
**Issue:** No `README.md` exists. A project of this complexity needs setup instructions, architecture notes, and contribution guidelines.

**Fix:** Write a `README.md` covering install, dev workflow, content format, and deployment.

#### 3.7 Empty Content Directory
**Issue:** `src/content/` is empty, making it hard for new users to understand expected file formats or front-matter schemas.

**Fix:** Add a few starter files (e.g., `hello-world.md`, `sample-notes.html`) with documented front matter.

### 🟢 Low Priority

#### 3.8 Accessibility Micro-issues
- `aria-current="true"` on index items should be `aria-current="page"` (semantic).
- Mobile index panel lacks focus trap and backdrop click-to-close.
- No `skip-to-content` link for keyboard users.

#### 3.9 Missing Build-time Optimizations
- No CSS minification or PostCSS pipeline.
- No JS bundling / tree-shaking (each module is a separate HTTP request).
- No image optimization (Eleventy Image plugin).

#### 3.10 Test Gaps
- `@vitest/coverage-v8` is installed but `package.json` has no `test:coverage` script.
- No E2E or integration tests for the watcher HTTP server.
- No visual regression tests for the CSS.

#### 3.11 No Offline Support
For a "local-first" tool, the absence of a Service Worker means no offline reading. Adding a simple Workbox-generated SW would cache `search-index.json` and rendered articles.

---

## 4. Enhancement Roadmap

### Phase 1 — Foundation (Week 1)
1. **Fix TS compilation** by adding Vite + `@11ty/eleventy-plugin-vite`.
2. **Harden watcher server**: sanitize filenames, add CORS whitelist, bind to `127.0.0.1`.
3. **Add `README.md`** with quick-start instructions.
4. **Populate `src/content/`** with 2–3 example posts.

### Phase 2 — Resilience (Week 2)
5. **Server-side index rendering** in `base.njk`; hydrate with JS.
6. **Fix direct URL navigation** so content pages render correctly standalone.
7. **Accessibility pass**: `aria-current="page"`, focus trap, skip link, backdrop click.
8. **Add `test:coverage` script** and set a coverage threshold.

### Phase 3 — Polish (Week 3)
9. **Asset pipeline**: bundle & minify JS/CSS; add PostCSS / autoprefixer.
10. **Image optimization** via `@11ty/eleventy-img`.
11. **Add a Service Worker** for offline caching of index + articles.
12. **Dark mode toggle** (CSS custom properties make this trivial).

### Phase 4 — Scale (Week 4+)
13. **Full-text content search**: include article body text in `search-index.json` (with truncation) so Fuse.js can search content, not just titles/tags.
14. **Tag management UI**: allow users to add/edit/remove tags from the frontend.
15. **Content deletion / renaming** via the ingestion zone or index context menu.
16. **Git sync integration**: optional hook to commit new content to a git repo for backup.

---

## 5. Quick Wins (Do Today)

| Task | Effort | Impact |
|------|--------|--------|
| Sanitize `uploadedFile.filename` with `path.basename` | 1 min | Critical security fix |
| Add `README.md` | 15 min | Onboarding |
| Add example `.md` files to `src/content/` | 10 min | Usability |
| Add `test:coverage` script | 2 min | DX |
| Change `aria-current="true"` → `"page"` | 1 min | A11y |

---

## 6. Technology Recommendations

| Concern | Recommended Tool | Rationale |
|---------|-----------------|-----------|
| TS Compilation | **Vite** | Fast HMR, integrates with 11ty, handles bundling & minification |
| CSS Processing | **PostCSS + autoprefixer + cssnano** | Future-proof, minimal config |
| Image Optimization | **@11ty/eleventy-img** | Native 11ty plugin, responsive images |
| Offline / PWA | **Workbox** | Generate SW at build time, caches static + dynamic assets |
| Linting | **ESLint + @typescript-eslint + Prettier** | Consistent code style, catch bugs early |
| E2E Testing | **Playwright** | Test the full ingestion + reading flow |

---

## 7. Conclusion

vault-sidecar is a thoughtfully architected local-first knowledge base with a clean separation between static generation and client-side interactivity. The core risks are **operational** (missing build step) and **security-related** (file ingestion). Addressing Phase 1 items will move the project from "promising prototype" to "robust daily driver." The enhancements in Phases 2–4 would make it competitive with tools like Obsidian Publish, Logseq, or Notion—while remaining fully local and statically deployable.
