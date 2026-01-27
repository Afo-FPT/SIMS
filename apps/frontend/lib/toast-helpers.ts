/**
 * Toast helper functions for easier usage throughout the app
 * Usage: import { toast } from '@/lib/toast-helpers';
 * 
 * toast.success('Operation completed!');
 * toast.error('Something went wrong');
 * toast.warning('Please check your input');
 * toast.info('Processing your request...');
 */

import { useToastHelpers } from './toast';

// Export a hook that returns helper functions
export { useToastHelpers as useToast } from './toast';

// For non-component usage, you can create a toast instance
// Note: This requires the component to be within ToastProvider
export const toast = {
  success: (message: string, duration?: number) => {
    // This will be called from within components that have access to useToast
    console.warn('toast.success() should be called from within a component using useToast() hook');
  },
  error: (message: string, duration?: number) => {
    console.warn('toast.error() should be called from within a component using useToast() hook');
  },
  warning: (message: string, duration?: number) => {
    console.warn('toast.warning() should be called from within a component using useToast() hook');
  },
  info: (message: string, duration?: number) => {
    console.warn('toast.info() should be called from within a component using useToast() hook');
  },
};
