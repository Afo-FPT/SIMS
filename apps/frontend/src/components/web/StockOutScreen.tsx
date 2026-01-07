'use client';

import { useState } from 'react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { DataTable, Column } from '../ui/DataTable';
import { Modal } from '../ui/Modal';
import { QrCode, Plus, Check, X, AlertTriangle } from 'lucide-react';

interface StockOutItem {
  id: string;
  batchCode: string;
  productName: string;
  availableQuantity: number;
  quantityToIssue: number;
  hasWarning: boolean;
}

export function StockOutScreen() {
  const [stockOutDate, setStockOutDate] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState('');
  const [items, setItems] = useState<StockOutItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Mock available batches
  const availableBatches = [
    { batchCode: 'BATCH-001', productName: 'Product A', availableQuantity: 100 },
    { batchCode: 'BATCH-002', productName: 'Product B', availableQuantity: 50 },
    { batchCode: 'BATCH-003', productName: 'Product C', availableQuantity: 25 },
    { batchCode: 'BATCH-004', productName: 'Product D', availableQuantity: 5 },
  ];

  const [selectedBatch, setSelectedBatch] = useState('');
  const [quantityToIssue, setQuantityToIssue] = useState('');

  const handleAddItem = () => {
    const batch = availableBatches.find(b => b.batchCode === selectedBatch);
    if (!batch || !quantityToIssue) {
      alert('Please select a batch and enter quantity');
      return;
    }

    const quantity = Number(quantityToIssue);
    const hasWarning = quantity > batch.availableQuantity;

    const item: StockOutItem = {
      id: Date.now().toString(),
      batchCode: batch.batchCode,
      productName: batch.productName,
      availableQuantity: batch.availableQuantity,
      quantityToIssue: quantity,
      hasWarning,
    };

    setItems([...items, item]);
    setSelectedBatch('');
    setQuantityToIssue('');
    setIsModalOpen(false);
  };

  const handleConfirm = () => {
    if (items.length === 0) {
      alert('Please add at least one item');
      return;
    }

    const hasWarnings = items.some(item => item.hasWarning);
    if (hasWarnings) {
      if (!confirm('Some items have insufficient stock. Do you want to proceed?')) {
        return;
      }
    }

    alert('Stock Out confirmed successfully!');
    setReason('');
    setItems([]);
  };

  const columns: Column[] = [
    { header: 'Batch Code', accessor: 'batchCode' },
    { header: 'Product Name', accessor: 'productName' },
    { header: 'Available Qty', accessor: 'availableQuantity' },
    { 
      header: 'Quantity to Issue', 
      accessor: 'quantityToIssue',
      render: (value, row) => (
        <div className="flex items-center gap-2">
          <span className={row.hasWarning ? 'text-red-600' : 'text-gray-900'}>
            {value}
          </span>
          {row.hasWarning && (
            <AlertTriangle className="w-4 h-4 text-red-600" />
          )}
        </div>
      )
    },
    {
      header: 'Status',
      accessor: 'hasWarning',
      render: (value) => (
        <span className={`px-2.5 py-0.5 rounded-full ${
          value 
            ? 'bg-red-100 text-red-700' 
            : 'bg-green-100 text-green-700'
        }`}>
          {value ? 'Insufficient Stock' : 'OK'}
        </span>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-gray-900 mb-1">Stock Out Management</h2>
          <p className="text-gray-600">Issue inventory from warehouse</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary">
            <QrCode className="w-5 h-5" />
            Scan QR
          </Button>
        </div>
      </div>

      {/* Header Form */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <h3 className="text-gray-900 mb-4">Stock Out Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Stock Out Date"
            type="date"
            value={stockOutDate}
            onChange={(e) => setStockOutDate(e.target.value)}
          />
          <Input
            label="Reason / Note"
            placeholder="Enter reason for stock out"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-gray-900">Stock Out Items</h3>
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="w-5 h-5" />
            Add Item
          </Button>
        </div>
        <DataTable columns={columns} data={items} />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end">
        <Button variant="secondary">
          <X className="w-5 h-5" />
          Cancel
        </Button>
        <Button onClick={handleConfirm}>
          <Check className="w-5 h-5" />
          Confirm Stock Out
        </Button>
      </div>

      {/* Add Item Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Stock Out Item"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-gray-700 mb-1">Select Batch</label>
            <select
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
            >
              <option value="">Select a batch...</option>
              {availableBatches.map((batch) => (
                <option key={batch.batchCode} value={batch.batchCode}>
                  {batch.batchCode} - {batch.productName} (Available: {batch.availableQuantity})
                </option>
              ))}
            </select>
          </div>
          <Input
            label="Quantity to Issue"
            type="number"
            placeholder="Enter quantity"
            value={quantityToIssue}
            onChange={(e) => setQuantityToIssue(e.target.value)}
          />
          <div className="flex gap-3 justify-end pt-4">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddItem}>
              Add Item
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}