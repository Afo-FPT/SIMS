'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ManagerServiceRequestsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/manager/dashboard');
  }, [router]);

  return null;
}
