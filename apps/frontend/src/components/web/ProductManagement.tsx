'use client';

import { useState } from 'react';
import { DataTable, Column } from '../ui/DataTable';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { StatusBadge } from '../ui/StatusBadge';
import { Plus, Edit, Trash2, Eye } from 'lucide-react';
import { ProductBatchesModal, Batch } from './ProductBatchesModal';

interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  unit: string;
  price: number;
  status: 'active' | 'inactive';
}

export function ProductManagement() {
  const [products, setProducts] = useState<Product[]>([
    { id: '1', name: 'Product A', description: 'High quality product', category: 'Electronics', unit: 'pcs', price: 99.99, status: 'active' },
    { id: '2', name: 'Product B', description: 'Premium product', category: 'Food', unit: 'kg', price: 49.99, status: 'active' },
    { id: '3', name: 'Product C', description: 'Standard product', category: 'Clothing', unit: 'pcs', price: 29.99, status: 'active' },
    { id: '4', name: 'Product D', description: 'Economy product', category: 'Electronics', unit: 'pcs', price: 19.99, status: 'inactive' },
  ]);

  // Mock batches (sau này thay bằng API)
  const batches: Batch[] = [
    { batchCode: 'BATCH-001', productName: 'Product A', manufactureDate: '2024-01-15', expiryDate: '2025-01-15', currentQuantity: 450, status: 'normal' },
    { batchCode: 'BATCH-002', productName: 'Product B', manufactureDate: '2024-02-10', expiryDate: '2025-02-10', currentQuantity: 25, status: 'low-stock' },
    { batchCode: 'BATCH-003', productName: 'Product A', manufactureDate: '2024-05-08', expiryDate: '2025-05-08', currentQuantity: 15, status: 'low-stock' },
    { batchCode: 'BATCH-003', productName: 'Product A', manufactureDate: '2024-05-08', expiryDate: '2025-05-08', currentQuantity: 15, status: 'low-stock' },
    { batchCode: 'BATCH-003', productName: 'Product A', manufactureDate: '2024-05-08', expiryDate: '2025-05-08', currentQuantity: 15, status: 'low-stock' },
    { batchCode: 'BATCH-003', productName: 'Product A', manufactureDate: '2024-05-08', expiryDate: '2025-05-08', currentQuantity: 15, status: 'low-stock' },
    { batchCode: 'BATCH-003', productName: 'Product A', manufactureDate: '2024-05-08', expiryDate: '2025-05-08', currentQuantity: 15, status: 'low-stock' },
    { batchCode: 'BATCH-003', productName: 'Product A', manufactureDate: '2024-05-08', expiryDate: '2025-05-08', currentQuantity: 15, status: 'low-stock' },
  ];

  // Modal batches (component riêng)
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [selectedProductName, setSelectedProductName] = useState<string | undefined>(undefined);

  // Modal add/edit product
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    unit: '',
    price: '',
  });

  const categories = [
    { value: '', label: 'Select category...' },
    { value: 'Electronics', label: 'Electronics' },
    { value: 'Food', label: 'Food' },
    { value: 'Clothing', label: 'Clothing' },
    { value: 'Medicine', label: 'Medicine' },
  ];

  const units = [
    { value: '', label: 'Select unit...' },
    { value: 'pcs', label: 'Pieces' },
    { value: 'kg', label: 'Kilogram' },
    { value: 'liter', label: 'Liter' },
    { value: 'box', label: 'Box' },
  ];

  const handleAdd = () => {
    setEditingProduct(null);
    setFormData({ name: '', description: '', category: '', unit: '', price: '' });
    setIsModalOpen(true);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      category: product.category,
      unit: product.unit,
      price: product.price.toString(),
    });
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!formData.name || !formData.category || !formData.unit || !formData.price) {
      alert('Please fill in all required fields');
      return;
    }

    if (editingProduct) {
      setProducts(products.map((p) =>
        p.id === editingProduct.id
          ? { ...p, ...formData, price: Number(formData.price) }
          : p
      ));
    } else {
      const newProduct: Product = {
        id: Date.now().toString(),
        name: formData.name,
        description: formData.description,
        category: formData.category,
        unit: formData.unit,
        price: Number(formData.price),
        status: 'active',
      };
      setProducts([...products, newProduct]);
    }
    setIsModalOpen(false);
  };

  const handleToggleStatus = (id: string) => {
    setProducts(products.map((p) =>
      p.id === id
        ? { ...p, status: p.status === 'active' ? 'inactive' : 'active' }
        : p
    ));
  };

  const columns: Column[] = [
    { header: 'Product Name', accessor: 'name' },
    { header: 'Description', accessor: 'description' },
    { header: 'Category', accessor: 'category' },
    { header: 'Unit', accessor: 'unit' },
    {
      header: 'Price',
      accessor: 'price',
      render: (value) => `$${value.toFixed(2)}`
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (value) => (
        <StatusBadge status={value === 'active' ? 'normal' : 'expired'}>
          {value === 'active' ? 'Active' : 'Inactive'}
        </StatusBadge>
      ),
    },
    {
      header: 'Actions',
      accessor: 'id',
      render: (value, row) => (
        <div className="flex gap-2">
          <button
            onClick={() => handleEdit(row)}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
            title="Edit"
          >
            <Edit className="w-4 h-4" />
          </button>

          <button
            onClick={() => handleToggleStatus(value)}
            className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg"
            title="Toggle status"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {/* See batches */}
          <button
            onClick={() => {
              setSelectedProductName(row.name);
              setIsBatchModalOpen(true);
            }}
            className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
            title="See batches"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-gray-900 mb-1">Product Management</h2>
          <p className="text-gray-600">Manage your product catalog</p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="w-5 h-5" />
          Add Product
        </Button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <DataTable columns={columns} data={products} />
      </div>

      {/* Add/Edit Product Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProduct ? 'Edit Product' : 'Add Product'}
      >
        <div className="space-y-4">
          <Input
            label="Product Name"
            placeholder="Enter product name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <Input
            label="Description"
            placeholder="Enter description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Category"
              options={categories}
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            />
            <Select
              label="Unit"
              options={units}
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
            />
          </div>
          <Input
            label="Price"
            type="number"
            step="0.01"
            placeholder="Enter price"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
          />
          <div className="flex gap-3 justify-end pt-4">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingProduct ? 'Update' : 'Add'} Product
            </Button>
          </div>
        </div>
      </Modal>

      {/* Product batches modal (component riêng) */}
      <ProductBatchesModal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        productName={selectedProductName}
        batches={batches}
        // Nếu Modal.tsx của bạn có hỗ trợ className thì giữ, không thì xoá dòng này
        modalClassName="max-w-6xl w-[40vw]"
      />
    </div>
  );
}
