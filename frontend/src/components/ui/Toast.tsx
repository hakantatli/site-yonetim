import { useToastStore, type ToastType } from '../../store/toast';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

const icons: Record<ToastType, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const styles: Record<ToastType, { bg: string; border: string; text: string; icon: string }> = {
  success: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-900',
    icon: 'text-emerald-600',
  },
  error: {
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    text: 'text-rose-900',
    icon: 'text-rose-600',
  },
  warning: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-900',
    icon: 'text-amber-600',
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-900',
    icon: 'text-blue-600',
  },
};

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none p-2 sm:p-0">
      {toasts.map((t) => {
        const Icon = icons[t.type];
        const style = styles[t.type];

        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border shadow-lg backdrop-blur-xs transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 ${style.bg} ${style.border}`}
          >
            <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${style.icon}`} />
            <div className="flex-1 text-xs">
              {t.title && <h5 className={`font-bold mb-0.5 ${style.text}`}>{t.title}</h5>}
              <p className={`leading-relaxed ${style.text}`}>{t.message}</p>
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-black/5 transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
