'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Inbound Requests đã gộp vào Service Requests (tab Inbound).
 * Redirect sang Service Requests.
 */
export default function ManagerInboundRequestsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/manager/service-requests');
  }, [router]);
  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <p className="text-slate-500">Redirecting to Service Requests...</p>
    </div>
  );
}
