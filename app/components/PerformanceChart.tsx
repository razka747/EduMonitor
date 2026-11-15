'use client';

import { useMemo } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement, Filler } from 'chart.js';
import { Line } from 'react-chartjs-2';
import type { Violation, Achievement } from '@/app/lib/types';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement, Filler);

const POINTS_PER_ACHIEVEMENT = 10;
const POINTS_PER_VIOLATION = 10;
const BASE_SCORE = 100;
const MAX_SCORE = 150;

interface Props {
  violations: Violation[];
  achievements: Achievement[];
}

export default function PerformanceChart({ violations, achievements }: Props) {
  // Data gabungan per bulan: pelanggaran vs prestasi
  const monthlyData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
    const currentMonth = new Date().getMonth();
    const labels: string[] = [];
    const violationCounts: number[] = [];
    const achievementCounts: number[] = [];

    for (let i = 5; i >= 0; i--) {
      const monthIndex = (currentMonth - i + 12) % 12;
      labels.push(months[monthIndex]);

      violationCounts.push(
        violations.filter(v => new Date(v.date).getMonth() === monthIndex).length
      );
      achievementCounts.push(
        achievements.filter(a => new Date(a.date).getMonth() === monthIndex).length
      );
    }

    return {
      labels,
      datasets: [
        {
          label: 'Prestasi',
          data: achievementCounts,
          backgroundColor: 'rgba(34, 197, 94, 0.15)',
          borderColor: 'rgba(34, 197, 94, 1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: 'rgba(34, 197, 94, 1)',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 5,
        },
        {
          label: 'Pelanggaran',
          data: violationCounts,
          backgroundColor: 'rgba(239, 68, 68, 0.15)',
          borderColor: 'rgba(239, 68, 68, 1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: 'rgba(239, 68, 68, 1)',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 5,
        },
      ],
    };
  }, [violations, achievements]);

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          padding: 16,
          usePointStyle: true,
          pointStyleWidth: 10,
          font: { size: 12, weight: '600' as const },
          color: '#94a3b8',
        },
      },
      tooltip: {
        backgroundColor: 'rgba(26, 26, 46, 0.95)',
        titleFont: { size: 13, weight: 'bold' as const },
        bodyFont: { size: 12 },
        padding: 12,
        cornerRadius: 12,
        displayColors: true,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 12, weight: '500' as const }, color: '#94a3b8' },
        border: { display: false },
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(226, 232, 240, 0.5)' },
        ticks: { font: { size: 12 }, color: '#94a3b8', stepSize: 1 },
        border: { display: false },
      },
    },
  };

  // Sistem poin: mulai 100, +10 tiap prestasi, -10 tiap pelanggaran
  const totalV = violations.length;
  const totalA = achievements.length;
  const pointsFromAch = totalA * POINTS_PER_ACHIEVEMENT;
  const pointsFromVio = totalV * POINTS_PER_VIOLATION;
  const rawScore = BASE_SCORE + pointsFromAch - pointsFromVio;
  const score = Math.max(0, Math.min(MAX_SCORE, rawScore));
  const scorePercent = Math.round((score / MAX_SCORE) * 100);

  const getScoreConfig = (s: number) => {
    if (s >= 100) return { label: '🌟 Sangat Baik', barColor: 'bg-gradient-to-r from-green-400 to-emerald-500', textColor: 'text-green-600', bgColor: 'bg-green-50 border-green-100' };
    if (s >= 80)  return { label: '👍 Baik', barColor: 'bg-gradient-to-r from-blue-400 to-indigo-500', textColor: 'text-blue-600', bgColor: 'bg-blue-50 border-blue-100' };
    if (s >= 60)  return { label: '⚠️ Cukup', barColor: 'bg-gradient-to-r from-yellow-400 to-amber-500', textColor: 'text-amber-600', bgColor: 'bg-amber-50 border-amber-100' };
    return { label: '🚨 Perlu Perhatian', barColor: 'bg-gradient-to-r from-red-400 to-rose-500', textColor: 'text-red-600', bgColor: 'bg-red-50 border-red-100' };
  };

  const cfg = getScoreConfig(score);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Bar Chart Gabungan - 2 kolom */}
      <div className="lg:col-span-2 p-6 rounded-2xl bg-surface border border-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            📊 Pelanggaran vs Prestasi
          </h3>
          <span className="text-xs font-semibold text-muted bg-surface-hover px-3 py-1.5 rounded-full">
            6 Bulan Terakhir
          </span>
        </div>
        <div className="h-64 lg:h-72">
          <Line data={monthlyData} options={barOptions as any} />
        </div>
      </div>

      {/* Panel Sistem Poin */}
      <div className="p-6 rounded-2xl bg-surface border border-border flex flex-col gap-4">
        <h3 className="text-lg font-bold text-foreground">🏅 Poin Siswa</h3>

        {/* Skor besar */}
        <div className={`rounded-2xl border p-4 text-center ${cfg.bgColor}`}>
          <p className={`text-5xl font-black tabular-nums ${cfg.textColor}`}>{score}</p>
          <p className="text-xs font-semibold text-muted mt-1">dari {MAX_SCORE} poin maksimal</p>
          <span className={`mt-2 inline-block text-xs font-bold px-3 py-1 rounded-full ${cfg.bgColor} ${cfg.textColor}`}>
            {cfg.label}
          </span>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-xs text-muted font-medium mb-1.5">
            <span>0</span>
            <span>Awal: {BASE_SCORE}</span>
            <span>{MAX_SCORE}</span>
          </div>
          <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden">
            {/* Marker garis awal 100 */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-gray-400 z-10 opacity-60"
              style={{ left: `${(BASE_SCORE / MAX_SCORE) * 100}%` }}
            />
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out ${cfg.barColor}`}
              style={{ width: `${scorePercent}%` }}
            />
          </div>
        </div>

        {/* Rincian poin */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted">🎯 Poin Awal</span>
            <span className="font-bold text-foreground">{BASE_SCORE}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-green-600">🏆 Prestasi ({totalA}×)</span>
            <span className="font-bold text-green-600">+{pointsFromAch}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-red-500">⚠️ Pelanggaran ({totalV}×)</span>
            <span className="font-bold text-red-500">−{pointsFromVio}</span>
          </div>
          <div className="pt-2 border-t border-border flex items-center justify-between text-sm">
            <span className="font-semibold text-foreground">Total Poin</span>
            <span className={`font-black text-base ${cfg.textColor}`}>{score}</span>
          </div>
        </div>

        <p className="text-xs text-muted text-center">
          +{POINTS_PER_ACHIEVEMENT} poin tiap prestasi · −{POINTS_PER_VIOLATION} poin tiap pelanggaran
        </p>
      </div>
    </div>
  );
}
