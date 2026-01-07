'use client';

import { MobileLayout } from './MobileLayout';
import { QrCode, Clock, Package } from 'lucide-react';

interface MobileHomeScreenProps {
  onNavigate: (view: string) => void;
}

const recentScans = [
  { 
    id: '1', 
    productName: 'Product A', 
    batchCode: 'BATCH-001', 
    scannedAt: '2 hours ago',
    price: '$99.99'
  },
  { 
    id: '2', 
    productName: 'Product B', 
    batchCode: 'BATCH-002', 
    scannedAt: '5 hours ago',
    price: '$49.99'
  },
  { 
    id: '3', 
    productName: 'Product C', 
    batchCode: 'BATCH-003', 
    scannedAt: '1 day ago',
    price: '$29.99'
  },
];

export function MobileHomeScreen({ onNavigate }: MobileHomeScreenProps) {
  return (
    <MobileLayout title="SIMS-AI Customer" currentView="mobile-home" onNavigate={onNavigate}>
      <div className="p-4 space-y-6">
        {/* Welcome Card */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
          <h2 className="mb-2">Welcome!</h2>
          <p className="mb-4">Scan product QR codes to view details and get AI-powered recommendations</p>
        </div>

        {/* Scan Button */}
        <button
          onClick={() => onNavigate('mobile-scan')}
          className="w-full bg-blue-600 text-white rounded-lg p-6 flex items-center justify-center gap-3 hover:bg-blue-700 transition-colors shadow-lg"
        >
          <QrCode className="w-8 h-8" />
          <span className="text-xl">Scan QR Code</span>
        </button>

        {/* Recent Scans */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-gray-600" />
            <h3 className="text-gray-900">Recent Scans</h3>
          </div>
          <div className="space-y-3">
            {recentScans.map((scan) => (
              <button
                key={scan.id}
                onClick={() => onNavigate('mobile-detail')}
                className="w-full bg-white border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Package className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-900 mb-1">{scan.productName}</p>
                    <p className="text-gray-600">Batch: {scan.batchCode}</p>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-gray-500">{scan.scannedAt}</p>
                      <p className="text-blue-600">{scan.price}</p>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Package className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-gray-900">Product Info</p>
            <p className="text-gray-600">Detailed information</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <QrCode className="w-6 h-6 text-purple-600" />
            </div>
            <p className="text-gray-900">AI Suggestions</p>
            <p className="text-gray-600">Smart recommendations</p>
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}