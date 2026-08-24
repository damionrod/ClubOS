import { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import type { NoticeKind } from '@/lib/notifications';

type Notice = { id: number; message: string; kind: NoticeKind };

export function ToastHost() {
  const [items, setItems] = useState<Notice[]>([]);

  useEffect(() => {
    const onNotify = (event: Event) => {
      const detail = (event as CustomEvent<{ message: string; kind?: NoticeKind }>).detail;
      if (!detail?.message) return;
      const id = Date.now() + Math.floor(Math.random() * 1000);
      const item: Notice = { id, message: detail.message, kind: detail.kind ?? 'success' };
      setItems((current) => [...current.slice(-2), item]);
      window.setTimeout(() => setItems((current) => current.filter((x) => x.id !== id)), 3500);
    };
    window.addEventListener('clubos:notify', onNotify);
    return () => window.removeEventListener('clubos:notify', onNotify);
  }, []);

  const icon = (kind: NoticeKind) => {
    if (kind === 'error') return <AlertCircle className="h-5 w-5" />;
    if (kind === 'info') return <Info className="h-5 w-5" />;
    return <CheckCircle2 className="h-5 w-5" />;
  };

  return (
    <div className="fixed right-4 top-4 z-[1000] flex w-[min(92vw,380px)] flex-col gap-2" aria-live="polite" aria-atomic="true">
      {items.map((item) => (
        <div
          key={item.id}
          className={`flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg ${
            item.kind === 'error'
              ? 'border-red-200 bg-red-50 text-red-800'
              : item.kind === 'info'
                ? 'border-blue-200 bg-blue-50 text-blue-800'
                : 'border-emerald-200 bg-emerald-50 text-emerald-800'
          }`}
        >
          <span className="mt-0.5 shrink-0">{icon(item.kind)}</span>
          <div className="min-w-0 flex-1 text-sm font-medium">{item.message}</div>
          <button
            type="button"
            aria-label="Dismiss notification"
            className="shrink-0 rounded p-1 opacity-70 hover:opacity-100"
            onClick={() => setItems((current) => current.filter((x) => x.id !== item.id))}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
