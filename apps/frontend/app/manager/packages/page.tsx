'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Badge } from '../../../components/ui/Badge';
import { PageHeader } from '../../../components/ui/PageHeader';
import { LoadingSkeleton } from '../../../components/ui/LoadingSkeleton';
import { EmptyState } from '../../../components/ui/EmptyState';
import {
  Table,
  TableHead,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from '../../../components/ui/Table';
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
        const [data, whs] = await Promise.all([listContractPackages(), listWarehouses()]);
        setPackages(data);
        setWarehouses(whs);
      } catch (err: any) {
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
    if (!form.name.trim()) { toast.error('Package name is required'); return; }
    const duration = Number(form.duration);
    if (!form.duration.trim() || !Number.isFinite(duration) || duration <= 0) {
      toast.error('Duration must be a positive number'); return;
    }
    if (!form.warehouseId) { toast.error('Please select a warehouse'); return; }
    if (!form.unit) { toast.error('Please select a unit'); return; }
    const pricePerM2 = Number(form.pricePerM2);
    const pricePerDay = Number(form.pricePerDay);
    if (!form.pricePerM2.trim() || !Number.isFinite(pricePerM2) || pricePerM2 <= 0) {
      toast.error('Price /1m² must be > 0'); return;
    }
    if (!form.pricePerDay.trim() || !Number.isFinite(pricePerDay) || pricePerDay <= 0) {
      toast.error('Price /day must be > 0'); return;
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
        if (idx === -1) return [saved, ...prev];
        const next = [...prev];
        next[idx] = saved;
        return next;
      });
      resetForm();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save package');
    } finally {
      setSaving(false);
    }
  };

  const unitOptions = [
    { value: 'day', label: 'Day' },
    { value: 'month', label: 'Month' },
    { value: 'year', label: 'Year' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contract Packages"
        description="Create and manage pricing packages for warehouse rental contracts."
      />

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-6 items-start">
        {/* Package list */}
        <section className="bg-white rounded-2xl shadow-card border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900">Package list</h2>
            <span className="text-xs text-slate-500">{packages.length} package{packages.length !== 1 ? 's' : ''}</span>
          </div>

          {loading ? (
            <div className="p-6">
              <LoadingSkeleton className="h-40" />
            </div>
          ) : packages.length === 0 ? (
            <EmptyState
              icon="inventory_2"
              title="No packages yet"
              message="Create the first package using the form."
            />
          ) : (
            <Table>
              <TableHead>
                <TableHeader>Package</TableHeader>
                <TableHeader>Duration</TableHeader>
                <TableHeader>Warehouse</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader className="text-right">Action</TableHeader>
              </TableHead>
              <TableBody>
                {packages.map((pkg) => (
                  <TableRow
                    key={pkg._id}
                    onClick={() => handleEditClick(pkg)}
                    className={selectedId === pkg._id ? 'bg-primary-light/40' : ''}
                  >
                    <TableCell>
                      <div className="font-semibold text-slate-900">{pkg.name}</div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        Updated{' '}
                        {new Date(pkg.updatedAt).toLocaleDateString('vi-VN', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-700">
                      {pkg.duration} {pkg.unit === 'day' ? 'day' : pkg.unit === 'month' ? 'month' : 'year'}
                    </TableCell>
                    <TableCell className="font-medium text-slate-700">
                      {warehouses.find((w) => w.id === pkg.warehouseId)?.name || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={pkg.isActive !== false ? 'success' : 'default'}>
                        {pkg.isActive !== false ? 'Active' : 'Disabled'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => { e.stopPropagation(); handleEditClick(pkg); }}
                      >
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </section>

        {/* Create / Edit form */}
        <section className="bg-white rounded-2xl shadow-card border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900">
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

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
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

            <div className="grid grid-cols-2 gap-4">
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

            <div className="grid grid-cols-2 gap-4">
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

            <Input
              label="Description"
              as="textarea"
              placeholder="Notes about this package..."
              value={form.description}
              onChange={(e) => handleChange('description', e.target.value)}
            />

            <p className="text-xs text-slate-500 leading-relaxed">
              Pricing formula: (Zone area × price /1m²) + (Rental days × price /day). Fixed for all zones in the selected warehouse.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
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
                  {form.isActive ? 'Disable' : 'Enable'}
                </Button>
              )}
              <Button type="submit" size="md" isLoading={saving}>
                {isEditing ? 'Save update' : 'Create package'}
              </Button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
