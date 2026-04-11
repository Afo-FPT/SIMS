import React from 'react';
import { cn } from '../../lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'error' | 'warning' | 'info' | 'neutral' | 'primary';
  size?: 'sm' | 'md';
  dot?: boolean;
  pulse?: boolean;
}

const dotColors = {
  success: 'bg-emerald-500',
  error:   'bg-red-500',
  warning: 'bg-amber-500',
  info:    'bg-blue-500',
  neutral: 'bg-slate-400',
  primary: 'bg-primary',
};

export function Badge({ children, variant = 'neutral', size = 'md', dot = false, pulse = false }: BadgeProps) {
  const variants = {
    success: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    error:   'bg-red-50 text-red-700 ring-1 ring-red-200',
    warning: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    info:    'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
    neutral: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
    primary: 'bg-primary-light text-primary ring-1 ring-primary/20',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center font-semibold rounded-lg',
        variants[variant],
        sizes[size],
      )}
    >
      {(dot || pulse) && (
        <span className="relative flex shrink-0 size-1.5">
          {pulse && (
            <span
              className={cn(
                'absolute inline-flex size-full rounded-full opacity-75 animate-ping',
                dotColors[variant],
              )}
            />
          )}
          <span className={cn('relative inline-flex size-1.5 rounded-full', dotColors[variant])} />
        </span>
      )}
      {children}
    </span>
  );
}
