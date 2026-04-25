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

- **Tag extraction** — Tags in front matter (and inline `#hashtags` in the body) are indexed for filtering.

## Writing Content

1. Create a `.md` file in `src/content/`.
2. Add front matter if you want custom titles, dates, or tags.
3. Omit front matter and vault-sidecar derives the title from the filename.

## Markdown Support

| Element | Supported |
|---------|-----------|
| Headers | `#` through `######` |
| Lists | Ordered and unordered |
| Code blocks | Fenced with triple backticks |
| Inline code | Single backticks |
| Links | `[text](url)` |
| Images | `![alt](url)` |
| Tables | Yes |
| Horizontal rules | `---` |
| Blockquotes | `>` |

---

*This is a sample file. Replace it with your own content.*
