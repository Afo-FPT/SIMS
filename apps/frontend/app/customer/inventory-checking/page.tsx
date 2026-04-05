'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Inventory Checking đã gộp vào Service Requests (loại yêu cầu "Inventory Checking").
 * Chuyển hướng sang Service Requests.
 */
export default function CustomerInventoryCheckingRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/customer/service-requests');
  }, [router]);
  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <p className="text-slate-500">Redirecting to Service Requests...</p>
    </div>
  );
}
