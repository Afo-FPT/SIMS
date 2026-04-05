'use client';

import React from 'react';
import { ChangePasswordForm } from '../../../components/ChangePasswordForm';
import { ProfileSettingsCard } from '../../../components/ProfileSettingsCard';

export default function CustomerSettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Settings</h1>
        <p className="text-slate-500 mt-1">Profile & account settings</p>
      </div>

      <ProfileSettingsCard />

      <div>
        <ChangePasswordForm />
      </div>
    </div>
  );
}
