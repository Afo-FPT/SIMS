
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import RequestFormView from '../../components/views/RequestFormView';

export default function RequestPage() {
  const router = useRouter();
  
  const handleCancel = () => {
    router.push('/');
  };

  const handleComplete = () => {
    alert('Application Submitted Successfully!');
    router.push('/');
  };

  return <RequestFormView onCancel={handleCancel} onComplete={handleComplete} />;
}
