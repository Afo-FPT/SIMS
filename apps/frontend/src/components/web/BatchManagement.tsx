'use client';

import { useState } from 'react';
import { DataTable, Column } from '../ui/DataTable';
import { StatusBadge } from '../ui/StatusBadge';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Search } from 'lucide-react';

interface Batch {
  batchCode: string;
  productName: string;
  manufactureDate: string;
  expiryDate: string;
  currentQuantity: number;
  status: 'normal' | 'low-stock' | 'near-expiry' | 'expired';
}

export function BatchManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const batches: Batch[] = [
    { batchCode: 'BATCH-001', productName: 'Product A', manufactureDate: '2024-01-15', expiryDate: '2025-01-15', currentQuantity: 450, status: 'normal' },
    { batchCode: 'BATCH-002', productName: 'Product B', manufactureDate: '2024-02-10', expiryDate: '2025-02-10', currentQuantity: 25, status: 'low-stock' },
    { batchCode: 'BATCH-003', productName: 'Product C', manufactureDate: '2024-03-05', expiryDate: '2025-01-05', currentQuantity: 120, status: 'near-expiry' },
    { batchCode: 'BATCH-004', productName: 'Product D', manufactureDate: '2023-06-20', expiryDate: '2024-12-20', currentQuantity: 80, status: 'expired' },
    { batchCode: 'BATCH-005', productName: 'Product E', manufactureDate: '2024-04-12', expiryDate: '2025-04-12', currentQuantity: 300, status: 'normal' },
    { batchCode: 'BATCH-006', productName: 'Product A', manufactureDate: '2024-05-08', expiryDate: '2025-05-08', currentQuantity: 15, status: 'low-stock' },
  ];

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'normal', label: 'Normal' },
    { value: 'low-stock', label: 'Low Stock' },
    { value: 'near-expiry', label: 'Near Expiry' },
    { value: 'expired', label: 'Expired' },
  ];

  const filteredBatches = batches.filter(batch => {
    const matchesSearch = batch.batchCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         batch.productName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || batch.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'normal': 'Normal',
      'low-stock': 'Low Stock',
      'near-expiry': 'Near Expiry',
      'expired': 'Expired',
    };
    return labels[status] || status;
  };

  const columns: Column[] = [
    { header: 'Batch Code', accessor: 'batchCode' },
    { header: 'Product Name', accessor: 'productName' },
    { header: 'Manufacture Date', accessor: 'manufactureDate' },
    { header: 'Expiry Date', accessor: 'expiryDate' },
    { header: 'Current Quantity', accessor: 'currentQuantity' },
    {
      header: 'Status',
      accessor: 'status',
      render: (value) => (
        <StatusBadge status={value}>
          {getStatusLabel(value)}
        </StatusBadge>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-gray-900 mb-1">Batch Management</h2>
        <p className="text-gray-600">Monitor and manage inventory batches</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
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
          <p className="text-gray-900">{batches.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <p className="text-gray-600 mb-1">Normal</p>
          <p className="text-green-600">{batches.filter(b => b.status === 'normal').length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <p className="text-gray-600 mb-1">Low Stock</p>
          <p className="text-orange-600">{batches.filter(b => b.status === 'low-stock').length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <p className="text-gray-600 mb-1">Near Expiry / Expired</p>
          <p className="text-red-600">
            {batches.filter(b => b.status === 'near-expiry' || b.status === 'expired').length}
          </p>
        </div>
      </div>

      {/* Batches Table */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <DataTable columns={columns} data={filteredBatches} />
      </div>
    </div>
  );
}