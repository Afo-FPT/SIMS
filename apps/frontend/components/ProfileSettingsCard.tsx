'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { getMyProfile, updateMyProfile, type MyProfile } from '../lib/users.api';
import { useToastHelpers } from '../lib/toast';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

function formatDate(s?: string | null) {
  if (!s) return '—';
  try {
    return new Date(s).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return s;
  }
}

function roleLabel(role: string) {
  if (role === 'admin') return 'Admin';
  if (role === 'manager') return 'Manager';
  if (role === 'staff') return 'Staff';
  return 'Customer';
}

async function readFileAsDataUrl(file: File): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export function ProfileSettingsCard() {
  const toast = useToastHelpers();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  const avatarPreview = useMemo(() => {
    const v = avatarUrl?.trim();
    return v ? v : null;
  }, [avatarUrl]);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const me = await getMyProfile();
      setProfile(me);
      setName(me.name || '');
      setPhone(me.phone || '');
      setCompanyName(me.companyName || '');
      setAvatarUrl(me.avatarUrl || '');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePickAvatarFile = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.warning('Please choose an image file');
      return;
    }
    if (file.size > 256 * 1024) {
      toast.warning('Image too large. Please use <= 256KB.');
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setAvatarUrl(dataUrl);
      toast.info('Avatar selected. Click Save changes to apply.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to read image');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.warning('Name is required');
      return;
    }
    try {
      setSaving(true);
      const updated = await updateMyProfile({
        name: name.trim(),
        phone: phone.trim(),
        companyName: companyName.trim(),
        avatarUrl: avatarUrl.trim(),
      });
      setProfile(updated);
      // Keep existing layout conventions (optional)
      if (typeof window !== 'undefined') {
        localStorage.setItem('sws_name', updated.name);
        if (updated.avatarUrl) {
          localStorage.setItem('sws_avatar', updated.avatarUrl);
        } else {
          localStorage.removeItem('sws_avatar');
        }
        window.dispatchEvent(new Event('sws:profile-updated'));
      }
      toast.success('Profile updated');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-40 bg-slate-200 rounded" />
          <div className="h-10 w-full bg-slate-100 rounded-2xl" />
          <div className="h-10 w-full bg-slate-100 rounded-2xl" />
          <div className="h-10 w-full bg-slate-100 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-lg font-black text-slate-900">Profile</h2>
            <p className="text-slate-500 text-sm mt-1">{error || 'Profile not available'}</p>
          </div>
          <Button variant="secondary" onClick={load}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSave}
      className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-6"
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-black text-slate-900">Personal information</h2>
          <p className="text-slate-500 text-sm mt-1">Manage your profile details and avatar.</p>
        </div>
        <Button type="submit" isLoading={saving}>
          Save changes
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <div className="border border-slate-200 rounded-3xl p-5 bg-slate-50/40">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 overflow-hidden flex items-center justify-center">
                {avatarPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="material-symbols-outlined text-slate-400">person</span>
                )}
              </div>
              <div className="min-w-0">
                <p className="font-black text-slate-900 truncate">{profile.name}</p>
                <p className="text-xs text-slate-500 truncate">{profile.email}</p>
                <p className="text-xs text-slate-500 mt-1">Role: {roleLabel(profile.role)}</p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <Input
                label="Avatar URL (optional)"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://..."
              />
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Upload avatar (image)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handlePickAvatarFile(e.target.files?.[0] ?? null)}
                  className="block w-full text-sm text-slate-600 file:mr-4 file:py-2.5 file:px-4 file:rounded-2xl file:border-0 file:text-sm file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                />
                <p className="text-xs text-slate-500 mt-2">Max 256KB. Stored in your profile.</p>
              </div>
              {avatarUrl && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setAvatarUrl('')}
                >
                  Remove avatar
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="md:col-span-2 space-y-4">
          <Input
            label="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            required
          />
          <Input label="Email" value={profile.email} readOnly disabled />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Phone (optional)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+84 ..."
            />
            <Input
              label="Company (optional)"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Company name"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold text-slate-500 uppercase">Last login</p>
              <p className="mt-1 font-bold text-slate-900">{formatDate(profile.lastLoginAt)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold text-slate-500 uppercase">Account status</p>
              <p className="mt-1 font-bold text-slate-900">{profile.isActive ? 'Active' : 'Inactive'}</p>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}

