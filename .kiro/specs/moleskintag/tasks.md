# Implementation Plan: vault-sidecar

## Overview

Implement vault-sidecar as a local-first Eleventy 3.x static site with a tag-driven architecture. The build is incremental: scaffold the project, wire the Watcher and ingestion pipeline, implement the Tag_Extractor, build the Index and Stage panes, add the HTML_Isolator, and finish with the editorial design system.

## Tasks

- [x] 1. Scaffold project structure and core configuration
  - Initialize an npm project with `package.json` and install dependencies: `@11ty/eleventy`, `chokidar`, `fuse.js`, `@shikijs/markdown-it`, `fast-check`, `vitest`, `concurrently`
  - Create the directory layout: `src/content/`, `src/_data/`, `src/_includes/`, `src/assets/js/`, `src/assets/css/`
  - Add `.eleventy.js` with base config: input `src`, output `_site`, passthrough copy for `assets`
  - Add `tsconfig.json` for TypeScript compilation of client-side modules
  - Add `vitest.config.ts` targeting `src/**/*.test.ts`
  - _Requirements: 8.5_

- [x] 2. Implement the Watcher and Ingestion HTTP endpoint
  - [x] 2.1 Create `watcher.js` with chokidar watching `src/content/` and an HTTP server on port 3001
    - Implement `POST /ingest` multipart handler: validate MIME type / extension, handle name conflicts, move file to `src/content/`
    - Return `IngestResponse` JSON (`ok` | `conflict` | `error`)
    - Debounce chokidar events by 300 ms before triggering rebuild
    - Log 11ty build errors to console and preserve last successful `_site/` on failure
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.6, 8.1, 8.2, 8.4, 8.5_

  - [ ]* 2.2 Write property test for unsupported file type rejection (Property 1)
    - **Property 1: Unsupported file type is always rejected**
    - **Validates: Requirements 1.3**
    - Generate arbitrary filenames with non-`.md`/`.html` extensions; assert all return an error response identifying the type

  - [ ]* 2.3 Write property test for batch ingestion (Property 2)
    - **Property 2: Batch ingestion processes all valid files**
    - **Validates: Requirements 1.5**
    - Generate arbitrary non-empty lists of valid `.md`/`.html` files; assert every file produces an `ok` response

  - [ ]* 2.4 Write unit tests for Watcher ingest validation
    - Test specific MIME type cases (accepted and rejected)
    - Test conflict detection with known filenames
    - _Requirements: 1.3, 1.4_

- [x] 3. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement the Tag_Extractor
  - [x] 4.1 Create `src/_data/tagExtractor.js` as an 11ty computed data function
    - Implement `normalizeTag(raw: string): string` and `normalizeTags(raw: string[]): string[]`
    - Implement `extractTags(data: TagExtractorInput): TagExtractorOutput` with the three-step fallback chain: top-3 frequent words → `YYYY-MM` date → `untagged`
    - Apply stop-word filtering for content-based extraction
    - Log errors and assign `untagged` for unreadable files
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.5_

  - [x]* 4.2 Write property test for non-empty tag output (Property 3)
    - **Property 3: Tag_Extractor always produces at least one tag**
    - **Validates: Requirements 2.3, 2.4, 3.1, 3.2**
    - Generate arbitrary `TagExtractorInput` values including empty/null content; assert output `tags.length >= 1`

  - [x]* 4.3 Write property test for tag format invariant (Property 4)
    - **Property 4: Tag format invariant**
    - **Validates: Requirements 3.3**
    - Generate arbitrary content strings, run `extractTags`, assert all output tags match `/^[a-z][a-z0-9-]*$/`

  - [x]* 4.4 Write property test for tag normalization idempotence (Property 5)
    - **Property 5: Tag normalization is idempotent (round-trip)**
    - **Validates: Requirements 3.4**
    - Generate arbitrary string arrays; assert `normalizeTags(normalizeTags(x))` deep-equals `normalizeTags(x)`

  - [x]* 4.5 Write unit tests for Tag_Extractor fallback scenarios
    - Unreadable file → `['untagged']`
    - Empty content → date tag in `YYYY-MM` format
    - Known raw strings → expected normalized output (e.g., `"Hello World"` → `"hello-world"`)
    - _Requirements: 3.1, 3.2, 3.3, 3.5_

