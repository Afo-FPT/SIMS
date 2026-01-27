
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { verifyDemoAccount, DEMO_ACCOUNTS } from '../../../lib/demo-accounts';
import { useToastHelpers } from '../../../lib/toast';

export default function LoginPage() {
  const router = useRouter();
  const toast = useToastHelpers();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields');
      toast.warning('Please fill in all fields');
      return;
    }

    setLoading(true);

    // Verify credentials against demo accounts
    setTimeout(() => {
      const account = verifyDemoAccount(email, password);

      if (account) {
        // Store authentication
        localStorage.setItem('sws_persona', account.role);
        localStorage.setItem('sws_email', account.email);
        localStorage.setItem('sws_name', account.name);
        localStorage.setItem('sws_title', account.title);
        if (account.avatar) {
          localStorage.setItem('sws_avatar', account.avatar);
        }
        localStorage.setItem('sws_verified', 'true');

        toast.success(`Welcome back, ${account.name}!`);

        // Redirect based on role
        if (account.role === 'CUSTOMER') {
          router.push('/');
        } else if (account.role === 'ADMIN') {
          router.push('/admin/dashboard');
        } else if (account.role === 'MANAGER') {
          router.push('/manager/dashboard');
        } else if (account.role === 'STAFF') {
          router.push('/staff/dashboard');
        }
      } else {
        const errorMsg = 'Invalid email or password. Please check your credentials.';
        setError(errorMsg);
        toast.error(errorMsg);
        setLoading(false);
      }
    }, 1000);
  };

  const handleQuickLogin = (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-display">
      <div className="w-full max-w-md bg-white rounded-5xl shadow-2xl border border-slate-100 p-12 animate-slide-up">
        <div className="text-center mb-10">
          <Link href="/" className="inline-flex bg-primary p-3 rounded-2xl text-white shadow-xl shadow-primary/20 mb-6 cursor-pointer">
            <span className="material-symbols-outlined text-3xl">warehouse</span>
          </Link>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">SWSMS-AI Access</h1>
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
