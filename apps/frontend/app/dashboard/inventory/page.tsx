
'use client';

import React, { useState } from 'react';

const mockItems = [
  { id: '1', name: 'Smart Sensors Pro V2', sku: 'SS-00249', quantity: 1240, location: 'Shelf S-102', status: 'In Stock' },
  { id: '2', name: 'Industrial Controller Hub', sku: 'ICH-9981', quantity: 82, location: 'Shelf S-105', status: 'Low Stock' },
  { id: '3', name: 'Circuit Break Units (Grade A)', sku: 'CB-88210', quantity: 450, location: 'Shelf S-101', status: 'In Stock' },
  { id: '4', name: 'High-Temp Thermal Tape', sku: 'HT-6602', quantity: 15, location: 'Shelf S-103', status: 'Low Stock' },
];

export default function InventoryPage() {
  const [search, setSearch] = useState('');

  const filtered = mockItems.filter(i => 
    i.name.toLowerCase().includes(search.toLowerCase()) || 
    i.sku.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-slide-up">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-black text-slate-900 tracking-tight">Global Inventory</h3>
          <p className="text-sm text-slate-500 font-medium">Real-time shelf-level visibility</p>
        </div>
        <button className="px-6 py-3 bg-primary text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 transition-all">
          Register New SKU
        </button>
      </div>

      <div className="bg-white p-4 rounded-3xl border border-slate-200/60 shadow-sm">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
          <input 
            type="text"
            placeholder="Search by SKU or Product Name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-12 pl-12 pr-4 bg-slate-50 border-transparent rounded-2xl text-sm font-bold focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all outline-none"
          />
        </div>
      </div>

      <div className="bg-white rounded-4xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Product</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Qty</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Location</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/30 transition-colors">
                  <td className="px-8 py-6">
                    <p className="font-black text-slate-900 text-sm leading-none mb-1">{item.name}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase font-mono">{item.sku}</p>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <span className="font-black text-lg text-slate-900">{item.quantity.toLocaleString()}</span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                      <span className="material-symbols-outlined text-sm text-primary">location_on</span>
                      {item.location}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                      item.status === 'In Stock' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
