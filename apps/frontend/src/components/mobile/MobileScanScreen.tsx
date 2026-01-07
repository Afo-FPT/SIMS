'use client';

import { useState } from 'react';
import { MobileLayout } from './MobileLayout';
import { QrCode, Camera, AlertCircle } from 'lucide-react';

interface MobileScanScreenProps {
  onNavigate: (view: string) => void;
}

export function MobileScanScreen({ onNavigate }: MobileScanScreenProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState('');

  const handleStartScan = () => {
    setIsScanning(true);
    setError('');
    
    // Simulate scanning
    setTimeout(() => {
      const success = Math.random() > 0.3; // 70% success rate
      if (success) {
        onNavigate('mobile-detail');
      } else {
        setError('Invalid QR code. Please try again.');
        setIsScanning(false);
      }
    }, 2000);
  };

  return (
    <MobileLayout title="Scan QR Code" currentView="mobile-scan" onNavigate={onNavigate}>
      <div className="p-4 space-y-6">
        {/* Scan Area */}
        <div className="relative">
          <div className="aspect-square bg-gray-900 rounded-lg overflow-hidden relative">
            {isScanning ? (
              <>
                <div className="absolute inset-0 bg-gradient-to-b from-blue-900/50 to-purple-900/50" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-64 h-64 border-4 border-blue-500 rounded-lg relative">
                    {/* Scanning animation */}
                    <div className="absolute inset-0 overflow-hidden">
                      <div className="h-1 bg-blue-500 animate-pulse scanning-line" />
                    </div>
                    {/* Corner indicators */}
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white" />
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white" />
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white" />
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white" />
                  </div>
                </div>
                <div className="absolute bottom-4 left-0 right-0 text-center">
                  <p className="text-white">Scanning QR Code...</p>
                </div>
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <Camera className="w-20 h-20 text-gray-500 mb-4" />
                <p className="text-gray-400">Camera preview</p>
              </div>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <p className="text-red-900">Scan Failed</p>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Scan Button */}
        {!isScanning && (
          <button
            onClick={handleStartScan}
            className="w-full bg-blue-600 text-white rounded-lg p-4 flex items-center justify-center gap-3 hover:bg-blue-700 transition-colors"
          >
            <QrCode className="w-6 h-6" />
            <span className="text-lg">Start Scanning</span>
          </button>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-blue-900 mb-2">How to Scan</h3>
          <ol className="text-blue-700 space-y-1 list-decimal list-inside">
            <li>Tap "Start Scanning" button</li>
            <li>Point camera at QR code</li>
            <li>Keep the code within the frame</li>
            <li>Wait for automatic detection</li>
          </ol>
        </div>

        {/* Sample QR Codes */}
        <div>
          <h3 className="text-gray-900 mb-3">Sample QR Codes</h3>
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200">
                <QrCode className="w-16 h-16 text-gray-400" />
              </div>
            ))}
          </div>
          <p className="text-gray-600 mt-2">Scan these demo codes to test the feature</p>
        </div>
      </div>
    </MobileLayout>
  );
}