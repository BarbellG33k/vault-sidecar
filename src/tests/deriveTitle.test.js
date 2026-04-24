// Feature: vault-sidecar, Property 7: Title derivation is always non-empty and well-formed

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { deriveTitle } from '../../src/_data/deriveTitle.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Arbitrary filename with a path prefix and extension */
const arbitraryInputPath = fc.tuple(
  fc.stringMatching(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,30}$/),
  fc.constantFrom('.md', '.html', '.txt', ''),
).map(([name, ext]) => `src/content/${name}${ext}`);

/** Arbitrary optional front matter title */
const arbitraryFrontMatterTitle = fc.oneof(
  fc.constant(undefined),
  fc.constant(null),
  fc.constant(''),
  fc.string({ minLength: 1, maxLength: 80 }),
);

// ---------------------------------------------------------------------------
// Property 7: Title derivation is always non-empty and well-formed
// Validates: Requirements 4.4, 4.5
// ---------------------------------------------------------------------------

describe('Property 7: Title derivation is always non-empty and well-formed', () => {
  it('derived title is always a non-empty string', () => {
    fc.assert(
      fc.property(arbitraryFrontMatterTitle, arbitraryInputPath, (title, inputPath) => {
        const result = deriveTitle(title, inputPath);
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 },
    );
  });

  it('when derived from filename, title contains no hyphens or underscores', () => {
    fc.assert(
      fc.property(arbitraryInputPath, (inputPath) => {
        // Force filename derivation by passing empty/undefined title
        const result = deriveTitle(undefined, inputPath);
        expect(result).not.toMatch(/[-_]/);
      }),
      { numRuns: 100 },
    );
  });

  it('when derived from filename, title is title-cased (each word starts with uppercase)', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9_-]{1,30}$/).map((n) => `src/content/${n}.md`),
        (inputPath) => {
          const result = deriveTitle(undefined, inputPath);
          // Each word should start with an uppercase letter
          const words = result.split(' ');
          for (const word of words) {
            if (word.length > 0) {
              expect(word.charAt(0)).toBe(word.charAt(0).toUpperCase());
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('front matter title is returned as-is when non-empty', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 80 }),
        arbitraryInputPath,
        (title, inputPath) => {
          const result = deriveTitle(title, inputPath);
          expect(result).toBe(title);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Unit tests for title derivation (Task 5.5)
// Requirements: 4.4, 4.5
// ---------------------------------------------------------------------------

describe('deriveTitle — filename derivation', () => {
  it('"my-project_notes.md" → "My Project Notes"', () => {
    expect(deriveTitle(undefined, 'my-project_notes.md')).toBe('My Project Notes');
  });

  it('hyphens are replaced with spaces', () => {
    expect(deriveTitle(undefined, 'hello-world.md')).toBe('Hello World');
  });

  it('underscores are replaced with spaces', () => {
    expect(deriveTitle(undefined, 'foo_bar_baz.md')).toBe('Foo Bar Baz');
  });

  it('mixed hyphens and underscores', () => {
    expect(deriveTitle(undefined, 'src/content/my-project_notes.md')).toBe('My Project Notes');
  });

  it('single word filename', () => {
    expect(deriveTitle(undefined, 'notes.md')).toBe('Notes');
  });
});

describe('deriveTitle — front matter title takes precedence', () => {
  it('returns front matter title when provided', () => {
    expect(deriveTitle('My Custom Title', 'my-project_notes.md')).toBe('My Custom Title');
  });

  it('front matter title overrides filename derivation', () => {
    expect(deriveTitle('Override Title', 'src/content/some-file.md')).toBe('Override Title');
  });

  it('empty string front matter title falls back to filename', () => {
    expect(deriveTitle('', 'hello-world.md')).toBe('Hello World');
  });

  it('null front matter title falls back to filename', () => {
    expect(deriveTitle(null, 'hello-world.md')).toBe('Hello World');
  });

  it('undefined front matter title falls back to filename', () => {
    expect(deriveTitle(undefined, 'hello-world.md')).toBe('Hello World');
  });
});
