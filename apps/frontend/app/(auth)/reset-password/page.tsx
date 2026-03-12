'use client';

import React, { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiResetPassword } from '../../../lib/auth';
import { useToastHelpers } from '../../../lib/toast';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToastHelpers();

  const token = useMemo(() => searchParams.get('token') || '', [searchParams]);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError('Missing reset token. Please use the link in your email.');
      return;
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      const res = await apiResetPassword(token, password);
      toast.success(res.message || 'Password reset successfully.');
      router.push('/login');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Reset password failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-display">
      <div className="w-full max-w-md bg-white rounded-5xl shadow-2xl border border-slate-100 p-12 animate-slide-up">
        <div className="text-center mb-10">
          <Link href="/" className="inline-flex bg-primary p-3 rounded-2xl text-white shadow-xl shadow-primary/20 mb-6 cursor-pointer">
            <span className="material-symbols-outlined text-3xl">lock_reset</span>
          </Link>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Reset password</h1>
          <p className="text-slate-500 font-medium">Set a new password for your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="new-password" className="block text-sm font-bold text-slate-700 mb-2">
              New password
            </label>
            <input
              id="new-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter a new password"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
              required
            />
          </div>

          <div>
            <label htmlFor="confirm-password" className="block text-sm font-bold text-slate-700 mb-2">
              Confirm password
            </label>
            <input
              id="confirm-password"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Re-enter the new password"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
              required
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 font-medium flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">error</span>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary/30 hover:shadow-2xl hover:shadow-primary/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="size-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Resetting...</span>
              </>
            ) : (
              <>
                <span>Reset password</span>
                <span className="material-symbols-outlined">arrow_forward</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-8 border-t border-slate-100 space-y-4">
          <Link
            href="/login"
            className="block text-sm font-bold text-primary hover:text-primary-dark transition-colors text-center"
          >
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}

