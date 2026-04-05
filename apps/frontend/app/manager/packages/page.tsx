'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { useToastHelpers } from '../../../lib/toast';
import {
  ContractPackage,
  ContractPackageUnit,
  createContractPackage,
  listContractPackages,
  updateContractPackage,
} from '../../../lib/contract-packages.api';
import { listWarehouses, type ManagerWarehouse } from '../../../lib/manager.api';

type FormState = {
  name: string;
  warehouseId: string;
  duration: string;
  unit: ContractPackageUnit | '';
  pricePerM2: string;
  pricePerDay: string;
  description: string;
  isActive: boolean;
};

const EMPTY_FORM: FormState = {
  name: '',
  warehouseId: '',
  duration: '',
  unit: '',
  pricePerM2: '',
  pricePerDay: '',
  description: '',
  isActive: true,
};

export default function ManagerContractPackagesPage() {
  const toast = useToastHelpers();
  const [packages, setPackages] = useState<ContractPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [warehouses, setWarehouses] = useState<ManagerWarehouse[]>([]);

  const isEditing = useMemo(() => !!selectedId, [selectedId]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await listContractPackages();
        setPackages(data);
        const whs = await listWarehouses();
        setWarehouses(whs);
      } catch (err: any) {
        console.error(err);
        toast.error(err.message || 'Failed to load contract packages');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setSelectedId(null);
    setForm(EMPTY_FORM);
  };

  const handleEditClick = (pkg: ContractPackage) => {
    setSelectedId(pkg._id);
    setForm({
      name: pkg.name,
      warehouseId: pkg.warehouseId,
      duration: String(pkg.duration),
      unit: pkg.unit,
      pricePerM2: String(pkg.pricePerM2 ?? 0),
      pricePerDay: String(pkg.pricePerDay ?? 0),
      description: pkg.description || '',
      isActive: pkg.isActive !== false,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Package name is required');
      return;
    }
    const duration = Number(form.duration);
    if (!form.duration.trim() || !Number.isFinite(duration) || duration <= 0) {
      toast.error('Duration must be a positive number');
      return;
    }
    if (!form.warehouseId) {
      toast.error('Please select a warehouse');
      return;
    }
    if (!form.unit) {
      toast.error('Please select a unit');
      return;
    }
    const pricePerM2 = Number(form.pricePerM2);
    const pricePerDay = Number(form.pricePerDay);
    if (!form.pricePerM2.trim() || !Number.isFinite(pricePerM2) || pricePerM2 <= 0) {
      toast.error('Price /1m² must be > 0');
      return;
    }
    if (!form.pricePerDay.trim() || !Number.isFinite(pricePerDay) || pricePerDay <= 0) {
      toast.error('Price /day must be > 0');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        warehouseId: form.warehouseId,
        duration,
        unit: form.unit,
        pricePerM2,
        pricePerDay,
        description: form.description.trim(),
        isActive: form.isActive,
      };

      let saved: ContractPackage;
      if (isEditing && selectedId) {
        saved = await updateContractPackage(selectedId, payload);
        toast.success('Package updated successfully', 5000);
      } else {
        saved = await createContractPackage(payload);
        toast.success('Package created successfully', 5000);
      }

      setPackages((prev) => {
        const idx = prev.findIndex((p) => p._id === saved._id);
        if (idx === -1) {
          return [saved, ...prev];
        }
        const next = [...prev];
        next[idx] = saved;
        return next;
      });
      resetForm();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to save package');
    } finally {
      setSaving(false);
    }
  };

  const unitOptions = [
    { value: 'day', label: 'Ngày' },
    { value: 'month', label: 'Tháng' },
    { value: 'year', label: 'Năm' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Contract Packages</h1>
          <p className="text-sm text-slate-600 mt-1">
            Create and manage pricing packages for warehouse rental contracts.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)] gap-8 items-start">
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900">Package list</h2>
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-500 text-sm">Loading packages...</div>
          ) : packages.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              No packages yet. Create the first one in the form.
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="min-w-full divide-y divide-slate-100 text-sm">
                <thead className="bg-slate-50/60">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Package
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Duration
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Warehouse
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {packages.map((pkg) => (
                    <tr key={pkg._id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-semibold text-slate-900">{pkg.name}</div>
                        <div className="text-xs text-slate-500">
                          Updated:{' '}
                          {new Date(pkg.updatedAt).toLocaleDateString('vi-VN', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                        {pkg.duration}{' '}
                        {pkg.unit === 'day' ? 'ngày' : pkg.unit === 'month' ? 'tháng' : 'năm'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-semibold text-slate-700">
                        {warehouses.find((w) => w.id === pkg.warehouseId)?.name || '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 rounded-lg text-xs font-bold ${pkg.isActive !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'}`}>
                          {pkg.isActive !== false ? 'ACTIVE' : 'DISABLED'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleEditClick(pkg)}
                          >
                            Edit
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900">
              {isEditing ? 'Update package' : 'Create package'}
            </h2>
            {isEditing && (
              <button
                type="button"
                onClick={resetForm}
                className="text-xs font-semibold text-primary hover:underline"
              >
                + New package
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Package name"
              placeholder="e.g. 6-month rental package"
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              required
            />

            <Select
              label="Warehouse"
              value={form.warehouseId}
              onChange={(e) => handleChange('warehouseId', e.target.value)}
              options={[
                { value: '', label: 'Select warehouse' },
                ...warehouses.map((w) => ({ value: w.id, label: w.name })),
              ]}
              required
            />

            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4">
              <Input
                label="Duration"
                type="number"
                min={1}
                placeholder="e.g. 6"
                value={form.duration}
                onChange={(e) => handleChange('duration', e.target.value)}
                required
              />
              <Select
                label="Unit"
                value={form.unit}
                onChange={(e) => handleChange('unit', e.target.value)}
                options={[{ value: '', label: 'Select unit' }, ...unitOptions]}
                required
              />
            </div>

            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4">
              <Input
                label="Price /1m² (VND)"
                type="number"
                min={0}
                step={1000}
                value={form.pricePerM2}
                onChange={(e) => handleChange('pricePerM2', e.target.value)}
                required
              />
              <Input
                label="Price /day (VND)"
                type="number"
                min={0}
                step={1000}
                value={form.pricePerDay}
                onChange={(e) => handleChange('pricePerDay', e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Description</label>
              <textarea
                rows={4}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors text-sm"
                placeholder="Notes about this package..."
                value={form.description}
                onChange={(e) => handleChange('description', e.target.value)}
              />
            </div>

            <div className="pt-2 flex items-center justify-between gap-3">
              <p className="text-xs text-slate-500">
                Pricing is fixed for all zones in the selected warehouse. Formula: (Zone area × price /1m²) + (Rental days × price /day).
              </p>
              <div className="flex items-center gap-2">
                {isEditing && selectedId && (
                  <Button
                    type="button"
                    size="md"
                    variant={form.isActive ? 'danger' : 'primary'}
                    onClick={async () => {
                      try {
                        const updated = await updateContractPackage(selectedId, { isActive: !form.isActive });
                        const refreshed = await listContractPackages();
                        setPackages(refreshed);
                        setForm((prev) => ({ ...prev, isActive: updated.isActive !== false }));
                        toast.success(updated.isActive !== false ? 'Package enabled' : 'Package disabled');
                      } catch (err: any) {
                        toast.error(err.message || 'Failed to update package status');
                      }
                    }}
                  >
                    {form.isActive ? 'Disable package' : 'Enable package'}
                  </Button>
                )}
                <Button type="submit" size="md" isLoading={saving}>
                  {isEditing ? 'Save update' : 'Create package'}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

