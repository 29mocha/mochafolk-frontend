// src/components/DailyCountChart.tsx
'use client';

import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Daftarkan komponen-komponen Chart.js yang akan kita gunakan
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// Tipe data untuk props
interface DailyCountChartProps {
  chartData: {
    date: string;
    count: number;
  }[];
}

export default function DailyCountChart({ chartData }: DailyCountChartProps) {
  const data = {
    labels: chartData.map(item => new Date(item.date).toLocaleDateString('id-ID', { weekday: 'short' })),
    datasets: [
      {
        label: 'Jumlah Antrian',
        data: chartData.map(item => item.count),
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Jumlah Antrian 7 Hari Terakhir',
      },
    },
  };

  return <Bar options={options} data={data} />;
}