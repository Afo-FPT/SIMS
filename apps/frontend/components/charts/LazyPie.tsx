'use client';

import dynamic from 'next/dynamic';

const PieImpl = dynamic(
  async () => {
    const mod = await import('react-chartjs-2');
    return mod.Pie;
  },
  { ssr: false }
);

export const LazyPie = PieImpl;
