import React from 'react';

interface EmptyStateProps {
  icon?: string;
  title: string;
  message?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon = 'inbox', title, message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="size-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
        <span className="material-symbols-outlined text-3xl text-slate-400">{icon}</span>
      </div>
      <h3 className="text-lg font-black text-slate-900 mb-2">{title}</h3>
      {message && <p className="text-sm text-slate-500 mb-4 max-w-sm">{message}</p>}
      {action && <div>{action}</div>}
    </div>
  );
}
