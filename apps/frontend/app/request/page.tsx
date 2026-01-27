'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RequestPage() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in
    if (typeof window !== 'undefined') {
      const role = localStorage.getItem('sws_persona');
      const verified = localStorage.getItem('sws_verified') === 'true';

      if (role === 'CUSTOMER' && verified) {
        // Redirect to customer dashboard if logged in as customer
        router.push('/customer/dashboard');
      } else {
        // Redirect to login for non-authenticated users
        router.push('/login');
      }
    }
  }, [router]);

  // Show loading state while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-slate-600">Redirecting...</p>
      </div>
    </div>
  );
}
