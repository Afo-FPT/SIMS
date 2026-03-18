'use client';

import React from 'react';
import { ChangePasswordForm } from '../../../components/ChangePasswordForm';
import { ProfileSettingsCard } from '../../../components/ProfileSettingsCard';

export default function AdminSettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Profile</h1>
        <p className="text-slate-500 mt-1">Manage your personal information and security settings.</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2">
          <ProfileSettingsCard />
        </div>
        <div className="lg:col-span-1">
          <ChangePasswordForm />
        </div>
      </div>
    </div>
  );
}
