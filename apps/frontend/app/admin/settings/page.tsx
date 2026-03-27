'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { ChangePasswordForm } from '../../../components/ChangePasswordForm';
import { ProfileSettingsCard } from '../../../components/ProfileSettingsCard';
import { getChatFaqsByRole, updateChatFaqsByRole, type ChatFaqItem, type ChatFaqRole } from '../../../lib/chat-faq.api';
import { getSpaceLimits, updateSpaceLimits } from '../../../lib/system-settings.api';
import { getAiSettings, updateAiSettings } from '../../../lib/ai-settings.api';
import { useToastHelpers } from '../../../lib/toast';

export default function AdminSettingsPage() {
  const toast = useToastHelpers();
  const [faqRole, setFaqRole] = useState<ChatFaqRole>('customer');
  const [faqItems, setFaqItems] = useState<ChatFaqItem[]>([]);
  const [faqLoading, setFaqLoading] = useState(false);
  const [faqSaving, setFaqSaving] = useState(false);
  const [faqError, setFaqError] = useState<string | null>(null);
  const [faqSuccess, setFaqSuccess] = useState<string | null>(null);
  const [spaceZonePercent, setSpaceZonePercent] = useState('80');
  const [spaceShelfPercent, setSpaceShelfPercent] = useState('80');
  const [spaceLoading, setSpaceLoading] = useState(false);
  const [spaceSaving, setSpaceSaving] = useState(false);
  const [spaceMessage, setSpaceMessage] = useState<string | null>(null);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [aiChatModel, setAiChatModel] = useState('gemini-2.5-flash');
  const [aiInsightModel, setAiInsightModel] = useState('gemini-2.5-flash');
  const [aiTemperature, setAiTemperature] = useState('0.3');
  const [aiMaxOutputTokens, setAiMaxOutputTokens] = useState('1024');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSaving, setAiSaving] = useState(false);

  const roleTabs: Array<{ role: ChatFaqRole; label: string }> = useMemo(
    () => [
      { role: 'customer', label: 'Customer FAQs' },
      { role: 'manager', label: 'Manager FAQs' },
      { role: 'staff', label: 'Staff FAQs' },
      { role: 'admin', label: 'Admin FAQs' },
    ],
    []
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setFaqLoading(true);
        setFaqError(null);
        setFaqSuccess(null);
        const res = await getChatFaqsByRole(faqRole);
        if (cancelled) return;
        setFaqItems(res.items ?? []);
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : 'Failed to load FAQs';
        setFaqError(msg);
      } finally {
        if (cancelled) return;
        setFaqLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [faqRole]);

  useEffect(() => {
    let cancelled = false;
    async function loadSpace() {
      try {
        setSpaceLoading(true);
        const data = await getSpaceLimits();
        if (cancelled) return;
        setSpaceZonePercent(String(data.zone_area_percent_of_warehouse));
        setSpaceShelfPercent(String(data.shelf_area_percent_of_zone));
      } catch (e) {
        if (cancelled) return;
        setSpaceMessage(e instanceof Error ? e.message : 'Failed to load space limits');
      } finally {
        if (!cancelled) setSpaceLoading(false);
      }
    }
    loadSpace();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadAiSettings() {
      try {
        setAiLoading(true);
        const data = await getAiSettings();
        if (cancelled) return;
        setAiEnabled(Boolean(data.enabled));
        setAiChatModel(data.chatModel || 'gemini-2.5-flash');
        setAiInsightModel(data.insightModel || 'gemini-2.5-flash');
        setAiTemperature(String(data.temperature ?? 0.3));
        setAiMaxOutputTokens(String(data.maxOutputTokens ?? 1024));
      } catch (e) {
        if (cancelled) return;
        toast.error(e instanceof Error ? e.message : 'Failed to load AI settings');
      } finally {
        if (!cancelled) setAiLoading(false);
      }
    }
    loadAiSettings();
    return () => {
      cancelled = true;
    };
  }, [toast]);

  function updateItem(idx: number, patch: Partial<ChatFaqItem>) {
    setFaqItems((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  }

  function removeItem(idx: number) {
    setFaqItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function addItem() {
    setFaqItems((prev) => [...prev, { label: '', prompt: '' }]);
  }

  async function saveFaqs() {
    try {
      setFaqSaving(true);
      setFaqError(null);
      setFaqSuccess(null);
      // Basic client-side validation
      const sanitized = faqItems
        .map((it) => ({ label: it.label.trim(), prompt: it.prompt.trim() }))
        .filter((it) => it.label.length > 0 || it.prompt.length > 0);
      if (sanitized.length === 0) throw new Error('At least 1 FAQ item is required');
      await updateChatFaqsByRole(faqRole, sanitized);
      setFaqSuccess('FAQs saved successfully.');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to save FAQs';
      setFaqError(msg);
    } finally {
      setFaqSaving(false);
    }
  }

  async function saveSpaceLimits() {
    try {
      setSpaceSaving(true);
      setSpaceMessage(null);
      const zone = Number(spaceZonePercent);
      const shelf = Number(spaceShelfPercent);
      if (!Number.isFinite(zone) || zone <= 0 || zone > 100 || !Number.isFinite(shelf) || shelf <= 0 || shelf > 100) {
        throw new Error('Percent values must be > 0 and <= 100');
      }
      const data = await updateSpaceLimits({
        zone_area_percent_of_warehouse: zone,
        shelf_area_percent_of_zone: shelf,
      });
      setSpaceZonePercent(String(data.zone_area_percent_of_warehouse));
      setSpaceShelfPercent(String(data.shelf_area_percent_of_zone));
      setSpaceMessage('Space limits saved successfully.');
    } catch (e) {
      setSpaceMessage(e instanceof Error ? e.message : 'Failed to save space limits');
    } finally {
      setSpaceSaving(false);
    }
  }

  async function saveAiSettings() {
    try {
      setAiSaving(true);
      const temperature = Number(aiTemperature);
      const maxOutputTokens = Number(aiMaxOutputTokens);
      if (!Number.isFinite(temperature) || temperature < 0 || temperature > 1) {
        throw new Error('Temperature must be a number between 0 and 1');
      }
      if (!Number.isFinite(maxOutputTokens) || maxOutputTokens < 128 || maxOutputTokens > 8192) {
        throw new Error('Max output tokens must be between 128 and 8192');
      }
      const payload = {
        enabled: aiEnabled,
        chatModel: aiChatModel.trim(),
        insightModel: aiInsightModel.trim(),
        temperature,
        maxOutputTokens: Math.floor(maxOutputTokens),
      };
      if (!payload.chatModel) throw new Error('Chat model is required');
      if (!payload.insightModel) throw new Error('Insight model is required');

      const data = await updateAiSettings(payload);
      setAiEnabled(Boolean(data.enabled));
      setAiChatModel(data.chatModel || 'gemini-2.5-flash');
      setAiInsightModel(data.insightModel || 'gemini-2.5-flash');
      setAiTemperature(String(data.temperature ?? 0.3));
      setAiMaxOutputTokens(String(data.maxOutputTokens ?? 1024));
      toast.success('AI settings saved successfully.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save AI settings');
    } finally {
      setAiSaving(false);
    }
  }

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

      <section className="space-y-4">
        <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-4">
          <div>
            <h2 className="text-xl font-black text-slate-900">AI Settings</h2>
            <p className="text-sm text-slate-500 mt-1">
              Configure global AI runtime for chat and insights.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="w-full">
              <label className="block text-sm font-bold text-slate-700 mb-2">AI Enabled</label>
              <select
                value={aiEnabled ? 'true' : 'false'}
                onChange={(e) => setAiEnabled(e.target.value === 'true')}
                disabled={aiLoading || aiSaving}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors bg-white"
              >
                <option value="true">Enabled</option>
                <option value="false">Disabled</option>
              </select>
            </div>
            <Input
              label="Chat model"
              value={aiChatModel}
              onChange={(e) => setAiChatModel(e.target.value)}
              disabled={aiLoading || aiSaving}
              placeholder="gemini-2.5-flash"
            />
            <Input
              label="Insight model"
              value={aiInsightModel}
              onChange={(e) => setAiInsightModel(e.target.value)}
              disabled={aiLoading || aiSaving}
              placeholder="gemini-2.5-flash"
            />
            <Input
              label="Temperature (0..1)"
              type="number"
              min={0}
              max={1}
              step="0.1"
              value={aiTemperature}
              onChange={(e) => setAiTemperature(e.target.value)}
              disabled={aiLoading || aiSaving}
            />
            <Input
              label="Max output tokens (128..8192)"
              type="number"
              min={128}
              max={8192}
              step="1"
              value={aiMaxOutputTokens}
              onChange={(e) => setAiMaxOutputTokens(e.target.value)}
              disabled={aiLoading || aiSaving}
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={saveAiSettings} disabled={aiLoading || aiSaving}>
              {aiSaving ? 'Saving...' : 'Save AI settings'}
            </Button>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-4">
          <div>
            <h2 className="text-xl font-black text-slate-900">Space Limit Rules</h2>
            <p className="text-sm text-slate-500 mt-1">
              Configure maximum usable area for zones and shelves.
            </p>
          </div>
          {spaceMessage && (
            <p className="text-sm text-slate-700 bg-slate-50 border border-slate-200 p-3 rounded-xl">{spaceMessage}</p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Max total zone area (% of warehouse area)"
              type="number"
              min={1}
              max={100}
              step="0.01"
              value={spaceZonePercent}
              onChange={(e) => setSpaceZonePercent(e.target.value)}
              disabled={spaceLoading || spaceSaving}
            />
            <Input
              label="Max total shelf area (% of zone area)"
              type="number"
              min={1}
              max={100}
              step="0.01"
              value={spaceShelfPercent}
              onChange={(e) => setSpaceShelfPercent(e.target.value)}
              disabled={spaceLoading || spaceSaving}
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={saveSpaceLimits} disabled={spaceLoading || spaceSaving}>
              {spaceSaving ? 'Saving...' : 'Save space limits'}
            </Button>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-black text-slate-900">Chatbot FAQs</h2>
          <p className="text-sm text-slate-500 mt-1">
            Customize Frequently Asked Questions shown in the chatbot for each role.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {roleTabs.map((t) => (
            <Button
              key={t.role}
              variant={faqRole === t.role ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setFaqRole(t.role)}
              disabled={faqLoading || faqSaving}
            >
              {t.label}
            </Button>
          ))}
        </div>

        {faqLoading && <p className="text-sm text-slate-600">Loading FAQs...</p>}
        {faqError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded-xl">{faqError}</p>}
        {faqSuccess && <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 p-3 rounded-xl">{faqSuccess}</p>}

        <div className="bg-white border border-slate-200 rounded-3xl p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <p className="text-sm font-bold text-slate-700">FAQ items</p>
            <Button variant="ghost" size="sm" onClick={addItem} disabled={faqLoading || faqSaving}>
              Add
            </Button>
          </div>

          <div className="space-y-4">
            {faqItems.map((it, idx) => (
              <div key={idx} className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
                <div className="lg:col-span-3">
                  <Input
                    label={`Label #${idx + 1}`}
                    value={it.label}
                    onChange={(e) => updateItem(idx, { label: e.target.value })}
                    disabled={faqLoading || faqSaving}
                    placeholder="e.g. Tôi có mấy hợp đồng?"
                  />
                </div>
                <div className="lg:col-span-8">
                  <Input
                    label={`Prompt #${idx + 1}`}
                    value={it.prompt}
                    onChange={(e) => updateItem(idx, { prompt: e.target.value })}
                    disabled={faqLoading || faqSaving}
                    placeholder="e.g. Liệt kê hợp đồng của tôi..."
                  />
                </div>
                <div className="lg:col-span-1 flex justify-end">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => removeItem(idx)}
                    disabled={faqLoading || faqSaving || faqItems.length <= 1}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 flex justify-end">
            <Button onClick={saveFaqs} disabled={faqLoading || faqSaving}>
              {faqSaving ? 'Saving...' : 'Save FAQs'}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
