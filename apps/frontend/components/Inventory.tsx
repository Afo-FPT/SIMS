
import React, { useState } from 'react';
import { InventoryItem, Persona } from '../types';

const mockItems: InventoryItem[] = [
  { id: '1', name: 'Smart Sensors Pro V2', sku: 'SS-00249', quantity: 1240, location: 'Shelf S-102', status: 'In Stock', lastUpdated: '2 hours ago' },
  { id: '2', name: 'Industrial Controller Hub', sku: 'ICH-9981', quantity: 82, location: 'Shelf S-105', status: 'Low Stock', lastUpdated: '5 mins ago' },
  { id: '3', name: 'Circuit Break Units (Grade A)', sku: 'CB-88210', quantity: 450, location: 'Shelf S-101', status: 'In Stock', lastUpdated: '1 day ago' },
  { id: '4', name: 'Pneumatic Valves 12mm', sku: 'PV-3341', quantity: 2100, location: 'Shelf S-104', status: 'In Stock', lastUpdated: '3 hours ago' },
  { id: '5', name: 'High-Temp Thermal Tape', sku: 'HT-6602', quantity: 15, location: 'Shelf S-103', status: 'Low Stock', lastUpdated: 'Just now' },
];

const Inventory: React.FC<{ persona: Persona }> = ({ persona }) => {
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Search</label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
            <input 
              className="w-full pl-10 bg-slate-50 border-slate-100 rounded-xl text-sm focus:ring-primary/20 focus:border-primary transition-all" 
              placeholder="SKU, Name, or Shelf..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              type="text" 
            />
          </div>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Warehouse</label>
          <select className="w-full bg-slate-50 border-slate-100 rounded-xl text-sm focus:ring-primary/20 focus:border-primary transition-all">
            <option>All Warehouses</option>
            <option>North Hub (SF-01)</option>
            <option>Central Depot (TX-02)</option>
          </select>
        </div>
        <div className="flex items-end self-end h-full pt-5">
          <button className="px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">filter_alt</span>
            Apply Filters
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Item Name</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">SKU</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Quantity</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Location</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {mockItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-5">
                    <p className="text-sm font-bold text-slate-900">{item.name}</p>
                    <p className="text-[10px] text-slate-400 font-medium">Last updated: {item.lastUpdated}</p>
                  </td>
                  <td className="px-6 py-5">
                    <span className="text-xs font-bold text-slate-500 font-mono">{item.sku}</span>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className="text-sm font-black text-slate-900">{item.quantity.toLocaleString()}</span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm text-slate-300">location_on</span>
                      <span className="text-sm font-semibold text-slate-700">{item.location}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      item.status === 'In Stock' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <button className="p-2 text-slate-300 hover:text-primary transition-colors">
                      <span className="material-symbols-outlined">edit_note</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/30">
          <p className="text-xs text-slate-500 font-medium">Showing <span className="text-slate-900 font-bold">1-10</span> of <span className="text-slate-900 font-bold">4,820</span> records</p>
          <div className="flex gap-2">
            <button className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-400 bg-white cursor-not-allowed">Previous</button>
            <button className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 transition-all">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Inventory;
