
'use client';

import React, { useState } from 'react';

export default function ScannerPage() {
  const [scannedCode, setScannedCode] = useState('');
  const [lastAction, setLastAction] = useState<{sku: string, qty: number, type: string} | null>(null);

  const handleSimulateScan = () => {
    const codes = ['SS-00249', 'ICH-9981', 'CB-88210', 'HT-6602'];
    const randomCode = codes[Math.floor(Math.random() * codes.length)];
    setScannedCode(randomCode);
    setLastAction({ sku: randomCode, qty: 1, type: 'Picked' });
    
    // Feedback haptic/audio simulation
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
    audio.play().catch(() => {});
  };

  return (
    <div className="max-w-xl mx-auto space-y-8 animate-slide-up">
      <div className="text-center">
        <h3 className="text-2xl font-black text-slate-900 tracking-tight">Active PDA Scanner</h3>
        <p className="text-sm text-slate-500 font-medium">Scan SKU barcodes for instant processing</p>
      </div>

      <div className="aspect-square bg-slate-900 rounded-[3rem] border-8 border-slate-800 shadow-2xl overflow-hidden relative group">
         <div className="absolute inset-0 flex flex-col items-center justify-center p-10">
            <div className="w-full h-px bg-red-500/50 absolute top-1/2 -translate-y-1/2 animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]"></div>
            <span className="material-symbols-outlined !text-8xl text-white/10 group-hover:text-primary/20 transition-colors">qr_code_scanner</span>
            <button 
              onClick={handleSimulateScan}
              className="mt-10 px-8 py-4 bg-primary text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-xl shadow-primary/40 active:scale-95 transition-all"
            >
              Trigger Laser Scan
            </button>
         </div>
      </div>

      {lastAction && (
        <div className="bg-white p-8 rounded-4xl border border-slate-200 shadow-sm animate-in fade-in zoom-in">
           <div className="flex items-center justify-between mb-6">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Last Scanned Item</p>
              <span className="px-3 py-1 bg-emerald-100 text-emerald-600 text-[9px] font-black uppercase tracking-widest rounded-lg">Success</span>
           </div>
           <div className="flex items-center gap-6">
              <div className="size-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-900 font-black text-xl">
                 {lastAction.qty}
              </div>
              <div>
                 <h4 className="text-xl font-black text-slate-900">{lastAction.sku}</h4>
                 <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Status: {lastAction.type}</p>
              </div>
           </div>
           <div className="mt-8 flex gap-3">
              <button className="flex-1 py-4 bg-slate-50 text-slate-400 font-black rounded-xl text-[10px] uppercase tracking-widest">Re-Scan</button>
              <button className="flex-1 py-4 bg-slate-950 text-white font-black rounded-xl text-[10px] uppercase tracking-widest">Confirm Batch</button>
           </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
         <div className="bg-white p-5 rounded-3xl border border-slate-200 text-center">
            <p className="text-2xl font-black text-slate-900">142</p>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Items Today</p>
         </div>
         <div className="bg-white p-5 rounded-3xl border border-slate-200 text-center">
            <p className="text-2xl font-black text-emerald-500">99.8%</p>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Accuracy</p>
         </div>
      </div>
    </div>
  );
}
