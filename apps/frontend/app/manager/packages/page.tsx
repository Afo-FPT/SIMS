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

type FormState = {
  name: string;
  duration: string;
  unit: ContractPackageUnit;
  price: string;
  description: string;
};

const EMPTY_FORM: FormState = {
  name: '',
  duration: '',
  unit: 'month',
  price: '',
  description: '',
};

export default function ManagerContractPackagesPage() {
  const toast = useToastHelpers();
  const [packages, setPackages] = useState<ContractPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const isEditing = useMemo(() => !!selectedId, [selectedId]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await listContractPackages();
        setPackages(data);
      } catch (err: any) {
        console.error(err);
        toast.error(err.message || 'Không tải được danh sách gói hợp đồng');
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
      duration: String(pkg.duration),
      unit: pkg.unit,
      price: String(pkg.price),
      description: pkg.description || '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Tên gói không được để trống');
      return;
    }
    const duration = Number(form.duration);
    const price = Number(form.price);
    if (!duration || duration <= 0) {
      toast.error('Thời hạn phải là số dương');
      return;
    }
    if (price < 0 || Number.isNaN(price)) {
      toast.error('Giá phải là số không âm');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        duration,
        unit: form.unit,
        price,
        description: form.description.trim(),
      };

      let saved: ContractPackage;
      if (isEditing && selectedId) {
        saved = await updateContractPackage(selectedId, payload);
        toast.success('Cập nhật gói hợp đồng thành công', 5000);
      } else {
        saved = await createContractPackage(payload);
        toast.success('Tạo gói hợp đồng mới thành công', 5000);
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
      toast.error(err.message || 'Lưu gói hợp đồng thất bại');
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
          <h1 className="text-2xl font-bold text-slate-900">Quản lý gói hợp đồng</h1>
          <p className="text-sm text-slate-600 mt-1">
            Tạo và cập nhật các gói dịch vụ dùng cho hợp đồng thuê kho.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)] gap-8 items-start">
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900">Danh sách gói</h2>
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-500 text-sm">Đang tải danh sách gói...</div>
          ) : packages.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              Chưa có gói hợp đồng nào. Hãy tạo gói đầu tiên ở bên phải.
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="min-w-full divide-y divide-slate-100 text-sm">
                <thead className="bg-slate-50/60">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Tên gói
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Thời hạn
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Giá
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Mô tả
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {packages.map((pkg) => (
                    <tr key={pkg._id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-semibold text-slate-900">{pkg.name}</div>
                        <div className="text-xs text-slate-500">
                          Cập nhật:{' '}
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
                      <td className="px-4 py-3 whitespace-nowrap font-semibold text-emerald-600">
                        {pkg.price.toLocaleString('vi-VN')} đ
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <p className="text-xs text-slate-600 line-clamp-2">
                          {pkg.description || '—'}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleEditClick(pkg)}
                        >
                          Sửa
                        </Button>
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
              {isEditing ? 'Cập nhật gói' : 'Tạo gói mới'}
            </h2>
            {isEditing && (
              <button
                type="button"
                onClick={resetForm}
                className="text-xs font-semibold text-primary hover:underline"
              >
                + Tạo gói mới
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Tên gói"
              placeholder="VD: Gói thuê 6 tháng"
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
            />

            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4">
              <Input
                label="Thời hạn"
                type="number"
                min={1}
                placeholder="VD: 6"
                value={form.duration}
                onChange={(e) => handleChange('duration', e.target.value)}
              />
              <Select
                label="Đơn vị"
                value={form.unit}
                onChange={(e) => handleChange('unit', e.target.value)}
                options={unitOptions}
              />
            </div>

            <Input
              label="Giá (VNĐ)"
              type="number"
              min={0}
              step={1000}
              placeholder="VD: 5000000"
              value={form.price}
              onChange={(e) => handleChange('price', e.target.value)}
            />

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Mô tả</label>
              <textarea
                rows={4}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-colors text-sm"
                placeholder="Ghi chú chi tiết về gói: phạm vi dịch vụ, điều kiện áp dụng..."
                value={form.description}
                onChange={(e) => handleChange('description', e.target.value)}
              />
            </div>

            <div className="pt-2 flex items-center justify-between gap-3">
              <p className="text-xs text-slate-500">
                Các gói này sẽ được sử dụng khi tạo hợp đồng, giúp chuẩn hóa thời hạn và đơn giá.
              </p>
              <Button type="submit" size="md" isLoading={saving}>
                {isEditing ? 'Lưu cập nhật' : 'Tạo gói'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

