import { useCallback, useEffect, useRef, useState } from 'react';

/** Runs fn() on mount and whenever deps change. Ignores stale responses. reload() re-runs it. */
export function useAsync(fn, deps = [], { enabled = true } = {}) {
  const [state, setState] = useState({ data: null, loading: enabled, error: null });
  const tick = useRef(0);

  const run = useCallback(() => {
    if (!enabled) { setState({ data: null, loading: false, error: null }); return; }
    const id = ++tick.current;
    setState((p) => ({ ...p, loading: true, error: null }));
    Promise.resolve()
      .then(fn)
      .then((data) => { if (id === tick.current) setState({ data, loading: false, error: null }); })
      .catch((error) => { if (id === tick.current) setState({ data: null, loading: false, error }); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, enabled]);

  useEffect(() => { run(); }, [run]);
  return { ...state, reload: run };
}
