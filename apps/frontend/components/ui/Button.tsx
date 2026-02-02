import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  const variants = {
    primary: 'bg-primary text-white hover:bg-primary-dark disabled:opacity-50',
    secondary: 'bg-slate-200 text-slate-900 hover:bg-slate-300 disabled:opacity-50',
    danger: 'bg-red-500 text-white hover:bg-red-600 disabled:opacity-50',
    ghost: 'bg-transparent text-slate-700 hover:bg-slate-100 disabled:opacity-50',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      {...props}
      disabled={disabled || isLoading}
      className={`font-bold rounded-xl transition-colors ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {isLoading ? (
        <span className="flex items-center gap-2">
          <div className="size-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          Loading...
        </span>
      ) : (
        children
      )}
    </button>
  );
}
