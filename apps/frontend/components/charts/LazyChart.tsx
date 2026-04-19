'use client';

import dynamic from 'next/dynamic';

const ChartImpl = dynamic(
  async () => {
    const mod = await import('react-chartjs-2');
    return mod.Chart;
  },
  { ssr: false }
);

export const LazyChart = ChartImpl;
