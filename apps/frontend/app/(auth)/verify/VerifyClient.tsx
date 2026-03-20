'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useToastHelpers } from '../../../lib/toast';

export default function VerifyClient() {
  const router = useRouter();
  const toast = useToastHelpers();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [mockOtp, setMockOtp] = useState('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setMockOtp(generatedOtp);
    console.log('Mock OTP (for testing):', generatedOtp);
  }, []);

  useEffect(() => {
    if (!email) {
      router.push('/signup');
    }
  }, [email, router]);

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return;
    const newOtp = [...otp];
    newOtp[index] = value.replace(/\D/g, '');
    setOtp(newOtp);
    setError('');
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newOtp = [...otp];
    for (let i = 0; i < 6; i++) {
      newOtp[i] = pastedData[i] || '';
    }
    setOtp(newOtp);
    const nextEmptyIndex = newOtp.findIndex((digit) => !digit);
    if (nextEmptyIndex !== -1) {
      inputRefs.current[nextEmptyIndex]?.focus();
    } else {
      inputRefs.current[5]?.focus();
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpString = otp.join('');
    if (otpString.length !== 6) {
      const errorMsg = 'Please enter the complete 6-digit code';
      setError(errorMsg);
      toast.warning(errorMsg);
      return;
    }
    setLoading(true);
    setError('');

    setTimeout(() => {
      if (otpString === mockOtp || otpString === '123456') {
        const signupName = sessionStorage.getItem('signup_name');
        const signupEmail = sessionStorage.getItem('signup_email');

        localStorage.setItem('sws_persona', 'CUSTOMER');
        localStorage.setItem('sws_email', signupEmail || email);
        localStorage.setItem('sws_name', signupName || '');
        localStorage.setItem('sws_title', 'Account Owner');
        localStorage.setItem('sws_verified', 'true');

        sessionStorage.removeItem('signup_email');
        sessionStorage.removeItem('signup_name');
        sessionStorage.removeItem('signup_password');

        toast.success('Email verified successfully! Welcome to SIMS-AI.');
        router.push('/');
      } else {
        const errorMsg = 'Invalid verification code. Please try again.';
        setError(errorMsg);
        toast.error(errorMsg);
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
        setLoading(false);
      }
    }, 1000);
  };

  const handleResend = () => {
    if (resendCooldown > 0) return;
    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setMockOtp(newOtp);
    console.log('New Mock OTP (for testing):', newOtp);
    setResendCooldown(60);
    setError('');
    setOtp(['', '', '', '', '', '']);
    inputRefs.current[0]?.focus();
    toast.info('Verification code resent. Please check your email.');
  };

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  if (!email) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-display">
      <div className="w-full max-w-md bg-white rounded-5xl shadow-2xl border border-slate-100 p-12 animate-slide-up">
        <div className="text-center mb-10">
          <div className="inline-flex bg-primary p-3 rounded-2xl text-white shadow-xl shadow-primary/20 mb-6">
            <span className="material-symbols-outlined text-3xl">verified</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Verify Your Email</h1>
          <p className="text-slate-500 font-medium">We've sent a 6-digit code to</p>
          <p className="text-sm font-bold text-slate-900 mt-1">{email}</p>
        </div>

        <form onSubmit={handleVerify} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-3 text-center">
              Enter Verification Code
            </label>
            <div className="flex justify-center gap-3">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    inputRefs.current[index] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={handlePaste}
                  className="w-14 h-14 text-center text-2xl font-black bg-slate-50 border-2 border-slate-200 rounded-2xl focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                  autoFocus={index === 0}
                />
              ))}
            </div>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-xs font-bold text-amber-800 text-center">
              🧪 Test Mode: OTP is <span className="font-black text-lg">{mockOtp}</span>
            </p>
            <p className="text-[10px] text-amber-600 text-center mt-1">
              Or use: <span className="font-black">123456</span>
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 font-medium flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">error</span>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || otp.join('').length !== 6}
            className="w-full py-4 bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary/30 hover:shadow-2xl hover:shadow-primary/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="size-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Verifying...</span>
              </>
            ) : (
              <>
                <span>Verify & Continue</span>
                <span className="material-symbols-outlined">check_circle</span>
              </>
            )}
          </button>

          <div className="text-center">
            <p className="text-sm text-slate-500 mb-2">Didn't receive the code?</p>
            <button
              type="button"
              onClick={handleResend}
              disabled={resendCooldown > 0}
              className="text-sm font-bold text-primary hover:text-primary-dark transition-colors disabled:text-slate-400 disabled:cursor-not-allowed"
            >
              {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend verification code'}
            </button>
          </div>
        </form>

        <div className="mt-8 pt-8 border-t border-slate-100">
          <Link
            href="/signup"
            className="block text-xs font-black text-slate-400 uppercase tracking-widest hover:text-primary transition-colors text-center"
          >
            ← Back to Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
}

