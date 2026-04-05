import React from 'react';
import { Button } from './Button';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'An error occurred while loading data. Please try again.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="size-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
        <span className="material-symbols-outlined text-3xl text-red-500">error</span>
      </div>
      <h3 className="text-lg font-black text-slate-900 mb-2">{title}</h3>
      <p className="text-sm text-slate-500 mb-4 max-w-sm">{message}</p>
      {onRetry && (
        <Button variant="primary" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}
