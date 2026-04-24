---
title: Hello World
date: 2026-04-20
tags:
  - getting-started
  - example
---

Welcome to **vault-sidecar** — your local-first, static-site digital repository.

## What is this?

This project is built on [Eleventy](https://www.11ty.dev/) and designed to feel like a digital notebook. Every Markdown or HTML file you drop into `src/content/` becomes a browsable, searchable page.

## Features

- **Two-pane layout** — an index on the left, a reading stage on the right.
- **Fuzzy search** — powered by Fuse.js, search across titles and tags.
- **Tag extraction** — automatic fallback tags when you don't specify them.
- **HTML isolation** — HTML content is sandboxed via Shadow DOM.
- **Drag-and-drop ingestion** — drop `.md` or `.html` files to add them (local dev only).

## Markdown support

You get full GitHub-flavored Markdown plus syntax highlighting:

```js
function greet(name) {
  return `Hello, ${name}!`;
}
```

Enjoy your stay.
