import Fuse from 'fuse.js';

export type ContentType = 'markdown' | 'html' | 'text';

export interface ContentItem {
  id: string;
  title: string;
  tags: string[];
  date: string; // ISO 8601
  url: string;
  type: ContentType;
}

export interface IndexState {
  items: ContentItem[];
  query: string;
  selectedTags: Set<string>;
  selectedTypes: Set<ContentType>;
  deletedIds: Set<string>;
  sortMode: 'recent' | 'alpha';
  activeItemId: string | null;
}

/**
 * Sort items by the given sort mode.
 * 'recent' = date descending, 'alpha' = title ascending (case-insensitive)
 */
export function sortItems(
  items: ContentItem[],
  sortMode: 'recent' | 'alpha'
): ContentItem[] {
  const copy = [...items];
  if (sortMode === 'recent') {
    copy.sort((a, b) => {
      const da = new Date(a.date).getTime();
      const db = new Date(b.date).getTime();
      return db - da;
    });
  } else {
    copy.sort((a, b) =>
      a.title.toLowerCase().localeCompare(b.title.toLowerCase())
    );
  }
  return copy;
}

/**
 * Initialize a Fuse.js instance for fuzzy text search.
 */
export function initSearch(items: ContentItem[]): Fuse<ContentItem> {
  return new Fuse(items, {
    keys: ['title', 'tags'],
    threshold: 0.3,
    includeScore: false,
  });
}

/**
 * Filter items based on the current IndexState:
 * 1. Exclude deleted items
 * 2. Apply type filter (OR)
 * 3. Apply text search via Fuse.js (if query is non-empty)
 * 4. Apply tag intersection filter (all selected tags must be present)
 * 5. Sort the result
 */
export function filterItems(state: IndexState): ContentItem[] {
  let result = state.items.filter((item) => !state.deletedIds.has(item.id));

  // 1. Type filter (OR)
  if (state.selectedTypes.size > 0) {
    result = result.filter((item) => state.selectedTypes.has(item.type));
  }

  // 2. Text search
  if (state.query.trim().length > 0) {
    const fuse = initSearch(result);
    result = fuse.search(state.query).map((r) => r.item);
  }

  // 3. Tag intersection filter
  if (state.selectedTags.size > 0) {
    result = result.filter((item) =>
      Array.from(state.selectedTags).every((tag) => item.tags.includes(tag))
    );
  }

  // 4. Sort
  return sortItems(result, state.sortMode);
}

/**
 * Render the index pane into the given container element.
 * Renders: search input, sort toggle buttons, type filter, tag cloud, flat item list.
 */
export function renderIndex(state: IndexState, container: HTMLElement): void {
  const filtered = filterItems(state);

  // Collect all unique tags across all non-deleted items
  const allTags = Array.from(
    new Set(
      state.items
        .filter((item) => !state.deletedIds.has(item.id))
        .flatMap((item) => item.tags)
    )
  ).sort();

  container.innerHTML = '';

  // --- Search input ---
  const searchInput = document.createElement('input');
  searchInput.type = 'search';
  searchInput.placeholder = 'Search…';
  searchInput.value = state.query;
  searchInput.setAttribute('aria-label', 'Search content');
  container.appendChild(searchInput);

  // --- Sort toggle buttons ---
  const sortBar = document.createElement('div');
  sortBar.className = 'sort-bar';

  const recentBtn = document.createElement('button');
  recentBtn.textContent = 'Recent';
  recentBtn.dataset.sort = 'recent';
  recentBtn.setAttribute('aria-pressed', String(state.sortMode === 'recent'));
  sortBar.appendChild(recentBtn);

  const alphaBtn = document.createElement('button');
  alphaBtn.textContent = 'A–Z';
  alphaBtn.dataset.sort = 'alpha';
  alphaBtn.setAttribute('aria-pressed', String(state.sortMode === 'alpha'));
  sortBar.appendChild(alphaBtn);

  container.appendChild(sortBar);

  // --- Type filter ---
  const typeFilter = document.createElement('div');
  typeFilter.className = 'type-filter';
  const typeOptions: Array<{ key: ContentType; label: string }> = [
    { key: 'markdown', label: '.md' },
    { key: 'html', label: '.html' },
    { key: 'text', label: '.txt' },
  ];
  for (const opt of typeOptions) {
    const btn = document.createElement('button');
    btn.className = 'type-btn';
    btn.textContent = opt.label;
    btn.dataset.type = opt.key;
    btn.setAttribute('aria-pressed', String(state.selectedTypes.has(opt.key)));
    typeFilter.appendChild(btn);
  }
  container.appendChild(typeFilter);

  // --- Tag Cloud ---
  if (allTags.length > 0) {
    const tagCloud = document.createElement('div');
    tagCloud.className = 'tag-cloud';
    tagCloud.setAttribute('aria-label', 'Tag filter');

    for (const tag of allTags) {
      const tagBtn = document.createElement('button');
      tagBtn.className = 'tag';
      tagBtn.textContent = tag;
      tagBtn.dataset.tag = tag;
      tagBtn.setAttribute(
        'aria-pressed',
        String(state.selectedTags.has(tag))
      );
      tagCloud.appendChild(tagBtn);
    }

    container.appendChild(tagCloud);
  }

  // --- Item list ---
  const list = document.createElement('ul');
  list.className = 'index-list';

  if (filtered.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'no-results';
    empty.textContent = 'No results found';
    list.appendChild(empty);
  } else {
    for (const item of filtered) {
      const li = document.createElement('li');
      li.className = 'index-item';
      li.dataset.id = item.id;
      if (item.id === state.activeItemId) {
        li.setAttribute('aria-current', 'page');
      }

      const link = document.createElement('a');
      link.href = item.url;
      link.textContent = item.title;
      li.appendChild(link);

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'index-item__delete';
      deleteBtn.setAttribute('aria-label', `Remove ${item.title}`);
      deleteBtn.innerHTML =
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>';
      deleteBtn.dataset.id = item.id;
      li.appendChild(deleteBtn);

      list.appendChild(li);
    }
  }

  container.appendChild(list);
}
