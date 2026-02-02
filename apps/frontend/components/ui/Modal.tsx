'use client';

import React, { useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Modal({ open, onOpenChange, title, children, size = 'md' }: ModalProps) {
  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50 animate-in fade-in" />
        <Dialog.Content
          className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-3xl shadow-2xl z-50 w-full ${sizes[size]} max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-300`}
        >
          <div className="p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
            <Dialog.Title className="text-xl font-black text-slate-900">{title}</Dialog.Title>
            <Dialog.Close asChild>
              <button className="text-slate-400 hover:text-slate-600 transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </Dialog.Close>
          </div>
          <div className="p-6">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
