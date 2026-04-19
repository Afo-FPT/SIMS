'use client';

import dynamic from 'next/dynamic';

const BarImpl = dynamic(
  async () => {
    const mod = await import('react-chartjs-2');
    return mod.Bar;
  },
  { ssr: false }
);

export const LazyBar = BarImpl;
