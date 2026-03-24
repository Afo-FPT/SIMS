import type { Metadata } from 'next';
import './globals.css';
import { ToastProvider } from '../lib/toast';

export const metadata: Metadata = {
  title: 'SIMS-AI | Enterprise Logistics',
  description: 'Decentralized per-shelf warehousing powered by Gemini 3',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased selection:bg-primary/10 selection:text-primary bg-slate-50 text-slate-900 overflow-x-hidden pb-24">
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
