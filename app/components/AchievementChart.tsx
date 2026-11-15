'use client';

import { useMemo } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement, Filler } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import type { Achievement } from '@/app/lib/types';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement, Filler);

const CATEGORY_CONFIG = {
  akademik: { label: 'Akademik', color: 'rgba(59, 130, 246, 0.8)', bg: 'rgba(59, 130, 246, 0.15)', emoji: '📚' },
  olahraga: { label: 'Olahraga', color: 'rgba(34, 197, 94, 0.8)', bg: 'rgba(34, 197, 94, 0.15)', emoji: '⚽' },
  seni: { label: 'Seni', color: 'rgba(168, 85, 247, 0.8)', bg: 'rgba(168, 85, 247, 0.15)', emoji: '🎨' },
  lainnya: { label: 'Lainnya', color: 'rgba(245, 158, 11, 0.8)', bg: 'rgba(245, 158, 11, 0.15)', emoji: '⭐' },
};

export default function AchievementChart({ achievements }: { achievements: Achievement[] }) {
  // Data untuk chart kategori (Doughnut)
  const categoryData = useMemo(() => {
    const counts: Record<string, number> = { akademik: 0, olahraga: 0, seni: 0, lainnya: 0 };
    achievements.forEach(a => {
      if (counts[a.category] !== undefined) counts[a.category]++;
    });

    return {
      labels: Object.keys(counts).map(k => CATEGORY_CONFIG[k as keyof typeof CATEGORY_CONFIG].label),
      datasets: [{
        data: Object.values(counts),
        backgroundColor: Object.keys(counts).map(k => CATEGORY_CONFIG[k as keyof typeof CATEGORY_CONFIG].color),
        borderColor: Object.keys(counts).map(k => CATEGORY_CONFIG[k as keyof typeof CATEGORY_CONFIG].color.replace('0.8', '1')),
        borderWidth: 2,
        hoverOffset: 8,
      }],
    };
  }, [achievements]);

  // Data untuk chart bulanan (Bar)
  const monthlyData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
    const currentMonth = new Date().getMonth();
    const last6Months: string[] = [];
    const counts: number[] = [];

    for (let i = 5; i >= 0; i--) {
      const monthIndex = (currentMonth - i + 12) % 12;
      last6Months.push(months[monthIndex]);

      const monthAchievements = achievements.filter(a => {
        const aDate = new Date(a.date);
        return aDate.getMonth() === monthIndex;
      });
      counts.push(monthAchievements.length);
    }

    return {
      labels: last6Months,
      datasets: [{
        label: 'Prestasi',
        data: counts,
        backgroundColor: 'rgba(245, 158, 11, 0.6)',
        borderColor: 'rgba(245, 158, 11, 1)',
        borderWidth: 2,
        borderRadius: 8,
        hoverBackgroundColor: 'rgba(245, 158, 11, 0.85)',
      }],
    };
  }, [achievements]);

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 16,
          usePointStyle: true,
          pointStyleWidth: 10,
          font: { size: 12, weight: '500' as const },
          color: '#94a3b8',
        },
      },
      tooltip: {
        backgroundColor: 'rgba(26, 26, 46, 0.9)',
        titleFont: { size: 13, weight: 'bold' as const },
        bodyFont: { size: 12 },
        padding: 12,
        cornerRadius: 12,
        displayColors: true,
      },
    },
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(26, 26, 46, 0.9)',
        titleFont: { size: 13, weight: 'bold' as const },
        bodyFont: { size: 12 },
        padding: 12,
        cornerRadius: 12,
        displayColors: false,
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

  const total = achievements.length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Chart Bulanan */}
      <div className="p-5 rounded-2xl bg-surface border border-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-foreground">📊 Tren Prestasi (6 Bulan)</h3>
          <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-100">
            Total: {total}
          </span>
        </div>
        <div className="h-52">
          <Bar data={monthlyData} options={barOptions as any} />
        </div>
      </div>

      {/* Chart Kategori */}
      <div className="p-5 rounded-2xl bg-surface border border-border">
        <h3 className="text-sm font-bold text-foreground mb-4">📈 Distribusi Kategori</h3>
        {total > 0 ? (
          <div className="h-52">
            <Doughnut data={categoryData} options={doughnutOptions as any} />
          </div>
        ) : (
          <div className="h-52 flex items-center justify-center text-sm text-muted">
            Belum ada data prestasi
          </div>
        )}
      </div>
    </div>
  );
}
