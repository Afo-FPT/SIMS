import React from 'react';
import { cn } from '../../lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  as: 'textarea';
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

type Props = InputProps | TextareaProps;

export function Input(props: Props) {
  const { label, error, helperText, leftIcon, rightIcon, className, ...rest } =
    props as InputProps & { as?: 'textarea' };
  const isTextarea = (props as TextareaProps).as === 'textarea';

  const baseClass = cn(
    'w-full rounded-2xl border bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400',
    'transition-colors duration-150 outline-none',
    'focus:border-primary focus:ring-2 focus:ring-primary/20',
    error
      ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
      : 'border-slate-200',
    leftIcon && 'pl-10',
    rightIcon && 'pr-10',
    isTextarea && 'resize-y min-h-[96px]',
    className,
  );

  return (
    <div className="w-full">
      {label && (
        <label className="mb-1.5 block text-sm font-semibold text-slate-700">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 flex items-center">
            {leftIcon}
          </span>
        )}
        {isTextarea ? (
          <textarea
            {...(rest as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
            className={baseClass}
          />
        ) : (
          <input
            {...(rest as React.InputHTMLAttributes<HTMLInputElement>)}
            className={baseClass}
          />
        )}
        {rightIcon && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 flex items-center">
            {rightIcon}
          </span>
        )}
      </div>
      {error && (
        <p className="mt-1.5 text-xs font-medium text-red-500">{error}</p>
      )}
      {!error && helperText && (
        <p className="mt-1.5 text-xs text-slate-500">{helperText}</p>
      )}
    </div>
  );
}
