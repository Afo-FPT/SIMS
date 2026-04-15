'use client';

import dynamic from 'next/dynamic';

const LineImpl = dynamic(
  async () => {
    const mod = await import('react-chartjs-2');
    return mod.Line;
  },
  { ssr: false }
);

export const LazyLine = LineImpl;
