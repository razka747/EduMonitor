'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/app/lib/store';
import { isDemoUser, getDemoUsage, DEMO_MAX_RESPONSES_PER_FEATURE } from '@/app/lib/demoLimit';
import { Sparkles, AlertCircle, ShieldAlert } from 'lucide-react';

interface DemoQuotaBadgeProps {
  featureKey: string;
  featureLabel: string;
  className?: string;
}

export default function DemoQuotaBadge({ featureKey, featureLabel, className = '' }: DemoQuotaBadgeProps) {
  const { currentUser } = useAppStore();
  const [usage, setUsage] = useState({ count: 0, remaining: DEMO_MAX_RESPONSES_PER_FEATURE, max: DEMO_MAX_RESPONSES_PER_FEATURE, allowed: true });

  const updateQuota = () => {
    if (!currentUser || !isDemoUser(currentUser)) return;
    const identifier = currentUser.email || currentUser.id;
    setUsage(getDemoUsage(identifier, featureKey));
  };

  useEffect(() => {
    updateQuota();

    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (!customEvent.detail || customEvent.detail.featureKey === featureKey) {
        updateQuota();
      }
    };

    window.addEventListener('demo_usage_updated', handleUpdate);
    return () => window.removeEventListener('demo_usage_updated', handleUpdate);
  }, [currentUser, featureKey]);

  if (!currentUser || !isDemoUser(currentUser)) {
    return null;
  }

  const isExhausted = usage.remaining <= 0;

  return (
    <div
      className={`w-full overflow-hidden rounded-xl border px-3.5 py-2.5 transition-all ${
        isExhausted
          ? 'bg-slate-900 text-white border-slate-800 shadow-sm'
          : 'bg-white border-slate-200 text-slate-800 shadow-sm'
      } ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        {/* Left: Info */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
              isExhausted
                ? 'bg-rose-500/20 text-rose-300'
                : 'bg-blue-50 text-blue-600 border border-blue-100'
            }`}
          >
            {isExhausted ? <ShieldAlert className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs font-bold tracking-tight ${isExhausted ? 'text-white' : 'text-slate-900'}`}>
                Akun Demo Guru
              </span>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  isExhausted
                    ? 'bg-rose-500/20 text-rose-200 border border-rose-500/30'
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                Maks. 5 aksi/hari
              </span>
            </div>
            <p className={`text-[11px] truncate mt-0.5 ${isExhausted ? 'text-slate-300' : 'text-slate-500'}`}>
              {isExhausted
                ? `Kuota respon hari ini telah habis (5/5 respon digunakan).`
                : `Maks. 5 respon per hari di fitur ${featureLabel}.`}
            </p>
          </div>
        </div>

        {/* Right: Compact quota pill (selalu di dalam kartu, tidak offside) */}
        <div
          className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-lg border self-start sm:self-center flex-shrink-0 ${
            isExhausted
              ? 'bg-slate-800 border-slate-700 text-rose-400'
              : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}
        >
          <span className="text-[11px] font-semibold whitespace-nowrap">
            Sisa: <strong className={isExhausted ? 'text-rose-400' : 'text-blue-600'}>{usage.remaining}</strong>/{usage.max}
          </span>
          <div className="flex items-center gap-1 flex-shrink-0">
            {Array.from({ length: usage.max }).map((_, i) => (
              <span
                key={i}
                className={`w-2 h-2 rounded-full transition-all ${
                  i < usage.remaining
                    ? isExhausted
                      ? 'bg-rose-500'
                      : 'bg-blue-600'
                    : isExhausted
                    ? 'bg-slate-700'
                    : 'bg-slate-200'
                }`}
                title={`Sisa slot ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
