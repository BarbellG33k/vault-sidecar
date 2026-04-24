// Feature: vault-sidecar, Property 6: Markdown rendering preserves CommonMark structure

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import MarkdownIt from 'markdown-it';

const md = new MarkdownIt({ html: false, linkify: false, typographer: false });

// ---------------------------------------------------------------------------
// Generators for CommonMark constructs
// ---------------------------------------------------------------------------

/** Generate a heading string at a given level (1–6) */
const arbitraryHeading = fc
  .tuple(
    fc.integer({ min: 1, max: 6 }),
    fc.string({ minLength: 1, maxLength: 40 }).filter((s) => s.trim().length > 0 && !s.includes('\n')),
  )
  .map(([level, text]) => `${'#'.repeat(level)} ${text.trim()}`);

/** Generate an unordered list with 1–5 items */
const arbitraryUnorderedList = fc
  .array(
    fc.string({ minLength: 1, maxLength: 40 }).filter((s) => s.trim().length > 0 && !s.includes('\n')),
    { minLength: 1, maxLength: 5 },
  )
  .map((items) => items.map((i) => `- ${i.trim()}`).join('\n'));

/** Generate an ordered list with 1–5 items */
const arbitraryOrderedList = fc
  .array(
    fc.string({ minLength: 1, maxLength: 40 }).filter((s) => s.trim().length > 0 && !s.includes('\n')),
    { minLength: 1, maxLength: 5 },
  )
  .map((items) => items.map((i, idx) => `${idx + 1}. ${i.trim()}`).join('\n'));

/** Generate a blockquote */
const arbitraryBlockquote = fc
  .string({ minLength: 1, maxLength: 60 })
  .filter((s) => s.trim().length > 0 && !s.includes('\n'))
  .map((text) => `> ${text.trim()}`);

/** Generate a fenced code block with a language identifier */
const arbitraryFencedCode = fc
  .tuple(
    fc.constantFrom('js', 'ts', 'python', 'bash', 'css', 'html'),
    fc.string({ minLength: 1, maxLength: 80 }).filter((s) => s.trim().length > 0),
  )
  .map(([lang, code]) => `\`\`\`${lang}\n${code}\n\`\`\``);

/** Generate inline code */
const arbitraryInlineCode = fc
  .string({ minLength: 1, maxLength: 30 })
  .filter((s) => s.trim().length > 0 && !s.includes('`') && !s.includes('\n'))
  .map((code) => `\`${code}\``);

// ---------------------------------------------------------------------------
// Property 6: Markdown rendering preserves CommonMark structure
// Validates: Requirements 4.2, 4.3
// ---------------------------------------------------------------------------

describe('Property 6: Markdown rendering preserves CommonMark structure', () => {
  it('headings render as <h1>–<h6>', () => {
    fc.assert(
      fc.property(arbitraryHeading, (heading) => {
        const level = heading.match(/^(#+)/)[1].length;
        const html = md.render(heading);
        expect(html).toContain(`<h${level}`);
      }),
      { numRuns: 100 },
    );
  });

  it('unordered lists render as <ul>', () => {
    fc.assert(
      fc.property(arbitraryUnorderedList, (list) => {
        const html = md.render(list);
        expect(html).toContain('<ul>');
        expect(html).toContain('<li>');
      }),
      { numRuns: 100 },
    );
  });

  it('ordered lists render as <ol>', () => {
    fc.assert(
      fc.property(arbitraryOrderedList, (list) => {
        const html = md.render(list);
        expect(html).toContain('<ol>');
        expect(html).toContain('<li>');
      }),
      { numRuns: 100 },
    );
  });

  it('blockquotes render as <blockquote>', () => {
    fc.assert(
      fc.property(arbitraryBlockquote, (bq) => {
        const html = md.render(bq);
        expect(html).toContain('<blockquote>');
      }),
      { numRuns: 100 },
    );
  });

  it('fenced code blocks render as <pre><code>', () => {
    fc.assert(
      fc.property(arbitraryFencedCode, (block) => {
        const html = md.render(block);
        expect(html).toContain('<pre>');
        expect(html).toContain('<code');
      }),
      { numRuns: 100 },
    );
  });

  it('inline code renders as <code>', () => {
    fc.assert(
      fc.property(arbitraryInlineCode, (inline) => {
        const html = md.render(inline);
        expect(html).toContain('<code>');
      }),
      { numRuns: 100 },
    );
  });
});
