# vault-sidecar

A local-first, static-site digital repository built on [Eleventy](https://www.11ty.dev/).

## Quick start

```bash
npm install
npm run build
```

The static site is emitted to `_site/`. You can open `_site/index.html` in a browser or serve it with any static file server:

```bash
npx serve _site
```

## Development

```bash
npm run dev
```

This builds TypeScript assets and runs Eleventy in serve/watch mode.

For local file ingestion (drag-and-drop upload), also start the watcher server:

```bash
npm run dev:full
```

## Content format

Add Markdown or HTML files to `src/content/`:

```md
---
title: My Note
date: 2026-04-23
tags:
  - ideas
  - draft
---

Your content here.
```

Front matter is optional. If you omit `title`, it is derived from the filename. If you omit `tags`, they are extracted automatically from the content.

## Architecture

| Layer | Tech |
|-------|------|
| Static generator | Eleventy 3 (ESM) |
| Templates | Nunjucks |
| Markdown | markdown-it + Shiki |
| Search | Fuse.js (client-side) |
| Styles | Plain CSS (custom properties) |
| Frontend | Vanilla TypeScript → esbuild |
| Tests | Vitest + jsdom |

## Scripts

| Script | Description |
|--------|-------------|
| `npm run build` | Compile assets and build the site |
| `npm run dev` | Development server with asset watching |
| `npm run dev:full` | Dev server + file watcher for ingestion |
| `npm test` | Run the test suite |

## Deploying

The `_site/` folder is a completely static bundle. Upload it to any static host:

- [Netlify](https://netlify.com)
- [Vercel](https://vercel.com)
- [GitHub Pages](https://pages.github.com)
- Any CDN or file server

The drag-and-drop ingestion feature requires the Node watcher server, so it is only available during local development.
