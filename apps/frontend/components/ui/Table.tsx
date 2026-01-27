import React from 'react';

interface TableProps {
  children: React.ReactNode;
  className?: string;
}

export function Table({ children, className = '' }: TableProps) {
  return (
    <div className={`overflow-x-auto rounded-2xl border border-slate-200 bg-white ${className}`}>
      <table className="w-full text-left">{children}</table>
    </div>
  );
}

export function TableHead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="bg-slate-50 border-b border-slate-200">
      <tr>{children}</tr>
    </thead>
  );
}

export function TableHeader({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest">
      {children}
    </th>
  );
}

export function TableBody({ children }: { children: React.ReactNode }) {
  return <tbody>{children}</tbody>;
}

export function TableRow({
  children,
  className = '',
  onClick,
}: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  return (
    <tr
      className={`border-b border-slate-100 hover:bg-slate-50/50 transition-colors ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
    >
      {children}
    </tr>
  );
}

export function TableCell({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-6 py-4 ${className}`}>{children}</td>;
}
