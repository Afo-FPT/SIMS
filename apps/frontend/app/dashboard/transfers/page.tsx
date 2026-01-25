
'use client';

import React from 'react';

const mockTransfers = [
  { id: 'TRF-102', from: 'Shelf A-12', to: 'Shelf B-05', sku: 'SS-00249', qty: 50, status: 'In Progress' },
  { id: 'TRF-103', from: 'Shelf D-01', to: 'Shelf A-10', sku: 'CB-88210', qty: 120, status: 'Pending' },
];

export default function TransfersPage() {
  return (
    <div className="space-y-8 animate-slide-up">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-black text-slate-900 tracking-tight">Internal Movement</h3>
          <p className="text-sm text-slate-500 font-medium">Relocate stock between shelf units</p>
        </div>
        <button className="px-6 py-3 bg-white border border-slate-200 text-slate-900 font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-sm">Manual Transfer</button>
      </div>

      <div className="bg-white rounded-4xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Movement ID</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Item & Qty</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Route</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {mockTransfers.map((trf) => (
                <tr key={trf.id} className="hover:bg-slate-50/30 transition-colors">
                  <td className="px-8 py-6">
                    <p className="font-black text-slate-900 text-sm leading-none mb-1">{trf.id}</p>
                    <span className="px-2 py-0.5 bg-amber-50 text-amber-600 text-[8px] font-black uppercase tracking-widest rounded-md">{trf.status}</span>
                  </td>
                  <td className="px-8 py-6">
                    <p className="font-black text-slate-900 text-sm">{trf.sku}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{trf.qty} Units</p>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center justify-center gap-4">
                       <div className="text-right">
                          <p className="text-xs font-black text-slate-900 leading-none mb-1">{trf.from}</p>
                          <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">Source</p>
                       </div>
                       <span className="material-symbols-outlined text-slate-300">trending_flat</span>
                       <div className="text-left">
                          <p className="text-xs font-black text-primary leading-none mb-1">{trf.to}</p>
                          <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">Target</p>
                       </div>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <button className="px-4 py-2 bg-primary text-white font-black rounded-xl text-[9px] uppercase tracking-widest shadow-lg shadow-primary/20">Verify</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="p-8 bg-primary/5 rounded-4xl border border-primary/10 flex items-center gap-6">
         <div className="size-14 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
           <span className="material-symbols-outlined !text-3xl">auto_awesome</span>
         </div>
         <div>
            <h4 className="font-black text-slate-900 mb-1 leading-tight">AI Optimization Queue</h4>
            <p className="text-sm text-slate-500 font-medium">There are 12 recommended moves to increase Zone B efficiency by 14%.</p>
         </div>
         <button className="ml-auto px-6 py-3 bg-slate-900 text-white font-black rounded-xl text-[10px] uppercase tracking-widest">View Suggestions</button>
      </div>
    </div>
  );
}
