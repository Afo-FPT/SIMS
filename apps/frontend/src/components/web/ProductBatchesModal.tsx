'use client';

import { useMemo, useState } from 'react';
import { Modal } from '../ui/Modal';
import { DataTable, Column } from '../ui/DataTable';
import { Select } from '../ui/Select';
import { StatusBadge } from '../ui/StatusBadge';
import { Search } from 'lucide-react';

export interface Batch {
  batchCode: string;
  productName: string;
  manufactureDate: string;
  expiryDate: string;
  currentQuantity: number;
  status: 'normal' | 'low-stock' | 'near-expiry' | 'expired';
}

type Props = {
  isOpen: boolean;
  onClose: () => void;
  productName?: string; // product đang chọn
  batches: Batch[];     // list batches (từ mock/API truyền vào)
  // nếu Modal của bạn có hỗ trợ className/size thì dùng, không thì bỏ cũng ok
  modalClassName?: string;
};

export function ProductBatchesModal({
  isOpen,
  onClose,
  productName,
  batches,
  modalClassName,
}: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'normal', label: 'Normal' },
    { value: 'low-stock', label: 'Low Stock' },
    { value: 'near-expiry', label: 'Near Expiry' },
    { value: 'expired', label: 'Expired' },
  ];

  const productBatches = useMemo(() => {
    if (!productName) return [];
    return batches.filter((b) => b.productName === productName);
  }, [batches, productName]);

  const filteredBatches = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return productBatches.filter((b) => {
      const matchesSearch =
        !q ||
        b.batchCode.toLowerCase().includes(q) ||
        b.productName.toLowerCase().includes(q);

      const matchesStatus = statusFilter === 'all' || b.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [productBatches, searchTerm, statusFilter]);

  const columns: Column[] = [
    { header: 'Batch Code', accessor: 'batchCode' },
    { header: 'Product Name', accessor: 'productName' },
    { header: 'Manufacture Date', accessor: 'manufactureDate' },
    { header: 'Expiry Date', accessor: 'expiryDate' },
    { header: 'Current Quantity', accessor: 'currentQuantity' },
    {
      header: 'Status',
      accessor: 'status',
      render: (value) => <StatusBadge status={value}>{value}</StatusBadge>,
    },
  ];

  const total = productBatches.length;
  const normal = productBatches.filter((b) => b.status === 'normal').length;
  const lowStock = productBatches.filter((b) => b.status === 'low-stock').length;
  const nearOrExpired = productBatches.filter(
    (b) => b.status === 'near-expiry' || b.status === 'expired'
  ).length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Batches of ${productName ?? ''}`}
      // Nếu Modal UI của bạn có prop className/contentClassName thì dùng đúng tên prop bạn có.
      // Ở đây mình để "className" theo hướng phổ biến:
      size="xl"
    >
      <div className="space-y-6">
        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by batch code or product name..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <Select
              options={statusOptions}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            />
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
            <p className="text-gray-600 mb-1">Total Batches</p>
            <p className="text-gray-900">{total}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
            <p className="text-gray-600 mb-1">Normal</p>
            <p className="text-green-600">{normal}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
            <p className="text-gray-600 mb-1">Low Stock</p>
            <p className="text-orange-600">{lowStock}</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
            <p className="text-gray-600 mb-1">Near Expiry / Expired</p>
            <p className="text-red-600">{nearOrExpired}</p>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          {productBatches.length === 0 ? (
            <p className="text-gray-600">No batches found for this product.</p>
          ) : (
            <DataTable columns={columns} data={filteredBatches} />
          )}
        </div>
      </div>
    </Modal>
  );
}
