import { ButtonHTMLAttributes, ReactNode } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}

export function Button({ 
  variant = 'primary', 
  size = 'md', 
  children, 
  className = '',
  disabled,
  ...props 
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantStyles = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 disabled:hover:bg-blue-600',
    secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 disabled:hover:bg-gray-100',
    danger: 'bg-red-600 text-white hover:bg-red-700 disabled:hover:bg-red-600',
    ghost: 'text-gray-700 hover:bg-gray-100 disabled:hover:bg-transparent',
  };
  
  const sizeStyles = {
    sm: 'px-3 py-1.5 gap-1.5',
    md: 'px-4 py-2 gap-2',
    lg: 'px-6 py-3 gap-2',
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
