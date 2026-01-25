
'use client';

import React from 'react';
import RequestFormView from '../../components/views/RequestFormView';

export default function RequestPage() {
  const handleCancel = () => {
    window.location.href = '/';
  };

  const handleComplete = () => {
    alert('Application Submitted Successfully!');
    window.location.href = '/';
  };

  return <RequestFormView onCancel={handleCancel} onComplete={handleComplete} />;
}
