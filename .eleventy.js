import { createRequire } from 'module';
import MarkdownIt from 'markdown-it';
import markdownItShiki from '@shikijs/markdown-it';

const require = createRequire(import.meta.url);

export default async function (eleventyConfig) {
  // Configure markdown-it with Shiki for build-time syntax highlighting
  const md = new MarkdownIt({ html: true, linkify: true, typographer: true });

  const shikiPlugin = await markdownItShiki({
    theme: 'github-dark',
  });
  md.use(shikiPlugin);

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
