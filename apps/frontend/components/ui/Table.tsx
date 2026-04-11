import React from 'react';
import { cn } from '../../lib/utils';

interface TableProps {
  children: React.ReactNode;
  className?: string;
}

export function Table({ children, className }: TableProps) {
  return (
    <div className={cn('overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-card', className)}>
      <table className="w-full text-left">{children}</table>
    </div>
  );
}

export function TableHead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="bg-surface-muted border-b border-slate-200">
      <tr>{children}</tr>
    </thead>
  );
}

export function TableHeader({
  children,
  className,
  sortable,
  sortDirection,
  onSort,
}: {
  children: React.ReactNode;
  className?: string;
  sortable?: boolean;
  sortDirection?: 'asc' | 'desc' | null;
  onSort?: () => void;
}) {
  const inner = (
    <span className="inline-flex items-center gap-1">
      {children}
      {sortable && (
        <span className="material-symbols-outlined text-[14px] text-slate-400">
          {sortDirection === 'asc'
            ? 'arrow_upward'
            : sortDirection === 'desc'
            ? 'arrow_downward'
            : 'unfold_more'}
        </span>
      )}
    </span>
  );

  return (
    <th
      className={cn(
        'px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider',
        sortable && 'cursor-pointer select-none hover:text-slate-700 transition-colors',
        className,
      )}
      onClick={sortable ? onSort : undefined}
    >
      {inner}
    </th>
  );
}

export function TableBody({ children }: { children: React.ReactNode }) {
  return <tbody>{children}</tbody>;
}

export function TableRow({
  children,
  className,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <tr
      className={cn(
        'border-b border-slate-100 transition-colors',
        onClick
          ? 'cursor-pointer hover:bg-primary-light/30'
          : 'hover:bg-slate-50/60',
        className,
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
    >
      {children}
    </tr>
  );
}

export function TableCell({
  children,
  className,
  truncate,
}: {
  children: React.ReactNode;
  className?: string;
  truncate?: boolean;
}) {
  return (
    <td
      className={cn(
        'px-6 py-4 text-sm text-slate-700',
        truncate && 'max-w-[200px] truncate',
        className,
      )}
    >
      {children}
    </td>
  );
}
