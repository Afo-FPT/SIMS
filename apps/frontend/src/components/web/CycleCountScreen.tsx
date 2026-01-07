'use client';

import { useState } from 'react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { QrCode, Save, AlertTriangle } from 'lucide-react';

export function CycleCountScreen() {
  const [batchCode, setBatchCode] = useState('');
  const [systemQuantity, setSystemQuantity] = useState(0);
  const [actualQuantity, setActualQuantity] = useState('');
  const [productName, setProductName] = useState('');
  const [isScanned, setIsScanned] = useState(false);

  // Mock batch data
  const mockBatches: Record<string, { productName: string; quantity: number }> = {
    'BATCH-001': { productName: 'Product A', quantity: 450 },
    'BATCH-002': { productName: 'Product B', quantity: 25 },
    'BATCH-003': { productName: 'Product C', quantity: 120 },
    'BATCH-004': { productName: 'Product D', quantity: 80 },
  };

  const handleScanBatch = () => {
    // Simulate QR scan
    const randomBatches = Object.keys(mockBatches);
    const randomBatch = randomBatches[Math.floor(Math.random() * randomBatches.length)];
    
    const batch = mockBatches[randomBatch];
    setBatchCode(randomBatch);
    setProductName(batch.productName);
    setSystemQuantity(batch.quantity);
    setIsScanned(true);
    setActualQuantity('');
  };

  const adjustmentQuantity = actualQuantity ? Number(actualQuantity) - systemQuantity : 0;
  const hasDiscrepancy = adjustmentQuantity !== 0;

  const handleSubmit = () => {
    if (!actualQuantity) {
      alert('Please enter actual quantity');
      return;
    }

    alert(`Cycle count saved!\nAdjustment: ${adjustmentQuantity > 0 ? '+' : ''}${adjustmentQuantity}`);
    
    // Reset form
    setBatchCode('');
    setSystemQuantity(0);
    setActualQuantity('');
    setProductName('');
    setIsScanned(false);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-gray-900 mb-1">Cycle Count</h2>
        <p className="text-gray-600">Verify and adjust inventory quantities</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm max-w-2xl">
        <div className="space-y-4">
          {/* Scan Button */}
          <div>
            <Button onClick={handleScanBatch} className="w-full">
              <QrCode className="w-5 h-5" />
              Scan Batch QR Code
            </Button>
          </div>

          {/* Batch Information */}
          {isScanned && (
            <>
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-600 mb-1">Batch Code</p>
                    <p className="text-gray-900">{batchCode}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 mb-1">Product Name</p>
                    <p className="text-gray-900">{productName}</p>
                  </div>
                </div>
              </div>

              <Input
                label="System Quantity"
                type="number"
                value={systemQuantity}
                disabled
              />

              <Input
                label="Actual Quantity"
                type="number"
                placeholder="Enter counted quantity"
                value={actualQuantity}
                onChange={(e) => setActualQuantity(e.target.value)}
              />

              {actualQuantity && (
                <div className={`p-4 rounded-lg border ${
                  hasDiscrepancy 
                    ? 'bg-yellow-50 border-yellow-200' 
                    : 'bg-green-50 border-green-200'
                }`}>
                  <div className="flex items-start gap-3">
                    {hasDiscrepancy && (
                      <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className={hasDiscrepancy ? 'text-yellow-900' : 'text-green-900'}>
                        Adjustment Quantity
                      </p>
                      <p className={`${hasDiscrepancy ? 'text-yellow-700' : 'text-green-700'}`}>
                        {adjustmentQuantity > 0 ? '+' : ''}{adjustmentQuantity}
                      </p>
                      {hasDiscrepancy && (
                        <p className="text-yellow-600 mt-1">
                          There is a discrepancy between system and actual quantity
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button 
                  variant="secondary" 
                  className="flex-1"
                  onClick={() => setIsScanned(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSubmit}
                  className="flex-1"
                >
                  <Save className="w-5 h-5" />
                  Submit Count
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-2xl">
        <h3 className="text-blue-900 mb-2">Instructions</h3>
        <ol className="text-blue-700 space-y-1 list-decimal list-inside">
          <li>Click "Scan Batch QR Code" to scan a batch</li>
          <li>The system will display the current quantity</li>
          <li>Count the actual physical quantity</li>
          <li>Enter the actual quantity in the field</li>
          <li>Review the adjustment quantity</li>
          <li>Submit to update the system</li>
        </ol>
      </div>
    </div>
  );
}