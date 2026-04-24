// Feature: vault-sidecar, Property 3: Tag_Extractor always produces at least one tag
// Feature: vault-sidecar, Property 4: Tag format invariant
// Feature: vault-sidecar, Property 5: Tag normalization is idempotent (round-trip)

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { normalizeTag, normalizeTags, extractTags } from '../../src/_data/tagExtractor.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TAG_FORMAT = /^[a-z][a-z0-9-]*$/;

/** Build a minimal valid page object */
function makePage(date = new Date('2024-03-15')) {
  return { inputPath: 'src/content/test.md', date };
}

/** Arbitrary content string (may be empty) */
const arbitraryContent = fc.oneof(
  fc.constant(''),
  fc.constant(null),
  fc.constant(undefined),
  fc.string({ minLength: 0, maxLength: 500 }),
);

/** Arbitrary TagExtractorInput */
const arbitraryInput = fc.record({
  content: arbitraryContent,
  page: fc.record({
    inputPath: fc.constant('src/content/test.md'),
    date: fc.date({ min: new Date('2000-01-01'), max: new Date('2030-12-31') }),
  }),
  tags: fc.oneof(
    fc.constant(undefined),
    fc.constant([]),
    fc.array(fc.string({ minLength: 0, maxLength: 30 }), { minLength: 0, maxLength: 5 }),
  ),
});

// ---------------------------------------------------------------------------
// Property 3: Tag_Extractor always produces at least one tag
// Validates: Requirements 2.3, 2.4, 3.1, 3.2
// ---------------------------------------------------------------------------

