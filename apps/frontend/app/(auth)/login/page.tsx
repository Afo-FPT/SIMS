
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DEMO_ACCOUNTS } from '../../../lib/demo-accounts';
import { useToastHelpers } from '../../../lib/toast';
import { apiForgotPassword, apiLogin, persistAuth } from '../../../lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const toast = useToastHelpers();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields');
      toast.warning('Please fill in all fields');
      return;
    }

    setLoading(true);

    try {
      const loginResponse = await apiLogin(email, password);

      // Persist auth so the rest of the app can use existing localStorage keys
      persistAuth(loginResponse);

      const backendRole = loginResponse.user.role;
      const persona = backendRole.toUpperCase();

      toast.success(`Welcome back, ${loginResponse.user.name}!`);

      // Redirect based on role
      if (persona === 'CUSTOMER') {
        router.push('/customer/dashboard');
      } else if (persona === 'ADMIN') {
        router.push('/admin/dashboard');
      } else if (persona === 'MANAGER') {
        router.push('/manager/dashboard');
      } else if (persona === 'STAFF') {
        router.push('/staff/dashboard');
      } else {
        // Fallback: go to home
        router.push('/');
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Invalid email or password. Please check your credentials.';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotMessage(null);
    if (!forgotEmail) {
      toast.warning('Please enter your email address.');
      return;
    }
    try {
      setForgotLoading(true);
      const res = await apiForgotPassword(forgotEmail);
      setForgotMessage(res.message || 'If the email exists, a reset link will be sent.');
      toast.success(res.message || 'If the email exists, a reset link will be sent.');
      // In non-production, backend may return resetLink for testing
      if (res.resetLink) {
        toast.info('Development reset link returned. Open it to reset your password.');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to request password reset';
      toast.error(msg);
      setForgotMessage(msg);
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-display">
      <div className="w-full max-w-md bg-white rounded-5xl shadow-2xl border border-slate-100 p-12 animate-slide-up">
        <div className="text-center mb-10">
          <Link href="/" className="inline-flex bg-primary p-3 rounded-2xl text-white shadow-xl shadow-primary/20 mb-6 cursor-pointer">
            <span className="material-symbols-outlined text-3xl">warehouse</span>
          </Link>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">SIMS-AI Access</h1>
          <p className="text-slate-500 font-medium">Sign in to your workspace</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email Input */}
          <div>
            <label htmlFor="email" className="block text-sm font-bold text-slate-700 mb-2">
              Email Address
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">
                mail
              </span>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@company.com"
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                required
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label htmlFor="password" className="block text-sm font-bold text-slate-700 mb-2">
              Password
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">
                lock
              </span>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                required
              />
            </div>
            <div className="mt-2 flex items-center justify-end">
              <button
                type="button"
                onClick={() => {
                  setForgotOpen(true);
                  setForgotEmail(email || '');
                  setForgotMessage(null);
                }}
                className="text-xs font-black text-slate-500 hover:text-primary transition-colors"
              >
                Forgot password?
              </button>
            </div>
          </div>

          {/* Demo Accounts Quick Login */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-3">
              Demo Accounts (Click to fill)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => handleQuickLogin(account.email, account.password)}
                  className="p-3 bg-slate-50 border border-slate-200 hover:border-primary hover:bg-primary/5 rounded-xl transition-all text-left group"
                >
                  <p className="text-xs font-black text-slate-900 group-hover:text-primary">
                    {account.role}
                  </p>
                  <p className="text-[10px] text-slate-500 font-medium truncate">
                    {account.email}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 font-medium flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">error</span>
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary/30 hover:shadow-2xl hover:shadow-primary/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="size-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <span>Sign In</span>
                <span className="material-symbols-outlined">arrow_forward</span>
              </>
            )}
          </button>
        </form>

        {forgotOpen && (
          <div className="mt-8 pt-6 border-t border-slate-100">
            <h2 className="text-sm font-black text-slate-900 mb-2">Reset your password</h2>
            <p className="text-xs text-slate-500 mb-4">
              Enter your email address and we will send you a reset link.
            </p>
            <form onSubmit={handleForgotPassword} className="space-y-3">
              <input
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="your.email@company.com"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                required
              />
              {forgotMessage && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 font-medium">
                  {forgotMessage}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="flex-1 py-3 bg-slate-900 text-white font-black rounded-2xl hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {forgotLoading ? 'Sending...' : 'Send reset link'}
                </button>
                <button
                  type="button"
                  onClick={() => setForgotOpen(false)}
                  className="px-4 py-3 bg-slate-50 border border-slate-200 text-slate-700 font-black rounded-2xl hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                You will receive a link like <span className="font-mono">/reset-password?token=...</span>
              </p>
            </form>
          </div>
        )}

        <div className="mt-8 pt-8 border-t border-slate-100 space-y-4">
          <Link
            href="/signup"
            className="block text-sm font-bold text-primary hover:text-primary-dark transition-colors text-center"
          >
            Don't have an account? Sign up
          </Link>
          <Link
            href="/"
            className="block text-xs font-black text-slate-400 uppercase tracking-widest hover:text-primary transition-colors text-center"
          >
            Return to Website
          </Link>
        </div>
      </div>
    </div>
  );
}
