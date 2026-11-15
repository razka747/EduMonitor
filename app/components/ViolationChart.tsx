'use client';

import { useMemo } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement, Filler } from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import type { Violation } from '@/app/lib/types';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement, Filler);

export default function ViolationChart({ violations }: { violations: Violation[] }) {
  const chartData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
    const currentMonth = new Date().getMonth();
    const last6Months = [];
    const counts: number[] = [];

    for (let i = 5; i >= 0; i--) {
      const monthIndex = (currentMonth - i + 12) % 12;
      last6Months.push(months[monthIndex]);

      const monthViolations = violations.filter(v => {
        const vDate = new Date(v.date);
        return vDate.getMonth() === monthIndex;
      });
      counts.push(monthViolations.length);
    }

    return {
      labels: last6Months,
      datasets: [
        {
          label: 'Pelanggaran',
          data: counts,
          backgroundColor: 'rgba(79, 70, 229, 0.15)',
          borderColor: 'rgba(79, 70, 229, 1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: 'rgba(79, 70, 229, 1)',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7,
        },
      ],
    };
  }, [violations]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
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
        grid: {
          display: false,
        },
        ticks: {
          font: { size: 12, weight: '500' as const },
          color: '#94a3b8',
        },
        border: {
          display: false,
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(226, 232, 240, 0.5)',
        },
        ticks: {
          font: { size: 12 },
          color: '#94a3b8',
          stepSize: 1,
        },
        border: {
          display: false,
        },
      },
    },
  };

  return (
    <div className="h-64 lg:h-72">
      <Line data={chartData} options={options as any} />
    </div>
  );
}
