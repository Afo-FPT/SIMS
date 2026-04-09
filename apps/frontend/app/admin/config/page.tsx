'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
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
    </div>
  );
}

