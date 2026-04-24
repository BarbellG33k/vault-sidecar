/**
 * searchIndex.js — 11ty global data helper
 *
 * Provides the SearchIndex data shape for use in templates.
 * The actual search-index.json file is emitted by src/search-index.njk.
 *
 * SearchIndexItem shape:
 *   id: string       — url used as stable ID
 *   title: string
 *   tags: string[]
 *   date: string     — ISO 8601
 *   url: string
 *   type: 'markdown' | 'html' | 'text'
 */

/**
 * Build a SearchIndexItem from an 11ty collection item.
 * @param {object} item - 11ty collection item
 * @returns {object} SearchIndexItem
 */
export function buildSearchIndexItem(item) {
  const data = item.data || {};
  const url = item.url || item.outputPath || '';
  const date = data.date instanceof Date
    ? data.date.toISOString()
    : (data.date ? new Date(data.date).toISOString() : new Date().toISOString());

  const inputPath = item.inputPath || '';
  const type = inputPath.endsWith('.html') ? 'html' : inputPath.endsWith('.txt') ? 'text' : 'markdown';

  return {
    id: url,
    title: data.title || '',
    tags: Array.isArray(data.tags) ? data.tags : [],
    date,
    url,
    type,
  };
}

/**
 * Build a full SearchIndex from an 11ty collections.all array.
 * @param {object[]} items - array of 11ty collection items
 * @returns {object} SearchIndex
 */
export function buildSearchIndex(items) {
  return {
    generated: new Date().toISOString(),
    items: items.map(buildSearchIndexItem),
  };
}
