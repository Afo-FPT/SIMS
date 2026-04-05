'use client';

import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Button } from './Button';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'info',
  onConfirm,
}: ConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50 animate-in fade-in" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-3xl shadow-2xl z-50 w-full max-w-md animate-in fade-in zoom-in-95 duration-300">
          <div className="p-6">
            <Dialog.Title className="text-xl font-black text-slate-900 mb-2">{title}</Dialog.Title>
            <Dialog.Description className="text-sm text-slate-600 mb-6">{message}</Dialog.Description>
            <div className="flex gap-3 justify-end">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                {cancelLabel}
              </Button>
              <Button variant={variant === 'danger' ? 'danger' : 'primary'} onClick={handleConfirm}>
                {confirmLabel}
              </Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
