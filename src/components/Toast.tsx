import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

type Toast = { id: number; type: 'success' | 'error' | 'info'; message: string };
type ToastCtx = { push: (t: Omit<Toast, 'id'>) => void };

const Ctx = createContext<ToastCtx | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { ...t, id }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 4000);
  }, []);

  return (
    <Ctx.Provider value={{ push }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[60] flex w-full max-w-sm flex-col gap-2">
        {toasts.map((t) => (
          <div key={t.id} className="card flex items-start gap-3 p-3.5 shadow-lg animate-slide-up">
            {t.type === 'success' && <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />}
            {t.type === 'error' && <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />}
            {t.type === 'info' && <Info className="h-5 w-5 shrink-0 text-gold-500" />}
            <p className="flex-1 text-sm text-ink-800 dark:text-ink-100">{t.message}</p>
            <button onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))} className="text-ink-400 hover:text-ink-600">
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
