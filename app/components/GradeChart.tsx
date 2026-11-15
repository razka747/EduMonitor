'use client';

import { useMemo, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import type { Grade } from '@/app/lib/types';
import { BarChart3 } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface GradeChartProps {
  grades: Grade[];
  studentName?: string;
}

// Warna unik per mapel — masing-masing berbeda
const SUBJECT_COLORS: Record<string, { bg: string; border: string; chip: string; chipActive: string }> = {
  'Matematika':         { bg: 'rgba(59,130,246,0.85)',  border: '#3b82f6', chip: 'bg-blue-50 text-blue-600 border-blue-200',     chipActive: 'bg-blue-600 text-white border-blue-600' },
  'Bahasa Indonesia':   { bg: 'rgba(16,185,129,0.85)',  border: '#10b981', chip: 'bg-emerald-50 text-emerald-600 border-emerald-200', chipActive: 'bg-emerald-600 text-white border-emerald-600' },
  'Bahasa Inggris':     { bg: 'rgba(245,158,11,0.85)',  border: '#f59e0b', chip: 'bg-amber-50 text-amber-600 border-amber-200',   chipActive: 'bg-amber-500 text-white border-amber-500' },
  'IPA':                { bg: 'rgba(139,92,246,0.85)',  border: '#8b5cf6', chip: 'bg-violet-50 text-violet-600 border-violet-200', chipActive: 'bg-violet-600 text-white border-violet-600' },
  'IPS':                { bg: 'rgba(236,72,153,0.85)',  border: '#ec4899', chip: 'bg-pink-50 text-pink-600 border-pink-200',      chipActive: 'bg-pink-600 text-white border-pink-600' },
  'Seni Budaya':        { bg: 'rgba(249,115,22,0.85)',  border: '#f97316', chip: 'bg-orange-50 text-orange-600 border-orange-200', chipActive: 'bg-orange-500 text-white border-orange-500' },
  'Pendidikan Agama':   { bg: 'rgba(20,184,166,0.85)',  border: '#14b8a6', chip: 'bg-teal-50 text-teal-600 border-teal-200',     chipActive: 'bg-teal-600 text-white border-teal-600' },
  'PJOK':               { bg: 'rgba(239,68,68,0.85)',   border: '#ef4444', chip: 'bg-red-50 text-red-600 border-red-200',        chipActive: 'bg-red-600 text-white border-red-600' },
};

// Warna fallback untuk mapel di luar daftar
const FALLBACK_COLORS = [
  { bg: 'rgba(99,102,241,0.85)',  border: '#6366f1', chip: 'bg-indigo-50 text-indigo-600 border-indigo-200',  chipActive: 'bg-indigo-600 text-white border-indigo-600' },
  { bg: 'rgba(6,182,212,0.85)',   border: '#06b6d4', chip: 'bg-cyan-50 text-cyan-600 border-cyan-200',        chipActive: 'bg-cyan-600 text-white border-cyan-600' },
  { bg: 'rgba(168,85,247,0.85)',  border: '#a855f7', chip: 'bg-purple-50 text-purple-600 border-purple-200',  chipActive: 'bg-purple-600 text-white border-purple-600' },
];

function getSubjectColor(subject: string, fallbackIdx: number) {
  return SUBJECT_COLORS[subject] ?? FALLBACK_COLORS[fallbackIdx % FALLBACK_COLORS.length];
}

export default function GradeChart({ grades = [] }: GradeChartProps) {
  const [activeSubject, setActiveSubject] = useState<string>('Semua');

  // Semua mapel unik dari data
  const allSubjects = useMemo(() => {
    return Array.from(new Set((grades || []).map(g => g.subject))).sort();
  }, [grades]);

  const chartData = useMemo(() => {
    const sorted = [...(grades || [])].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Filter berdasarkan mapel yang dipilih
    const filtered = activeSubject === 'Semua'
      ? sorted
      : sorted.filter(g => g.subject === activeSubject);

    // Subjects yang akan ditampilkan
    const subjects = activeSubject === 'Semua'
      ? allSubjects
      : [activeSubject];

    // Labels = tanggal unik
    const labels = Array.from(
      new Set(
        filtered.map(g =>
          new Date(g.date).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' })
        )
      )
    );

    const datasets = subjects.map((subject, idx) => {
      const color = getSubjectColor(subject, idx);
      const subjectGrades = filtered.filter(g => g.subject === subject);

      const data = labels.map(label => {
        const found = subjectGrades.find(
          g => new Date(g.date).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' }) === label
        );
        return found ? found.score : null;
      });

      return {
        label: subject,
        data,
        backgroundColor: color.bg,
        borderColor: color.border,
        borderWidth: 1.5,
        borderRadius: 6,
        borderSkipped: false,
      };
    });

    return { labels, datasets };
  }, [grades, activeSubject, allSubjects]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: activeSubject === 'Semua' && allSubjects.length > 1,
        position: 'bottom' as const,
        labels: {
          usePointStyle: true,
          pointStyle: 'rectRounded' as const,
          boxWidth: 10,
          boxHeight: 10,
          padding: 16,
          font: { size: 11 },
        },
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        callbacks: {
          label: (ctx: any) => `${ctx.dataset.label}: ${ctx.parsed.y ?? '-'}`,
        },
      },
    },
    scales: {
      y: {
        min: 0,
        max: 100,
        ticks: { stepSize: 20, font: { size: 11 } },
        grid: { color: 'rgba(0,0,0,0.05)' },
      },
      x: {
        grid: { display: false },
        ticks: { font: { size: 11 } },
      },
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false,
    },
  };

  if (grades.length === 0) {
    return (
      <div className="h-[300px] flex flex-col items-center justify-center text-muted border border-dashed border-border rounded-xl">
        <BarChart3 className="w-8 h-8 mb-2 opacity-20" />
        <p className="text-sm">Belum ada data nilai.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Chips Kategori Mapel */}
      {allSubjects.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {/* Chip "Semua" */}
          <button
            onClick={() => setActiveSubject('Semua')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-200 ${
              activeSubject === 'Semua'
                ? 'bg-foreground text-background border-foreground shadow-sm'
                : 'bg-surface-hover text-muted border-border hover:border-foreground/30'
            }`}
          >
            Semua Mapel
          </button>

          {/* Chip per mapel dengan warna unik */}
          {allSubjects.map((subject, idx) => {
            const color = getSubjectColor(subject, idx);
            const isActive = activeSubject === subject;
            return (
              <button
                key={subject}
                onClick={() => setActiveSubject(subject)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-200 ${
                  isActive ? color.chipActive : color.chip
                } hover:opacity-90`}
              >
                {subject}
              </button>
            );
          })}
        </div>
      )}

      {/* Bar Chart */}
      <div className="h-[280px] w-full">
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
}
