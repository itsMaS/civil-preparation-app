import { useAppStore } from '@/store/useAppStore';

export function Toasts() {
  const toasts = useAppStore((s) => s.toasts);
  if (!toasts.length) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`anim-rise rounded-full px-4 py-2 text-sm font-semibold shadow-lg ${t.kind === 'success' ? 'bg-green text-black' : 'bg-surface-3 text-text'}`}>{t.text}</div>
      ))}
    </div>
  );
}
