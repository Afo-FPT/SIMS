'use client';

import { useState } from 'react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { DataTable, Column } from '../ui/DataTable';
import { Modal } from '../ui/Modal';
import { QrCode, Plus, Save, X, Trash2 } from 'lucide-react';

interface StockInItem {
  id: string;
  product: string;
  batchCode: string;
  manufactureDate: string;
  expiryDate: string;
  quantity: number;
  purchasePrice: number;
}

export function StockInScreen() {
  const [stockInDate, setStockInDate] = useState(new Date().toISOString().split('T')[0]);
  const [supplier, setSupplier] = useState('');
  const [note, setNote] = useState('');
  const [items, setItems] = useState<StockInItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form state for new item
  const [newItem, setNewItem] = useState({
    product: '',
    manufactureDate: '',
    expiryDate: '',
    quantity: '',
    purchasePrice: '',
  });

  const handleAddItem = () => {
    if (!newItem.product || !newItem.quantity || !newItem.purchasePrice) {
      alert('Please fill in all required fields');
      return;
    }

    const item: StockInItem = {
      id: Date.now().toString(),
      product: newItem.product,
      batchCode: `BATCH-${Date.now()}`,
      manufactureDate: newItem.manufactureDate,
      expiryDate: newItem.expiryDate,
      quantity: Number(newItem.quantity),
      purchasePrice: Number(newItem.purchasePrice),
    };

    setItems([...items, item]);
    setNewItem({
      product: '',
      manufactureDate: '',
      expiryDate: '',
      quantity: '',
      purchasePrice: '',
    });
    setIsModalOpen(false);
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const handleSave = () => {
    if (!supplier || items.length === 0) {
      alert('Please add supplier and at least one item');
      return;
    }
    alert('Stock In saved successfully!');
    // Reset form
    setSupplier('');
    setNote('');
    setItems([]);
  };

  const columns: Column[] = [
    { header: 'Product', accessor: 'product' },
    { header: 'Batch Code', accessor: 'batchCode' },
    { header: 'Mfg Date', accessor: 'manufactureDate' },
    { header: 'Exp Date', accessor: 'expiryDate' },
    { header: 'Quantity', accessor: 'quantity' },
    { 
      header: 'Purchase Price', 
      accessor: 'purchasePrice',
      render: (value) => `$${value.toFixed(2)}`
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (value) => (
        <button
          onClick={() => handleRemoveItem(value)}
          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-gray-900 mb-1">Stock In Management</h2>
          <p className="text-gray-600">Record incoming inventory</p>
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
        <h3 className="text-gray-900 mb-4">Stock In Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Stock In Date"
            type="date"
            value={stockInDate}
            onChange={(e) => setStockInDate(e.target.value)}
          />
          <Input
            label="Supplier Name"
            placeholder="Enter supplier name"
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
          />
          <Input
            label="Note"
            placeholder="Optional note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-gray-900">Stock In Items</h3>
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
        <Button onClick={handleSave}>
          <Save className="w-5 h-5" />
          Save Stock In
        </Button>
      </div>

      {/* Add Item Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Stock In Item"
      >
        <div className="space-y-4">
          <Input
            label="Product Name"
            placeholder="Enter product name"
            value={newItem.product}
            onChange={(e) => setNewItem({ ...newItem, product: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Manufacture Date"
              type="date"
              value={newItem.manufactureDate}
              onChange={(e) => setNewItem({ ...newItem, manufactureDate: e.target.value })}
            />
            <Input
              label="Expiry Date"
              type="date"
              value={newItem.expiryDate}
              onChange={(e) => setNewItem({ ...newItem, expiryDate: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Quantity"
              type="number"
              placeholder="Enter quantity"
              value={newItem.quantity}
              onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
            />
            <Input
              label="Purchase Price"
              type="number"
              step="0.01"
              placeholder="Enter price"
              value={newItem.purchasePrice}
              onChange={(e) => setNewItem({ ...newItem, purchasePrice: e.target.value })}
            />
          </div>
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