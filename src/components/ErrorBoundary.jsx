import { Component } from 'react';

// A page file that no longer exists (the panel was open while a new version was deployed) cannot be loaded.
const STALE_FILE = /dynamically imported module|Importing a module script failed|Failed to fetch dynamically|ChunkLoadError|Loading chunk|error loading dynamically/i;
const KEY = 'shinde_reloaded_at';

/** Reloads the page once (not again within 30 s, so it can never loop). Returns true if it reloaded. */
export function reloadOnce() {
  try {
    const last = Number(sessionStorage.getItem(KEY) || 0);
    if (Date.now() - last < 30000) return false;
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch { /* storage blocked: skip the automatic reload */ return false; }
  window.location.reload();
  return true;
}

// Vite fires this when a lazily loaded page file cannot be fetched.
if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', (e) => { if (reloadOnce()) e.preventDefault(); });
}

/** Shows a short message instead of a blank or black screen when something fails to load or render. */
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) { return { error }; }

  componentDidCatch(error) {
    console.error(error);
    if (STALE_FILE.test(String(error?.message || error))) reloadOnce();
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="h-full flex items-center justify-center p-6 bg-bg text-ink">
        <div className="card p-8 max-w-[420px] w-full text-center">
          <h1 className="font-serif font-semibold text-2xl m-0 mb-2">Something went wrong</h1>
          <p className="text-muted mt-0 mb-5">This page could not be shown. A new version may have been released. Reload to continue.</p>
          <div className="flex justify-center gap-2">
            <button className="btn btn-primary" onClick={() => window.location.reload()}>Reload</button>
            <button className="btn" onClick={() => window.location.assign('/')}>Go to Dashboard</button>
          </div>
        </div>
      </div>
    );
  }
}
