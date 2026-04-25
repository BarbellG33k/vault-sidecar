import { createRequire } from 'module';
import MarkdownIt from 'markdown-it';
import markdownItShiki from '@shikijs/markdown-it';

const require = createRequire(import.meta.url);

export default async function (eleventyConfig) {
  // Do not let .gitignore exclude local content files from the build
  eleventyConfig.setUseGitIgnore(false);

  // Configure markdown-it with Shiki for build-time syntax highlighting
  const md = new MarkdownIt({ html: true, linkify: true, typographer: true });

  const shikiPlugin = await markdownItShiki({
    theme: 'github-dark',
  });
  md.use(shikiPlugin);

  // Heading anchors with hover-reveal permalink
  const anchorPlugin = require('markdown-it-anchor');
  md.use(anchorPlugin, {
    permalink: anchorPlugin.permalink.headerLink({
      safariReaderFix: true,
      class: 'header-anchor',
    }),
    slugify: (s) =>
      encodeURIComponent(
        String(s)
          .trim()
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^\w\-]/g, '')
      ),
  });

  // GitHub-style task lists
  md.use(require('markdown-it-task-lists'), { enabled: true, label: true });

  // Footnotes
  md.use(require('markdown-it-footnote'));

  // Admonition / callout containers
  const container = require('markdown-it-container');
  md.use(container, 'note', {
    render: (tokens, idx) => {
      const m = tokens[idx].info.trim().match(/^note\s+(.*)$/);
      const title = m ? m[1] : 'Note';
      if (tokens[idx].nesting === 1) {
        return `<div class="callout callout--note"><div class="callout__title">${title}</div><div class="callout__body">`;
      }
      return '</div></div>\n';
    },
  });
  md.use(container, 'warning', {
    render: (tokens, idx) => {
      const m = tokens[idx].info.trim().match(/^warning\s+(.*)$/);
      const title = m ? m[1] : 'Warning';
      if (tokens[idx].nesting === 1) {
        return `<div class="callout callout--warning"><div class="callout__title">${title}</div><div class="callout__body">`;
      }
      return '</div></div>\n';
    },
  });
  md.use(container, 'tip', {
    render: (tokens, idx) => {
      const m = tokens[idx].info.trim().match(/^tip\s+(.*)$/);
      const title = m ? m[1] : 'Tip';
      if (tokens[idx].nesting === 1) {
        return `<div class="callout callout--tip"><div class="callout__title">${title}</div><div class="callout__body">`;
      }
      return '</div></div>\n';
    },
  });
  md.use(container, 'danger', {
    render: (tokens, idx) => {
      const m = tokens[idx].info.trim().match(/^danger\s+(.*)$/);
      const title = m ? m[1] : 'Danger';
      if (tokens[idx].nesting === 1) {
        return `<div class="callout callout--danger"><div class="callout__title">${title}</div><div class="callout__body">`;
      }
      return '</div></div>\n';
    },
  });

  eleventyConfig.setLibrary('md', md);

  // Passthrough copy for static assets
  eleventyConfig.addPassthroughCopy('src/assets');

  // Lightweight Nunjucks filters
  eleventyConfig.addFilter('unique', (arr) => [...new Set(arr)]);
  eleventyConfig.addFilter('flatten', (arr) => arr.flat());
  eleventyConfig.addFilter('mapAttr', (arr, attr) => arr.map((item) => {
    const parts = attr.split('.');
    let val = item;
    for (const part of parts) val = val?.[part];
    return val;
  }));

  // Support .txt files as plain-text content pages
  eleventyConfig.addTemplateFormats('txt');
  eleventyConfig.addExtension('txt', {
    compile: (inputContent) => {
      return () => inputContent;
    },
  });

  return {
    dir: {
      input: 'src',
      output: '_site',
      includes: '_includes',
      data: '_data',
    },
    markdownTemplateEngine: 'njk',
    htmlTemplateEngine: 'njk',
  };
}
