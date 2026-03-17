import React, { Suspense } from 'react';
import VerifyClient from './VerifyClient';

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <VerifyClient />
    </Suspense>
  );
}
