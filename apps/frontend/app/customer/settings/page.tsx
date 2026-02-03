'use client';

import React, { useState, useEffect } from 'react';
import { useToastHelpers } from '../../../lib/toast';
import { ChangePasswordForm } from '../../../components/ChangePasswordForm';

type VerifyStatus = 'unverified' | 'pending' | 'verified';

export default function CustomerSettingsPage() {
  const toast = useToastHelpers();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [docUploaded, setDocUploaded] = useState(false);
  const [status, setStatus] = useState<VerifyStatus>('unverified');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const n = localStorage.getItem('sws_name') || '';
    setName(n);
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== 'undefined') {
      localStorage.setItem('sws_name', name);
    }
    setSaved(true);
    toast.success('Settings saved successfully');
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Settings</h1>
        <p className="text-slate-500 mt-1">Account verification & profile</p>
      </div>

      <form
        onSubmit={handleSave}
        className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-6 max-w-2xl"
      >
        <h2 className="text-lg font-black text-slate-900">Basic account</h2>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Full name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Phone</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+84 ..."
            className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">
            Company name (optional)
          </label>
          <input
            type="text"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Company"
            className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">
            ID / Business document upload (mock)
          </label>
          <div
            className={`flex items-center gap-3 p-4 rounded-2xl border-2 border-dashed transition-colors ${docUploaded ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-slate-50'
              }`}
          >
            <span className="material-symbols-outlined text-slate-400">description</span>
            <span className="text-sm text-slate-600">
              {docUploaded ? 'Document uploaded (mock)' : 'Upload ID or business document'}
            </span>
            <button
              type="button"
              onClick={() => setDocUploaded(!docUploaded)}
              className="ml-auto text-sm font-bold text-primary hover:underline"
            >
              {docUploaded ? 'Remove' : 'Upload mock'}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4 pt-2">
          <span className="text-sm font-bold text-slate-500">Verification status:</span>
          <span
            className={`inline-flex px-3 py-1 rounded-xl text-sm font-bold ${status === 'verified'
                ? 'bg-emerald-100 text-emerald-700'
                : status === 'pending'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-slate-100 text-slate-600'
              }`}
          >
            {status}
          </span>
          <button
            type="button"
            onClick={() =>
              setStatus(
                status === 'unverified' ? 'pending' : status === 'pending' ? 'verified' : 'unverified'
              )
            }
            className="text-xs font-bold text-slate-500 hover:text-primary"
          >
            (toggle mock)
          </button>
        </div>

        <button
          type="submit"
          className="px-6 py-3 bg-primary text-white font-black rounded-2xl hover:bg-primary-dark"
        >
          {saved ? 'Saved' : 'Save'}
        </button>
      </form>

      <div>
        <h2 className="text-lg font-black text-slate-900 mb-4">Change password</h2>
        <ChangePasswordForm />
      </div>
    </div>
  );
}
