// Feature: vault-sidecar, Property 9: Index displays all content items
// Feature: vault-sidecar, Property 10: Sort order correctness
// Feature: vault-sidecar, Property 11: Text search filter correctness
// Feature: vault-sidecar, Property 12: Tag filter intersection correctness

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import {
  filterItems,
  sortItems,
  renderIndex,
  type ContentItem,
  type IndexState,
} from '../assets/js/index-pane.js';

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const arbTag = fc.stringMatching(/^[a-z][a-z0-9-]{1,10}$/);

const arbContentItem = fc.record<ContentItem>({
  id: fc.webUrl(),
  title: fc.string({ minLength: 1, maxLength: 60 }),
  tags: fc.array(arbTag, { minLength: 0, maxLength: 5 }),
  date: fc.date({ min: new Date('2000-01-01'), max: new Date('2030-12-31') }).map((d) =>
    d.toISOString()
  ),
  url: fc.webUrl(),
  type: fc.constantFrom('markdown' as const, 'html' as const, 'text' as const),
});

function makeState(overrides: Partial<IndexState> = {}): IndexState {
  return {
    items: [],
    query: '',
    selectedTags: new Set(),
    selectedTypes: new Set(),
    deletedIds: new Set(),
    sortMode: 'recent',
    activeItemId: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Property 9: Index displays all content items
// Validates: Requirements 6.1
// ---------------------------------------------------------------------------
describe('Property 9: Index completeness', () => {
  it('rendered index entry count equals input list length when no filter is active', () => {
    fc.assert(
      fc.property(fc.array(arbContentItem, { minLength: 0, maxLength: 20 }), (items) => {
        const container = document.createElement('div');
        const state = makeState({ items });
        renderIndex(state, container);

        const listItems = container.querySelectorAll('.index-item');
        expect(listItems.length).toBe(items.length);
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 10: Sort order correctness
// Validates: Requirements 6.2
// ---------------------------------------------------------------------------
describe('Property 10: Sort order correctness', () => {
  it('recent sort produces date-descending order', () => {
    fc.assert(
      fc.property(fc.array(arbContentItem, { minLength: 2, maxLength: 20 }), (items) => {
        const sorted = sortItems(items, 'recent');
        for (let i = 0; i < sorted.length - 1; i++) {
          const a = new Date(sorted[i].date).getTime();
          const b = new Date(sorted[i + 1].date).getTime();
          expect(a).toBeGreaterThanOrEqual(b);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('alpha sort produces title-ascending order (case-insensitive)', () => {
    fc.assert(
      fc.property(fc.array(arbContentItem, { minLength: 2, maxLength: 20 }), (items) => {
        const sorted = sortItems(items, 'alpha');
        for (let i = 0; i < sorted.length - 1; i++) {
          const cmp = sorted[i].title
            .toLowerCase()
            .localeCompare(sorted[i + 1].title.toLowerCase());
          expect(cmp).toBeLessThanOrEqual(0);
        }
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 11: Text search filter correctness (tag-based exact path)
// Validates: Requirements 6.3
// Note: We test the tag-based filtering path (exact) rather than Fuse.js fuzzy
// matching to keep the property deterministic.
// ---------------------------------------------------------------------------
describe('Property 11: Text search filter correctness', () => {
  it('items with a tag that exactly matches the query are included in results', () => {
    fc.assert(
      fc.property(
        arbTag,
        fc.array(arbContentItem, { minLength: 1, maxLength: 15 }),
        (knownTag, extraItems) => {
          // Build an item guaranteed to have the knownTag
          const matchingItem: ContentItem = {
            id: 'https://example.com/match',
            title: 'Matching Item',
            tags: [knownTag],
            date: new Date().toISOString(),
            url: 'https://example.com/match',
            type: 'markdown',
          };

          const items = [...extraItems, matchingItem];
          const state = makeState({ items, query: knownTag });
          const result = filterItems(state);

          // The matching item must appear in results
          const found = result.some((r) => r.id === matchingItem.id);
          expect(found).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 12: Tag filter intersection correctness
// Validates: Requirements 6.4, 6.5
// ---------------------------------------------------------------------------
describe('Property 12: Tag filter intersection correctness', () => {
  it('all returned items contain every selected tag', () => {
    fc.assert(
      fc.property(
        fc.array(arbContentItem, { minLength: 0, maxLength: 20 }),
        fc.array(arbTag, { minLength: 1, maxLength: 3 }),
        (items, selectedTagsArr) => {
          const selectedTags = new Set(selectedTagsArr);
          const state = makeState({ items, selectedTags });
          const result = filterItems(state);

          for (const item of result) {
            for (const tag of selectedTags) {
              expect(item.tags).toContain(tag);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Task 8.7: Unit tests for Index Pane filter logic
// Validates: Requirements 6.3, 6.4, 6.5, 6.7
// ---------------------------------------------------------------------------
describe('Unit tests: filterItems and renderIndex', () => {
  const fixtures: ContentItem[] = [
    {
      id: '/notes/alpha',
      title: 'Alpha Note',
      tags: ['typescript', 'testing'],
      date: '2024-03-01T00:00:00.000Z',
      url: '/notes/alpha',
      type: 'markdown',
    },
    {
      id: '/notes/beta',
      title: 'Beta Report',
      tags: ['typescript', 'performance'],
      date: '2024-01-15T00:00:00.000Z',
      url: '/notes/beta',
      type: 'html',
    },
    {
      id: '/notes/gamma',
      title: 'Gamma Log',
      tags: ['devops'],
      date: '2024-06-10T00:00:00.000Z',
      url: '/notes/gamma',
      type: 'markdown',
    },
  ];

  it('returns all items when no query and no tags selected', () => {
    const state = makeState({ items: fixtures });
    const result = filterItems(state);
    expect(result).toHaveLength(3);
  });

  it('tag filter: single tag returns only matching items', () => {
    const state = makeState({
      items: fixtures,
      selectedTags: new Set(['typescript']),
    });
    const result = filterItems(state);
    expect(result).toHaveLength(2);
    expect(result.every((r) => r.tags.includes('typescript'))).toBe(true);
  });

  it('tag filter: intersection of two tags returns only items with both', () => {
    const state = makeState({
      items: fixtures,
      selectedTags: new Set(['typescript', 'testing']),
    });
    const result = filterItems(state);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('/notes/alpha');
  });

  it('tag filter: no items match selected tag returns empty array', () => {
    const state = makeState({
      items: fixtures,
      selectedTags: new Set(['nonexistent-tag']),
    });
    const result = filterItems(state);
    expect(result).toHaveLength(0);
  });

  it('recent sort: items ordered by date descending', () => {
    const state = makeState({ items: fixtures, sortMode: 'recent' });
    const result = filterItems(state);
    expect(result[0].id).toBe('/notes/gamma'); // 2024-06-10
    expect(result[1].id).toBe('/notes/alpha'); // 2024-03-01
    expect(result[2].id).toBe('/notes/beta');  // 2024-01-15
  });

  it('alpha sort: items ordered by title ascending', () => {
    const state = makeState({ items: fixtures, sortMode: 'alpha' });
    const result = filterItems(state);
    expect(result[0].title).toBe('Alpha Note');
    expect(result[1].title).toBe('Beta Report');
    expect(result[2].title).toBe('Gamma Log');
  });

  it('renderIndex: shows "No results found" when filtered list is empty', () => {
    const container = document.createElement('div');
    const state = makeState({
      items: fixtures,
      selectedTags: new Set(['nonexistent-tag']),
    });
    renderIndex(state, container);
    const noResults = container.querySelector('.no-results');
    expect(noResults).not.toBeNull();
    expect(noResults!.textContent).toBe('No results found');
  });

  it('renderIndex: renders correct number of items', () => {
    const container = document.createElement('div');
    const state = makeState({ items: fixtures });
    renderIndex(state, container);
    const items = container.querySelectorAll('.index-item');
    expect(items.length).toBe(3);
  });

  it('renderIndex: renders tag cloud with all unique tags', () => {
    const container = document.createElement('div');
    const state = makeState({ items: fixtures });
    renderIndex(state, container);
    const tagCloud = container.querySelector('.tag-cloud');
    expect(tagCloud).not.toBeNull();
    const tagBtns = tagCloud!.querySelectorAll('.tag');
    // unique tags: typescript, testing, performance, devops = 4
    expect(tagBtns.length).toBe(4);
  });

  it('renderIndex: marks active item with aria-current', () => {
    const container = document.createElement('div');
    const state = makeState({ items: fixtures, activeItemId: '/notes/alpha' });
    renderIndex(state, container);
    const activeItem = container.querySelector('[aria-current="page"]');
    expect(activeItem).not.toBeNull();
    expect((activeItem as HTMLElement).dataset.id).toBe('/notes/alpha');
  });
});