describe('Property 3: Tag_Extractor always produces at least one tag', () => {
  it('returns tags.length >= 1 for any input including empty/null content', () => {
    fc.assert(
      fc.property(arbitraryInput, (input) => {
        const result = extractTags(input);
        expect(result.tags).toBeDefined();
        expect(Array.isArray(result.tags)).toBe(true);
        expect(result.tags.length).toBeGreaterThanOrEqual(1);
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 4: Tag format invariant
// Validates: Requirements 3.3
// ---------------------------------------------------------------------------

describe('Property 4: Tag format invariant', () => {
  it('all output tags match /^[a-z][a-z0-9-]*$/ when front matter tags normalize to valid values', () => {
    // Use front matter tags that are guaranteed to produce at least one valid tag
    // (start with a letter, have 2+ alpha chars) so the date fallback is not triggered.
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 500 }),
        fc.array(
          fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9 _-]{1,28}$/),
          { minLength: 1, maxLength: 5 },
        ),
        (content, rawTags) => {
          const inputWithTags = {
            content,
            page: { inputPath: 'src/content/test.md', date: new Date(Date.UTC(2024, 5, 15)) },
            tags: rawTags,
          };
          const resultWithTags = extractTags(inputWithTags);
          for (const tag of resultWithTags.tags) {
            expect(tag).toMatch(TAG_FORMAT);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('content-derived tags match /^[a-z][a-z0-9-]*$/ for meaningful content', () => {
    fc.assert(
      fc.property(
        // Generate content that has at least one meaningful word (3+ alpha chars starting with letter)
        fc.stringMatching(/[a-zA-Z]{3,}/).map((s) => s + ' extra words here for context'),
        (content) => {
          const input = {
            content,
            page: { inputPath: 'src/content/test.md', date: new Date(Date.UTC(2024, 5, 15)) },
          };
          const result = extractTags(input);
          for (const tag of result.tags) {
            expect(tag).toMatch(TAG_FORMAT);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 5: Tag normalization is idempotent (round-trip)
// Validates: Requirements 3.4
// ---------------------------------------------------------------------------

describe('Property 5: Tag normalization is idempotent (round-trip)', () => {
  it('normalizeTags(normalizeTags(x)) deep-equals normalizeTags(x)', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 0, maxLength: 50 }), { minLength: 0, maxLength: 20 }),
        (tags) => {
          const once = normalizeTags(tags);
          const twice = normalizeTags(once);
          expect(twice).toEqual(once);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Unit tests for Tag_Extractor fallback scenarios (Task 4.5)
// Requirements: 3.1, 3.2, 3.3, 3.5
// ---------------------------------------------------------------------------

describe('extractTags — fallback: unreadable file', () => {
  it('returns ["untagged"] when content is null and no date is available', () => {
    const result = extractTags({ content: null, page: { inputPath: 'test.md', date: null } });
    expect(result.tags).toEqual(['untagged']);
  });

  it('returns ["untagged"] when content is undefined and page is missing', () => {
    const result = extractTags({ content: undefined, page: null });
    expect(result.tags).toEqual(['untagged']);
  });
});

describe('extractTags — fallback: empty content → date tag', () => {
  it('returns YYYY-MM date tag when content is empty string', () => {
    // Use Date.UTC to avoid timezone-dependent month shifts
    const date = new Date(Date.UTC(2024, 6, 1)); // July 2024
    const result = extractTags({ content: '', page: makePage(date) });
    expect(result.tags).toEqual(['2024-07']);
  });

  it('returns YYYY-MM date tag when content is only whitespace', () => {
    const date = new Date(Date.UTC(2023, 10, 15)); // November 2023
    const result = extractTags({ content: '   \n\t  ', page: makePage(date) });
    expect(result.tags).toEqual(['2023-11']);
  });

  it('pads single-digit months with a leading zero', () => {
    const date = new Date(Date.UTC(2024, 2, 1)); // March 2024
    const result = extractTags({ content: '', page: makePage(date) });
    expect(result.tags[0]).toMatch(/^\d{4}-\d{2}$/);
    expect(result.tags).toEqual(['2024-03']);
  });
});

describe('extractTags — front matter tags take precedence', () => {
  it('uses front matter tags when provided', () => {
    const result = extractTags({
      content: 'some content here',
      page: makePage(),
      tags: ['JavaScript', 'Node.js'],
    });
    expect(result.tags).toContain('javascript');
    expect(result.tags).toContain('nodejs');
  });

  it('falls through to content extraction when front matter tags are empty', () => {
    const date = new Date('2024-05-10');
    const result = extractTags({
      content: 'javascript javascript javascript node node python',
      page: makePage(date),
      tags: [],
    });
    expect(result.tags).toContain('javascript');
  });
});

describe('extractTags — content-based extraction', () => {
  it('extracts top-3 most frequent meaningful words', () => {
    const result = extractTags({
      content: 'javascript javascript javascript node node python',
      page: makePage(),
    });
    expect(result.tags).toContain('javascript');
    expect(result.tags).toContain('node');
    expect(result.tags).toContain('python');
  });

  it('filters stop words from content extraction', () => {
    const result = extractTags({
      content: 'the the the and and and javascript',
      page: makePage(),
    });
    expect(result.tags).not.toContain('the');
    expect(result.tags).not.toContain('and');
    expect(result.tags).toContain('javascript');
  });
});

describe('normalizeTag — known transformations', () => {
  it('"Hello World" → "hello-world"', () => {
    expect(normalizeTag('Hello World')).toBe('hello-world');
  });

  it('"foo_bar" → "foo-bar"', () => {
    expect(normalizeTag('foo_bar')).toBe('foo-bar');
  });

  it('"Node.js" → "nodejs"', () => {
    expect(normalizeTag('Node.js')).toBe('nodejs');
  });

  it('"  leading-trailing  " → "leading-trailing"', () => {
    expect(normalizeTag('  leading-trailing  ')).toBe('leading-trailing');
  });

  it('"UPPERCASE" → "uppercase"', () => {
    expect(normalizeTag('UPPERCASE')).toBe('uppercase');
  });

  it('"hello--world" collapses multiple hyphens', () => {
    expect(normalizeTag('hello--world')).toBe('hello-world');
  });

  it('empty string → empty string', () => {
    expect(normalizeTag('')).toBe('');
  });
});

describe('normalizeTags — deduplication', () => {
  it('deduplicates tags that normalize to the same value', () => {
    const result = normalizeTags(['Hello World', 'hello-world', 'HELLO WORLD']);
    expect(result).toEqual(['hello-world']);
  });

  it('filters out tags that normalize to empty string', () => {
    const result = normalizeTags(['', '!!!', '---']);
    expect(result).toEqual([]);
  });

  it('preserves order of first occurrence', () => {
    const result = normalizeTags(['beta', 'alpha', 'beta']);
    expect(result).toEqual(['beta', 'alpha']);
  });
});