- [x] 5. Implement Markdown rendering and title derivation
  - [x] 5.1 Configure `@shikijs/markdown-it` in `.eleventy.js` for build-time syntax highlighting
    - Add `markdown-it` instance with Shiki plugin to 11ty config
    - _Requirements: 4.3_

  - [x] 5.2 Create `src/_data/deriveTitle.js` utility and wire it into the 11ty data cascade
    - Implement `deriveTitle(frontMatterTitle: string | undefined, inputPath: string): string`
    - Replace hyphens and underscores with spaces, apply title case
    - _Requirements: 4.4, 4.5_

  - [ ]* 5.3 Write property test for title derivation (Property 7)
    - **Property 7: Title derivation is always non-empty and well-formed**
    - **Validates: Requirements 4.4, 4.5**
    - Generate arbitrary filenames and optional front matter title strings; assert derived title is non-empty, title-cased, and free of hyphens/underscores

  - [ ]* 5.4 Write property test for Markdown rendering (Property 6)
    - **Property 6: Markdown rendering preserves CommonMark structure**
    - **Validates: Requirements 4.2, 4.3**
    - Generate valid CommonMark documents with known syntax elements; assert rendered HTML contains corresponding structural elements (`<h1>`–`<h6>`, `<ul>`/`<ol>`, `<blockquote>`, `<pre><code>`, `<code>`)

  - [ ]* 5.5 Write unit tests for title derivation
    - `"my-project_notes.md"` → `"My Project Notes"`
    - Front matter title takes precedence over filename
    - _Requirements: 4.4, 4.5_

- [x] 6. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement the HTML_Isolator Web Component
  - [x] 7.1 Create `src/assets/js/html-isolator.ts` as a custom element
    - Implement `connectedCallback`, `renderShadow`, and `renderIframe` methods
    - Fetch HTML via `fetch(src)`, parse with `DOMParser`, attach open Shadow Root
    - Inject `<body>` children and `<style>`/`<link>` elements into Shadow Root
    - Re-create `<script>` tags inside Shadow Root scope
    - Fall back to `<iframe sandbox="allow-scripts allow-same-origin">` when `fallback-iframe` attribute is set
    - Log failed external resource URLs and continue rendering remaining content
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ]* 7.2 Write property test for CSS isolation (Property 8)
    - **Property 8: HTML_Isolator provides bidirectional CSS encapsulation**
    - **Validates: Requirements 5.2, 5.3**
    - Generate arbitrary CSS rules; inject inside shadow root and assert no effect on outer elements; inject in outer document and assert no effect on shadow root elements

  - [ ]* 7.3 Write unit tests for HTML_Isolator JS isolation
    - Script inside isolator sets `window.testVar`; assert outer `window.testVar` is undefined
    - Failed external resource fetch logs URL and renders remaining content
    - _Requirements: 5.4, 5.5_

- [x] 8. Implement the Index Pane
  - [x] 8.1 Emit `search-index.json` from an 11ty global data file (`src/_data/searchIndex.js`)
    - Collect all `ContentItemData` from 11ty collections and write `SearchIndex` JSON to `_site/search-index.json`
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 8.2 Create `src/assets/js/index-pane.ts`
    - Implement `filterItems(state: IndexState): ContentItem[]` with sort modes (`recent` / `alpha`), text search via Fuse.js (`keys: ['title', 'tags']`, `threshold: 0.3`), and tag intersection filter
    - Implement `renderIndex(state: IndexState): void` — render flat list, Tag Cloud, sort toggle, search input
    - Implement `initSearch(items: ContentItem[]): Fuse<ContentItem>`
    - Disable search input with loading indicator until `search-index.json` is fetched
    - Display "no results" message when filtered list is empty
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

  - [x]* 8.3 Write property test for Index completeness (Property 9)
    - **Property 9: Index displays all content items**
    - **Validates: Requirements 6.1**
    - Generate arbitrary `ContentItem` lists with no active filter; assert rendered index entry count equals input list length

  - [x]* 8.4 Write property test for sort order correctness (Property 10)
    - **Property 10: Sort order correctness**
    - **Validates: Requirements 6.2**
    - Generate arbitrary `ContentItem` lists; assert `recent` sort is date-descending and `alpha` sort is title-ascending

  - [x]* 8.5 Write property test for text search filter correctness (Property 11)
    - **Property 11: Text search filter correctness**
    - **Validates: Requirements 6.3**
    - Generate arbitrary item lists and query strings; assert all returned items have a title or tag matching the query predicate

  - [x]* 8.6 Write property test for tag intersection filter (Property 12)
    - **Property 12: Tag filter intersection correctness**
    - **Validates: Requirements 6.4, 6.5**
    - Generate arbitrary item lists and tag sets; assert all returned items contain every selected tag

  - [x]* 8.7 Write unit tests for Index Pane filter logic
    - Specific query/tag combinations with known fixture data
    - Empty results message when no items match
    - _Requirements: 6.3, 6.4, 6.5, 6.7_

