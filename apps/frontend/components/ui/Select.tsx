import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, error, options, className = '', ...props }: SelectProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-bold text-slate-700 mb-2">{label}</label>
      )}
      <select
        {...props}
        className={`w-full px-4 py-3 rounded-2xl border ${error ? 'border-red-300 focus:border-red-500' : 'border-slate-200 focus:border-primary'
          } focus:ring-2 focus:ring-primary/20 outline-none transition-colors ${className}`}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
