export interface IngestResponse {
  status: 'ok' | 'conflict' | 'error';
  filename?: string;
  message?: string;
}

const VALID_EXTENSIONS = ['.md', '.html', '.txt'];
const DEFAULT_WATCHER_URL = 'http://localhost:3001/ingest';

/**
 * Returns true if the filename has a .md or .html extension.
 */
export function validateFileExtension(filename: string): boolean {
  const lower = filename.toLowerCase();
  return VALID_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/**
 * POST each file to the watcher's /ingest endpoint as multipart/form-data.
 * Validates extension client-side first; returns an error response for invalid files.
 */
export async function ingestFiles(
  files: FileList | File[],
  watcherUrl: string = DEFAULT_WATCHER_URL
): Promise<IngestResponse[]> {
  const fileArray = Array.from(files);
  const results: IngestResponse[] = [];

  for (const file of fileArray) {
    if (!validateFileExtension(file.name)) {
      results.push({
        status: 'error',
        filename: file.name,
        message: `Unsupported file type: ${file.name.split('.').pop() ?? 'unknown'}`,
      });
      continue;
    }

    try {
      const formData = new FormData();
      formData.append('file', file, file.name);

      const response = await fetch(watcherUrl, {
        method: 'POST',
        body: formData,
      });

      const data: IngestResponse = await response.json();
      results.push(data);
    } catch (err) {
      const isNetworkError =
        err instanceof TypeError ||
        (err instanceof Error && /fetch|network/i.test(err.message));

      const message = isNetworkError
        ? 'Ingestion server unreachable. Run `npm run dev` to start it.'
        : err instanceof Error
          ? err.message
          : String(err);

      results.push({
        status: 'error',
        filename: file.name,
        message,
      });
    }
  }

  return results;
}

type DropZoneState = 'default' | 'drag-over' | 'uploading' | 'success' | 'error';

function setDropZoneState(el: HTMLElement, state: DropZoneState): void {
  el.dataset.state = state;
  el.classList.remove('drag-over', 'uploading', 'success', 'error');
  if (state !== 'default') {
    el.classList.add(state);
  }
}

function showStatus(el: HTMLElement, message: string, isError = false): void {
  let statusEl = el.querySelector<HTMLElement>('.ingest-status');
  if (!statusEl) {
    statusEl = document.createElement('p');
    statusEl.className = 'ingest-status';
    el.appendChild(statusEl);
  }
  statusEl.textContent = message;
  statusEl.classList.toggle('ingest-status--error', isError);
}

/**
 * Wire drag-and-drop event listeners onto the drop zone element.
 * Handles visual states, progress indication, error display, and conflict prompts.
 */
export function initIngestionZone(dropZoneEl: HTMLElement, watcherUrl?: string): void {
  setDropZoneState(dropZoneEl, 'default');

  dropZoneEl.addEventListener('dragover', (e) => {
    e.preventDefault();
    setDropZoneState(dropZoneEl, 'drag-over');
  });

  dropZoneEl.addEventListener('dragleave', (e) => {
    // Only reset if leaving the drop zone itself (not a child element)
    if (!dropZoneEl.contains(e.relatedTarget as Node)) {
      setDropZoneState(dropZoneEl, 'default');
    }
  });

  dropZoneEl.addEventListener('drop', async (e) => {
    e.preventDefault();
    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) {
      setDropZoneState(dropZoneEl, 'default');
      return;
    }

    // Check for unsupported types before uploading
    const unsupported = Array.from(files).filter(
      (f) => !validateFileExtension(f.name)
    );
    if (unsupported.length > 0) {
      const names = unsupported.map((f) => f.name).join(', ');
      setDropZoneState(dropZoneEl, 'error');
      showStatus(dropZoneEl, `Unsupported file type(s): ${names}`, true);
      return;
    }

    setDropZoneState(dropZoneEl, 'uploading');
    showStatus(dropZoneEl, `Uploading ${files.length} file(s)…`);

    const responses = await ingestFiles(files, watcherUrl);

    // Handle conflicts: prompt user for each conflicting file
    for (const resp of responses) {
      if (resp.status === 'conflict' && resp.filename) {
        const overwrite = window.confirm(
          `"${resp.filename}" already exists. Click OK to overwrite, or Cancel to skip.`
        );
        if (overwrite) {
          // Retry with overwrite flag
          const conflictFile = Array.from(files).find(
            (f) => f.name === resp.filename
          );
          if (conflictFile) {
            try {
              const formData = new FormData();
              formData.append('file', conflictFile, conflictFile.name);
              formData.append('overwrite', 'true');
              const url = watcherUrl ?? DEFAULT_WATCHER_URL;
              await fetch(url, { method: 'POST', body: formData });
            } catch {
              // Ignore retry errors; already reported
            }
          }
        }
      }
    }

    const errors = responses.filter((r) => r.status === 'error');
    if (errors.length > 0) {
      setDropZoneState(dropZoneEl, 'error');
      const msgs = errors.map((r) => r.message ?? r.filename ?? 'unknown').join('; ');
      showStatus(dropZoneEl, `Error: ${msgs}`, true);
    } else {
      setDropZoneState(dropZoneEl, 'success');
      showStatus(dropZoneEl, `${files.length} file(s) uploaded successfully.`);
      // Reset to default after a short delay
      setTimeout(() => setDropZoneState(dropZoneEl, 'default'), 3000);
    }
  });
}
