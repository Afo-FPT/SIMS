import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-bold text-slate-700 mb-2">{label}</label>
      )}
      <input
        {...props}
        className={`w-full px-4 py-3 rounded-2xl border ${error ? 'border-red-300 focus:border-red-500' : 'border-slate-200 focus:border-primary'
          } focus:ring-2 focus:ring-primary/20 outline-none transition-colors ${className}`}
      />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