- [x] 9. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Implement the Stage Pane
  - [x] 10.1 Create `src/assets/js/stage-pane.ts`
    - Implement `loadItem(item: ContentItem): Promise<void>` — for Markdown items, `fetch` the pre-rendered 11ty page URL and swap `innerHTML` with a 200ms fade; for HTML items, instantiate `<html-isolator src="...">`
    - Implement `applyFadeTransition(el: HTMLElement, durationMs: number): void`
    - Display inline error message in Stage if `<html-isolator>` fetch fails without crashing surrounding layout
    - _Requirements: 4.1, 5.1, 6.6, 7.5_

  - [ ]* 10.2 Write unit tests for Stage transitions
    - Assert computed `transition-duration` ≤ 200ms for content transitions
    - Assert tag filter transition ≤ 150ms
    - _Requirements: 7.5, 7.6_

- [x] 11. Implement the Ingestion Zone client-side module
  - [x] 11.1 Create `src/assets/js/ingestion-zone.ts`
    - Implement `ingestFiles(files: FileList): Promise<IngestResponse[]>` — POST each file to `POST /ingest` as multipart form data
    - Validate file extension client-side before sending; display error message for unsupported types
    - Show visual progress indicator during file move; prompt user on `conflict` response (overwrite or rename)
    - _Requirements: 1.1, 1.3, 1.4, 1.5, 1.6_

- [x] 12. Build the 11ty layout templates and wire all client modules
  - [x] 12.1 Create `src/_includes/base.njk` layout with two-pane structure (Index left, Stage right)
    - Include `<html-isolator>` custom element registration, `index-pane.ts`, `stage-pane.ts`, `ingestion-zone.ts` bundles
    - Wire Index item selection event to `loadItem` in Stage Pane
    - Wire Tag Cloud updates to `renderIndex` after each rebuild
    - _Requirements: 6.6, 7.1_

  - [x] 12.2 Create Markdown and HTML content templates (`src/_includes/markdown.njk`, `src/_includes/html-page.njk`)
    - Markdown template: render `content` inside `<article>`, display `title` as document heading
    - HTML template: render `<html-isolator src="{{ url }}">` inside Stage
    - _Requirements: 4.1, 4.4, 5.1_

- [x] 13. Implement the editorial design system (CSS)
  - [x] 13.1 Create `src/assets/css/main.css` with the editorial design system
    - Two-pane layout at 1:3 column ratio using CSS Grid; collapse Index to toggleable overlay below 1024px
    - Serif typeface for headings, sans-serif/monospaced for body text
    - High-contrast limited color palette with generous whitespace
    - Content transition: `transition-duration: 200ms` fade; tag filter transition: `transition-duration: 150ms`
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8_

  - [ ]* 13.2 Write unit tests for responsive layout
    - Assert Index collapses at viewport width < 1024px
    - Assert 1:3 layout ratio is maintained at 1024px and above
    - _Requirements: 7.7, 7.8_

- [x] 14. Wire `npm run dev` script and smoke-test the full pipeline
  - [x] 14.1 Add `npm run dev` script using `concurrently` to start `node watcher.js` and `eleventy --serve` together
    - Add `npm run build` for production builds
    - _Requirements: 8.5_

  - [ ]* 14.2 Write integration tests for the Watcher HTTP endpoint
    - POST a valid `.md` file; assert it appears in `src/content/`
    - POST a file with an existing name; assert `status: 'conflict'` response
    - Move a file into `src/content/`; assert 11ty rebuild is triggered within 2 seconds
    - _Requirements: 1.1, 1.2, 1.4, 8.2_

  - [ ]* 14.3 Write integration tests for the 11ty build pipeline
    - Trigger a build with fixture content; assert `_site/` and `search-index.json` are produced and valid
    - Build with fixture content tagged `foo`; assert `collections.foo` contains the item
    - _Requirements: 2.1, 2.2, 8.3_

- [x] 15. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use [fast-check](https://fast-check.dev/) with a minimum of 100 iterations per property
- Unit tests use [Vitest](https://vitest.dev/)
- Each property test must include the comment `// Feature: vault-sidecar, Property N: <property_text>`
