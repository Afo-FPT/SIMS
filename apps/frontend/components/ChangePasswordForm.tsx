'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiChangePassword, clearAuth } from '../lib/auth';
import { useToastHelpers } from '../lib/toast';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

export function ChangePasswordForm() {
  const router = useRouter();
  const toast = useToastHelpers();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.warning('Please fill in all fields');
      return;
    }
    if (newPassword.length < 6) {
      toast.warning('New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.warning('New password and confirm password do not match');
      return;
    }
    try {
      setLoading(true);
      await apiChangePassword(currentPassword, newPassword);
      toast.success('Password changed. Please sign in again.');
      clearAuth();
      router.push('/login');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Change password failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-6 max-w-md"
    >
      <h2 className="text-lg font-black text-slate-900">Change password</h2>
      <Input
        label="Current password"
        type="password"
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)}
        placeholder="Enter current password"
        required
      />
      <Input
        label="New password"
        type="password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        placeholder="At least 6 characters"
        required
        minLength={6}
      />
      <Input
        label="Confirm new password"
        type="password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        placeholder="Re-enter new password"
        required
      />
      <Button type="submit" disabled={loading}>
        {loading ? 'Updating...' : 'Change password'}
      </Button>
    </form>
  );
}
