---
title: Design Principles
date: 2026-04-21
tags:
  - design
  - philosophy
---

The vault-sidecar project follows a few core principles that keep it lightweight and resilient.

## Local-first

Your data lives in plain files on your machine. There is no database, no cloud lock-in, and no proprietary format. Markdown and HTML are the native tongues.

## Progressive enhancement

The site works without JavaScript. The index is rendered server-side by Eleventy; the client-side layer adds search, sorting, and AJAX navigation for a smoother experience. If the JS fails to load, every link still works.

## Static by default

The entire site can be built into a folder of static files and hosted anywhere — GitHub Pages, Netlify, S3, or a Raspberry Pi in your closet. The file-watcher server is an optional convenience for local authoring, not a requirement.

## Editorial typography

The reading experience is designed around long-form text. Generous line-height, comfortable measure, and a warm palette make it pleasant to read for extended periods.
