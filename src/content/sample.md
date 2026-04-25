---
title: Sample Markdown Document
date: 2026-04-23
tags:
  - sample
  - markdown
  - documentation
permalink: /content/sample-markdown/index.html
---

# vault-sidecar

A local-first, static-site digital repository built on Eleventy.

## What This Is

This file serves as a **sample Markdown document** demonstrating how content works in vault-sidecar. Every `.md` file in `src/content/` becomes a page in the two-pane reader.

## Features Demonstrated

- **Front matter** — The block at the top of this file defines `title`, `date`, and `tags`.
- **Markdown rendering** — Headers, lists, code blocks, and inline formatting are all supported.
- **Heading anchors** — Every heading gets a clickable permalink on hover.
- **Syntax highlighting** — Code blocks get Shiki-powered highlighting at build time:

```javascript
// Example: how the ingestion client works
export async function ingestFiles(files, watcherUrl) {
  const results = [];
  for (const file of files) {
    const formData = new FormData();
    formData.append('file', file, file.name);
    const response = await fetch(watcherUrl, {
      method: 'POST',
      body: formData,
    });
    results.push(await response.json());
  }
  return results;
}
```

- **Tag extraction** — Tags in front matter are indexed for filtering.

## Task Lists

Track progress with interactive-looking task lists:

- [x] Install vault-sidecar
- [x] Add content files
- [x] Configure build pipeline
- [ ] Deploy to production
- [ ] Write documentation

## Admonitions / Callouts

Use container syntax to create visually distinct callout blocks:

:::note Pro Tip
You can drop `.md`, `.html`, or `.txt` files directly into `src/content/` and they will appear instantly in the sidebar.
:::

:::warning Heads Up
The file-watcher server must be running for drag-and-drop ingestion to work. Start it with `npm run dev`.
:::

:::tip Performance
Build-time syntax highlighting means zero runtime cost. Shiki runs during `eleventy` and embeds the colored tokens as static HTML.
:::

:::danger Data Loss
Always back up your `src/content/` folder. The ingestion zone overwrites files with the same name without creating backups.
:::

## Tables

Clean, readable tables with hover states:

| Feature | Status | Notes |
|---------|--------|-------|
| Markdown | ✅ Supported | Full CommonMark + GitHub extras |
| HTML | ✅ Supported | Rendered inside Shadow DOM for isolation |
| Plain text | ✅ Supported | Wrapped in `<pre>` with monospace font |
| Syntax highlighting | ✅ Supported | Shiki at build time |
| Task lists | ✅ Supported | Clickable checkboxes |
| Footnotes | ✅ Supported | See below |

## Blockquotes

> The vault-sidecar project follows a few core principles that keep it lightweight and resilient. Your data lives in plain files on your machine. There is no database, no cloud lock-in, and no proprietary format.
>
> <cite>— Design Principles</cite>

## Footnotes

You can reference sources with footnotes[^1]. They render at the bottom of the article automatically. Multiple references are grouped together[^2].

[^1]: This is the first footnote. It can contain *formatted* text and even `code`.
[^2]: Footnotes are powered by `markdown-it-footnote` and styled to match the dark theme.

---

*This is a sample file. Replace it with your own content.*
