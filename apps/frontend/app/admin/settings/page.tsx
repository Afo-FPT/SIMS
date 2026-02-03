'use client';

import React from 'react';
import { ChangePasswordForm } from '../../../components/ChangePasswordForm';

export default function AdminSettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Settings</h1>
        <p className="text-slate-500 mt-1">Account and security</p>
      </div>
      <ChangePasswordForm />
    </div>
  );
}
