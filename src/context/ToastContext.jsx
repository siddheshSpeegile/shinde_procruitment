import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const Ctx = createContext(null);
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((kind, text) => {
    const id = Math.random().toString(36).slice(2);
    setItems((p) => [...p, { id, kind, text }]);
    setTimeout(() => setItems((p) => p.filter((t) => t.id !== id)), kind === 'error' ? 6000 : 3200);
  }, []);
  const api = useMemo(() => ({
    success: (t) => push('success', t),
    error: (t) => push('error', t),
    info: (t) => push('info', t),
  }), [push]);

  return (
    <Ctx.Provider value={api}>
      {children}
      <div className="fixed right-6 bottom-6 z-[70] flex flex-col gap-2 w-[min(380px,calc(100vw-48px))]" role="status" aria-live="polite">
        <AnimatePresence>
          {items.map((t) => (
            <motion.div key={t.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 40 }} transition={{ duration: 0.18 }}
              className="rounded-lg px-4 py-3 text-white shadow-xl" style={{ background: t.kind === 'error' ? '#9a2a22' : '#282828', borderLeft: `4px solid ${t.kind === 'error' ? '#f1a39b' : t.kind === 'success' ? '#3fae60' : '#9fbde8'}` }}>
              {t.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}
