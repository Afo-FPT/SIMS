import type { Metadata } from 'next';
import '../styles/index.css';

export const metadata: Metadata = {
  title: 'SIMS-AI - Smart Inventory Management System',
  description: 'AI-powered Inventory Management System with Web and Mobile interfaces',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

