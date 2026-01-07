'use client';

import { useState } from 'react';
import { DataTable, Column } from '../ui/DataTable';
import { StatusBadge } from '../ui/StatusBadge';
import { Select } from '../ui/Select';
import { AlertTriangle, Clock, CheckCircle } from 'lucide-react';

interface Alert {
  id: string;
  type: 'low-stock' | 'near-expiry' | 'expired';
  productBatch: string;
  message: string;
  createdDate: string;
  status: 'new' | 'read';
}

export function AlertManagement() {
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [alerts, setAlerts] = useState<Alert[]>([
    { id: '1', type: 'low-stock', productBatch: 'Product C', message: 'Only 15 units remaining', createdDate: '2024-12-30 14:30', status: 'new' },
    { id: '2', type: 'near-expiry', productBatch: 'Batch #12340', message: 'Expires in 5 days', createdDate: '2024-12-30 13:00', status: 'new' },
    { id: '3', type: 'expired', productBatch: 'Batch #12335', message: 'Batch has expired', createdDate: '2024-12-30 12:00', status: 'new' },
    { id: '4', type: 'low-stock', productBatch: 'Product A', message: 'Stock below threshold', createdDate: '2024-12-30 10:00', status: 'read' },
    { id: '5', type: 'near-expiry', productBatch: 'Batch #12338', message: 'Expires in 10 days', createdDate: '2024-12-29 16:00', status: 'read' },
  ]);

  const typeOptions = [
    { value: 'all', label: 'All Types' },
    { value: 'low-stock', label: 'Low Stock' },
    { value: 'near-expiry', label: 'Near Expiry' },
    { value: 'expired', label: 'Expired' },
  ];

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'new', label: 'New' },
    { value: 'read', label: 'Read' },
  ];

  const filteredAlerts = alerts.filter(alert => {
    const matchesType = typeFilter === 'all' || alert.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || alert.status === statusFilter;
    return matchesType && matchesStatus;
  });

  const handleMarkAsRead = (id: string) => {
    setAlerts(alerts.map(alert => 
      alert.id === id ? { ...alert, status: 'read' } : alert
    ));
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'low-stock':
        return <AlertTriangle className="w-5 h-5 text-orange-600" />;
      case 'near-expiry':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'expired':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      default:
        return null;
    }
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'low-stock': 'Low Stock',
      'near-expiry': 'Near Expiry',
      'expired': 'Expired',
    };
    return labels[type] || type;
  };

  const columns: Column[] = [
    {
      header: 'Type',
      accessor: 'type',
      render: (value) => (
        <div className="flex items-center gap-2">
          {getAlertIcon(value)}
          <span>{getTypeLabel(value)}</span>
        </div>
      ),
    },
    { header: 'Product / Batch', accessor: 'productBatch' },
    { header: 'Message', accessor: 'message' },
    { header: 'Created Date', accessor: 'createdDate' },
    {
      header: 'Status',
      accessor: 'status',
      render: (value) => (
        <StatusBadge status={value}>
          {value === 'new' ? 'New' : 'Read'}
        </StatusBadge>
      ),
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (value, row) => (
        row.status === 'new' ? (
          <button
            onClick={() => handleMarkAsRead(value)}
            className="flex items-center gap-2 px-3 py-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
          >
            <CheckCircle className="w-4 h-4" />
            Mark as Read
          </button>
        ) : (
          <span className="text-gray-400">No action</span>
        )
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-gray-900 mb-1">Alert Management</h2>
        <p className="text-gray-600">Monitor and manage system alerts</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Filter by Type"
            options={typeOptions}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          />
          <Select
            label="Filter by Status"
            options={statusOptions}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <p className="text-gray-600 mb-1">Total Alerts</p>
          <p className="text-gray-900">{alerts.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <p className="text-gray-600 mb-1">New Alerts</p>
          <p className="text-blue-600">{alerts.filter(a => a.status === 'new').length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <p className="text-gray-600 mb-1">Low Stock</p>
          <p className="text-orange-600">{alerts.filter(a => a.type === 'low-stock').length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
          <p className="text-gray-600 mb-1">Expiry Issues</p>
          <p className="text-red-600">
            {alerts.filter(a => a.type === 'near-expiry' || a.type === 'expired').length}
          </p>
        </div>
      </div>

      {/* Alerts Table */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <DataTable columns={columns} data={filteredAlerts} />
      </div>
    </div>
  );
}