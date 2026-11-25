import React from 'react';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { useErp } from '../../context/ErpContext';

export default function Toast() {
  const { toast } = useErp();
  if (!toast) return null;

  const styles =
    toast.type === 'error'
      ? 'bg-red-950/95 border-red-500/40 text-red-100'
      : toast.type === 'info'
        ? 'bg-zinc-900/95 border-zinc-700 text-zinc-100'
        : 'bg-emerald-950/95 border-emerald-500/40 text-emerald-100';

  const Icon =
    toast.type === 'error' ? AlertCircle : toast.type === 'info' ? Info : CheckCircle2;

  return (
    <div className="fixed bottom-5 right-5 z-[100] no-print animate-in fade-in slide-in-from-bottom-3">
      <div
        className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-2xl backdrop-blur-md text-sm font-medium ${styles}`}
      >
        <Icon className="w-4 h-4 shrink-0" />
        <span>{toast.message}</span>
      </div>
    </div>
  );
}
