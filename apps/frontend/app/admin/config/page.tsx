'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { getChatFaqsByRole, updateChatFaqsByRole, type ChatFaqItem, type ChatFaqRole } from '../../../lib/chat-faq.api';
import { getAiSettings, updateAiSettings } from '../../../lib/ai-settings.api';
import {
  getRequestCreditPricing,
  getRentalDraftTerms,
  getSpaceLimits,
  getWarehouseCreationTerms,
  updateRentalDraftTerms,
  updateRequestCreditPricing,
  updateSpaceLimits,
  updateWarehouseCreationTerms,
} from '../../../lib/system-settings.api';
import { useToastHelpers } from '../../../lib/toast';

export default function AdminConfigPage() {
  const toast = useToastHelpers();
  const [activeTab, setActiveTab] = useState<'policy' | 'ai'>('policy');

  const [spaceZonePercent, setSpaceZonePercent] = useState('80');
  const [spaceShelfPercent, setSpaceShelfPercent] = useState('80');
  const [spaceLoading, setSpaceLoading] = useState(false);
  const [spaceSaving, setSpaceSaving] = useState(false);

  const [baseCreditPrice, setBaseCreditPrice] = useState('100000');
  const [expiredPenaltyPerDay, setExpiredPenaltyPerDay] = useState('0');
  const [weeklyFreeLimit, setWeeklyFreeLimit] = useState('3');
  const [creditLoading, setCreditLoading] = useState(false);
  const [creditSaving, setCreditSaving] = useState(false);
  const [warehouseTerms, setWarehouseTerms] = useState('');
  const [warehouseTermsLoading, setWarehouseTermsLoading] = useState(false);
  const [warehouseTermsSaving, setWarehouseTermsSaving] = useState(false);
  const [rentalDraftTermsContent, setRentalDraftTermsContent] = useState('');
  const [rentalDraftTermsAgreementLabel, setRentalDraftTermsAgreementLabel] = useState('');
  const [rentalDraftTermsLoading, setRentalDraftTermsLoading] = useState(false);
  const [rentalDraftTermsSaving, setRentalDraftTermsSaving] = useState(false);
  const [faqRole, setFaqRole] = useState<ChatFaqRole>('customer');
  const [faqItems, setFaqItems] = useState<ChatFaqItem[]>([]);
  const [faqLoading, setFaqLoading] = useState(false);
  const [faqSaving, setFaqSaving] = useState(false);
  const [faqError, setFaqError] = useState<string | null>(null);
  const [faqSuccess, setFaqSuccess] = useState<string | null>(null);
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

    const load = async () => {
      try {
        setSpaceLoading(true);
        setCreditLoading(true);
        setWarehouseTermsLoading(true);
        setRentalDraftTermsLoading(true);
        const [space, credit, terms, rentalTerms] = await Promise.all([
          getSpaceLimits(),
          getRequestCreditPricing(),
          getWarehouseCreationTerms(),
          getRentalDraftTerms(),
        ]);
        if (cancelled) return;
        setSpaceZonePercent(String(space.zone_area_percent_of_warehouse));
        setSpaceShelfPercent(String(space.shelf_area_percent_of_zone));
        setBaseCreditPrice(String(credit.base_request_credit_price_vnd));
        setExpiredPenaltyPerDay(String(credit.expired_contract_penalty_per_day_vnd));
        setWeeklyFreeLimit(String(credit.weekly_free_request_limit));
        setWarehouseTerms(String(terms.warehouse_creation_terms || ''));
        setRentalDraftTermsContent(String(rentalTerms.rental_draft_terms_content || ''));
        setRentalDraftTermsAgreementLabel(String(rentalTerms.rental_draft_terms_agreement_label || ''));
      } catch (e) {
        if (cancelled) return;
        toast.error(e instanceof Error ? e.message : 'Failed to load config');
      } finally {
        if (!cancelled) {
          setSpaceLoading(false);
          setCreditLoading(false);
          setWarehouseTermsLoading(false);
          setRentalDraftTermsLoading(false);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [toast]);

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

  useEffect(() => {
    let cancelled = false;
    async function loadFaqs() {
      try {
        setFaqLoading(true);
        setFaqError(null);
        setFaqSuccess(null);
        const res = await getChatFaqsByRole(faqRole);
        if (cancelled) return;
        setFaqItems(res.items ?? []);
      } catch (e) {
        if (cancelled) return;
        setFaqError(e instanceof Error ? e.message : 'Failed to load FAQs');
      } finally {
        if (!cancelled) setFaqLoading(false);
      }
    }
    loadFaqs();
    return () => {
      cancelled = true;
    };
  }, [faqRole]);

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
      const sanitized = faqItems
        .map((it) => ({ label: it.label.trim(), prompt: it.prompt.trim() }))
        .filter((it) => it.label.length > 0 || it.prompt.length > 0);
      if (sanitized.length === 0) throw new Error('At least 1 FAQ item is required');
      await updateChatFaqsByRole(faqRole, sanitized);
      setFaqSuccess('FAQs saved successfully.');
    } catch (e) {
      setFaqError(e instanceof Error ? e.message : 'Failed to save FAQs');
    } finally {
      setFaqSaving(false);
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

  const saveSpaceLimits = async () => {
    try {
      setSpaceSaving(true);
      const zone = Number(spaceZonePercent);
      const shelf = Number(spaceShelfPercent);
      if (!Number.isFinite(zone) || zone <= 0 || zone > 100 || !Number.isFinite(shelf) || shelf <= 0 || shelf > 100) {
        toast.warning('Percent values must be > 0 and <= 100');
        return;
      }
      const data = await updateSpaceLimits({
        zone_area_percent_of_warehouse: zone,
        shelf_area_percent_of_zone: shelf,
      });
      setSpaceZonePercent(String(data.zone_area_percent_of_warehouse));
      setSpaceShelfPercent(String(data.shelf_area_percent_of_zone));
      toast.success('Space limit rules updated');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save space limit rules');
    } finally {
      setSpaceSaving(false);
    }
  };

  const saveRentalDraftTerms = async () => {
    try {
      setRentalDraftTermsSaving(true);
      const content = rentalDraftTermsContent.trim();
      const agreementLabel = rentalDraftTermsAgreementLabel.trim();
      if (!content) {
        toast.warning('Rental draft terms content cannot be empty');
        return;
      }
      if (!agreementLabel) {
        toast.warning('Agreement label cannot be empty');
        return;
      }
      if (content.length > 10000) {
        toast.warning('Rental draft terms content must be <= 10000 characters');
        return;
      }
      if (agreementLabel.length > 500) {
        toast.warning('Agreement label must be <= 500 characters');
        return;
      }
      const data = await updateRentalDraftTerms({
        rental_draft_terms_content: content,
        rental_draft_terms_agreement_label: agreementLabel,
      });
      setRentalDraftTermsContent(String(data.rental_draft_terms_content || ''));
      setRentalDraftTermsAgreementLabel(String(data.rental_draft_terms_agreement_label || ''));
      toast.success('Rental draft terms updated');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save rental draft terms');
    } finally {
      setRentalDraftTermsSaving(false);
    }
  };

  const saveWarehouseCreationTerms = async () => {
    try {
      setWarehouseTermsSaving(true);
      const terms = warehouseTerms.trim();
      if (!terms) {
        toast.warning('Warehouse creation terms cannot be empty');
        return;
      }
      if (terms.length > 5000) {
        toast.warning('Warehouse creation terms must be <= 5000 characters');
        return;
      }
      const data = await updateWarehouseCreationTerms({
        warehouse_creation_terms: terms,
      });
      setWarehouseTerms(String(data.warehouse_creation_terms || ''));
      toast.success('Warehouse creation terms updated');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save warehouse creation terms');
    } finally {
      setWarehouseTermsSaving(false);
    }
  };

  const saveRequestCreditPricing = async () => {
    try {
      setCreditSaving(true);
      const base = Number(baseCreditPrice);
      const penalty = Number(expiredPenaltyPerDay);
      const weeklyLimit = Number(weeklyFreeLimit);
      if (!Number.isFinite(base) || base < 0 || !Number.isFinite(penalty) || penalty < 0) {
        toast.warning('Base price and daily penalty must be numbers >= 0');
        return;
      }
      if (!Number.isFinite(weeklyLimit) || weeklyLimit < 0) {
        toast.warning('Weekly free request limit must be a number >= 0');
        return;
      }
      const data = await updateRequestCreditPricing({
        base_request_credit_price_vnd: base,
        expired_contract_penalty_per_day_vnd: penalty,
        weekly_free_request_limit: weeklyLimit,
      });
      setBaseCreditPrice(String(data.base_request_credit_price_vnd));
      setExpiredPenaltyPerDay(String(data.expired_contract_penalty_per_day_vnd));
      setWeeklyFreeLimit(String(data.weekly_free_request_limit));
      toast.success('Request-credit policy updated');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save request-credit policy');
    } finally {
      setCreditSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Config</h1>
        <p className="text-slate-500 mt-1">System-wide operational policies managed by admin.</p>
      </div>

      <div className="flex gap-2">
        <Button variant={activeTab === 'policy' ? 'primary' : 'secondary'} size="sm" onClick={() => setActiveTab('policy')}>
          Policy Config
        </Button>
        <Button variant={activeTab === 'ai' ? 'primary' : 'secondary'} size="sm" onClick={() => setActiveTab('ai')}>
          AI & FAQs
        </Button>
      </div>

      {activeTab === 'policy' && (
      <>
      <section className="bg-white border border-slate-200 rounded-3xl p-5 space-y-4">
        <div>
          <h2 className="text-xl font-black text-slate-900">Rental draft terms</h2>
          <p className="text-sm text-slate-500 mt-1">
            Admin can edit terms users must accept before creating a draft contract.
          </p>
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Terms content</label>
          <textarea
            value={rentalDraftTermsContent}
            onChange={(e) => setRentalDraftTermsContent(e.target.value)}
            rows={10}
            maxLength={10000}
            disabled={rentalDraftTermsLoading || rentalDraftTermsSaving}
            className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors bg-white resize-y"
            placeholder="Enter rental draft terms..."
          />
          <p className="text-xs text-slate-500 mt-1">{rentalDraftTermsContent.length}/10000 characters</p>
        </div>
        <Input
          label="Agreement label"
          value={rentalDraftTermsAgreementLabel}
          onChange={(e) => setRentalDraftTermsAgreementLabel(e.target.value)}
          disabled={rentalDraftTermsLoading || rentalDraftTermsSaving}
          placeholder="I have read and agree to the rental terms and system rules."
        />
        <div className="flex justify-end">
          <Button onClick={saveRentalDraftTerms} disabled={rentalDraftTermsLoading || rentalDraftTermsSaving}>
            {rentalDraftTermsSaving ? 'Saving...' : 'Save rental draft terms'}
          </Button>
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-3xl p-5 space-y-4">
        <div>
          <h2 className="text-xl font-black text-slate-900">Warehouse creation terms</h2>
          <p className="text-sm text-slate-500 mt-1">
            Admin can edit the terms users must accept before creating a warehouse.
          </p>
        </div>
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Terms content</label>
          <textarea
            value={warehouseTerms}
            onChange={(e) => setWarehouseTerms(e.target.value)}
            rows={6}
            maxLength={5000}
            disabled={warehouseTermsLoading || warehouseTermsSaving}
            className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors bg-white resize-y"
            placeholder="Enter terms for warehouse creation..."
          />
          <p className="text-xs text-slate-500 mt-1">{warehouseTerms.length}/5000 characters</p>
        </div>
        <div className="flex justify-end">
          <Button onClick={saveWarehouseCreationTerms} disabled={warehouseTermsLoading || warehouseTermsSaving}>
            {warehouseTermsSaving ? 'Saving...' : 'Save warehouse creation terms'}
          </Button>
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-3xl p-5 space-y-4">
        <div>
          <h2 className="text-xl font-black text-slate-900">Request-credit policy</h2>
          <p className="text-sm text-slate-500 mt-1">
            Configure base credit price, expired-contract daily penalty, and free service-request quota per week.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Base price for 1 extra request (VND)"
            type="number"
            min={0}
            step="1000"
            value={baseCreditPrice}
            onChange={(e) => setBaseCreditPrice(e.target.value)}
            disabled={creditLoading || creditSaving}
          />
          <Input
            label="Expired contract penalty per day (VND)"
            type="number"
            min={0}
            step="1000"
            value={expiredPenaltyPerDay}
            onChange={(e) => setExpiredPenaltyPerDay(e.target.value)}
            disabled={creditLoading || creditSaving}
          />
          <Input
            label="Free service requests per week"
            type="number"
            min={0}
            step="1"
            value={weeklyFreeLimit}
            onChange={(e) => setWeeklyFreeLimit(e.target.value)}
            disabled={creditLoading || creditSaving}
          />
        </div>
        <div className="flex justify-end">
          <Button onClick={saveRequestCreditPricing} disabled={creditLoading || creditSaving}>
            {creditSaving ? 'Saving...' : 'Save request-credit policy'}
          </Button>
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-3xl p-5 space-y-4">
        <div>
          <h2 className="text-xl font-black text-slate-900">Space Limit Rules</h2>
          <p className="text-sm text-slate-500 mt-1">
            Configure maximum usable area for zones and shelves.
          </p>
        </div>
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
            {spaceSaving ? 'Saving...' : 'Save space limit rules'}
          </Button>
        </div>
      </section>
      </>
      )}

      {activeTab === 'ai' && (
      <>
      <section className="bg-white border border-slate-200 rounded-3xl p-5 space-y-4">
        <div>
          <h2 className="text-xl font-black text-slate-900">AI Settings</h2>
          <p className="text-sm text-slate-500 mt-1">Configure global AI runtime for chat and insights.</p>
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
          <Input label="Chat model" value={aiChatModel} onChange={(e) => setAiChatModel(e.target.value)} disabled={aiLoading || aiSaving} />
          <Input label="Insight model" value={aiInsightModel} onChange={(e) => setAiInsightModel(e.target.value)} disabled={aiLoading || aiSaving} />
          <Input label="Temperature (0..1)" type="number" min={0} max={1} step="0.1" value={aiTemperature} onChange={(e) => setAiTemperature(e.target.value)} disabled={aiLoading || aiSaving} />
          <Input label="Max output tokens (128..8192)" type="number" min={128} max={8192} step="1" value={aiMaxOutputTokens} onChange={(e) => setAiMaxOutputTokens(e.target.value)} disabled={aiLoading || aiSaving} />
        </div>
        <div className="flex justify-end">
          <Button onClick={saveAiSettings} disabled={aiLoading || aiSaving}>
            {aiSaving ? 'Saving...' : 'Save AI settings'}
          </Button>
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-3xl p-5 space-y-4">
        <div>
          <h2 className="text-xl font-black text-slate-900">Chatbot FAQs</h2>
          <p className="text-sm text-slate-500 mt-1">Customize FAQs shown in chatbot for each role.</p>
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

        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
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
                  <Input label={`Label #${idx + 1}`} value={it.label} onChange={(e) => updateItem(idx, { label: e.target.value })} disabled={faqLoading || faqSaving} />
                </div>
                <div className="lg:col-span-8">
                  <Input label={`Prompt #${idx + 1}`} value={it.prompt} onChange={(e) => updateItem(idx, { prompt: e.target.value })} disabled={faqLoading || faqSaving} />
                </div>
                <div className="lg:col-span-1 flex justify-end">
                  <Button variant="danger" size="sm" onClick={() => removeItem(idx)} disabled={faqLoading || faqSaving || faqItems.length <= 1}>
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
      </>
      )}
    </div>
  );
}

