import React from 'react';
import { cn } from '../../lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'elevated' | 'ghost';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  title?: string;
  description?: string;
  footer?: React.ReactNode;
}

export function Card({
  children,
  className,
  variant = 'default',
  padding = 'md',
  title,
  description,
  footer,
}: CardProps) {
  const variants = {
    default:  'bg-white border border-slate-200 shadow-card',
    elevated: 'bg-white border border-slate-200 shadow-elevated',
    ghost:    'bg-transparent',
  };

  const paddings = {
    none: '',
    sm:   'p-4',
    md:   'p-5',
    lg:   'p-6',
  };

  return (
    <div className={cn('rounded-2xl', variants[variant], className)}>
      {(title || description) && (
        <div className={cn('border-b border-slate-100', paddings[padding])}>
          {title && (
            <h3 className="text-base font-bold text-slate-900 leading-snug">{title}</h3>
          )}
          {description && (
            <p className="mt-0.5 text-sm text-slate-500">{description}</p>
          )}
        </div>
      )}
      <div className={cn(padding !== 'none' && paddings[padding])}>{children}</div>
      {footer && (
        <div
          className={cn(
            'border-t border-slate-100 bg-surface-muted rounded-b-2xl',
            paddings[padding],
          )}
        >
          {footer}
        </div>
      )}
    </div>
  );
}
