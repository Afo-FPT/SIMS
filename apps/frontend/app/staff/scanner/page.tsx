'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import type { ScanResult } from '../../../types/staff';
import { scanSku } from '../../../lib/mockApi/staff.api';
import { useToastHelpers } from '../../../lib/toast';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Badge } from '../../../components/ui/Badge';
import { LoadingSkeleton } from '../../../components/ui/LoadingSkeleton';

export default function StaffScannerPage() {
  const toast = useToastHelpers();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleScan = async () => {
    if (!code.trim()) {
      toast.warning('Please enter a code to scan');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await scanSku(code.trim());
      setResult(data);
      toast.success('SKU scanned successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'SKU not found');
      setResult(null);
      toast.error('Failed to scan SKU');
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateScan = () => {
    const mockCodes = ['ELEC-001', 'ELEC-002', 'COSM-001'];
    const randomCode = mockCodes[Math.floor(Math.random() * mockCodes.length)];
    setCode(randomCode);
    handleScan();
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Scanner</h1>
        <p className="text-slate-500 mt-1">Scan SKU codes in warehouse</p>
      </div>

      <section className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm max-w-2xl">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Scan code</label>
            <div className="flex gap-3">
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleScan();
                  }
                }}
                placeholder="Enter or scan SKU code"
                className="flex-1"
                autoFocus
              />
              <Button onClick={handleScan} isLoading={loading}>
                Scan
              </Button>
              <Button variant="secondary" onClick={handleSimulateScan} disabled={loading}>
                Simulate
              </Button>
            </div>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-12">
              <LoadingSkeleton className="h-32 w-full" />
            </div>
          )}

          {error && !loading && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
              <span className="material-symbols-outlined text-4xl text-red-500 mb-2">error</span>
              <p className="text-red-700 font-bold">{error}</p>
            </div>
          )}

          {result && !loading && (
            <div className="bg-slate-50 rounded-2xl p-6 space-y-4 border border-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-slate-900">Scan result</h3>
                <Badge variant="success">Found</Badge>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase mb-1">SKU</p>
                  <p className="text-lg font-black text-slate-900">{result.sku}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase mb-1">Product name</p>
                  <p className="text-lg font-bold text-slate-900">{result.productName}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase mb-1">Shelf/slot</p>
                  <p className="text-lg font-bold text-slate-900">{result.shelf}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase mb-1">Current quantity</p>
                  <p className="text-lg font-black text-slate-900">
                    {result.currentQuantity} <span className="text-slate-500">{result.unit}</span>
                  </p>
                </div>
              </div>

              {result.relatedTaskId && (
                <div className="pt-4 border-t border-slate-200">
                  <p className="text-xs font-bold text-slate-500 uppercase mb-2">
                    Related to active task
                  </p>
                  <Link
                    href={`/staff/tasks/${result.relatedTaskId}`}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-xl hover:bg-primary/20 transition-colors"
                  >
                    <span className="font-bold">{result.relatedTaskCode}</span>
                    <span className="material-symbols-outlined text-lg">arrow_forward</span>
                  </Link>
                </div>
              )}
            </div>
          )}

          {!result && !loading && !error && (
            <div className="text-center py-12 text-slate-400">
              <span className="material-symbols-outlined text-6xl mb-4">barcode_scanner</span>
              <p className="font-bold">Enter a code and click Scan or Simulate</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
