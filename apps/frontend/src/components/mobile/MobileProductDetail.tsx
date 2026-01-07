'use client';

import { MobileLayout } from './MobileLayout';
import { Package, Calendar, DollarSign, Info, Lightbulb, ShoppingCart } from 'lucide-react';

interface MobileProductDetailProps {
  onNavigate: (view: string) => void;
}

export function MobileProductDetail({ onNavigate }: MobileProductDetailProps) {
  // Mock product data
  const product = {
    name: 'Premium Organic Coffee Beans',
    price: '$24.99',
    batchCode: 'BATCH-001',
    manufactureDate: '2024-10-15',
    expiryDate: '2025-10-15',
    description: 'High-quality organic coffee beans sourced from sustainable farms. Rich aroma and smooth taste perfect for your morning brew.',
    ingredients: 'Organic Coffee Beans (100%)',
    category: 'Food & Beverage',
  };

  const suggestions = [
    { id: '1', name: 'Coffee Filters', price: '$5.99' },
    { id: '2', name: 'Coffee Grinder', price: '$34.99' },
    { id: '3', name: 'Travel Mug', price: '$14.99' },
  ];

  return (
    <MobileLayout 
      title="Product Details" 
      currentView="mobile-detail" 
      onNavigate={onNavigate}
      onBack={() => onNavigate('mobile-home')}
    >
      <div className="pb-4">
        {/* Product Image */}
        <div className="aspect-square bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
          <Package className="w-32 h-32 text-amber-600" />
        </div>

        {/* Product Info */}
        <div className="p-4 space-y-4">
          <div>
            <h2 className="text-gray-900 mb-2">{product.name}</h2>
            <p className="text-blue-600 mb-1">{product.price}</p>
            <p className="text-gray-600">{product.category}</p>
          </div>

          {/* Batch Information */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Package className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-gray-600">Batch Code</p>
                <p className="text-gray-900">{product.batchCode}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-gray-600">Manufacture Date</p>
                <p className="text-gray-900">{product.manufactureDate}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-gray-600">Expiry Date</p>
                <p className="text-green-600">{product.expiryDate}</p>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Info className="w-5 h-5 text-gray-600" />
              <h3 className="text-gray-900">Description</h3>
            </div>
            <p className="text-gray-700">{product.description}</p>
          </div>

          {/* Ingredients */}
          <div>
            <h3 className="text-gray-900 mb-2">Ingredients</h3>
            <p className="text-gray-700">{product.ingredients}</p>
          </div>

          {/* AI Suggestions */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-5 h-5 text-yellow-600" />
              <h3 className="text-gray-900">AI-Based Suggestions</h3>
            </div>
            <div className="space-y-3">
              {suggestions.map((item) => (
                <div
                  key={item.id}
                  className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                      <Package className="w-6 h-6 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-gray-900">{item.name}</p>
                      <p className="text-blue-600">{item.price}</p>
                    </div>
                  </div>
                  <button className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    <ShoppingCart className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-2">
            <button className="w-full bg-blue-600 text-white rounded-lg p-4 flex items-center justify-center gap-3 hover:bg-blue-700 transition-colors">
              <ShoppingCart className="w-5 h-5" />
              <span>Add to Cart</span>
            </button>
            <button 
              onClick={() => onNavigate('mobile-scan')}
              className="w-full bg-gray-100 text-gray-900 rounded-lg p-4 hover:bg-gray-200 transition-colors"
            >
              Scan Another Product
            </button>
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}