
'use client';

import React from 'react';

/**
 * In our SPA simulation, this acts more like a context provider 
 * than a literal <html> wrapper to avoid Error #31 and DOM nest issues.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      {children}
    </div>
  );
}
