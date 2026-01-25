
import React, { useState } from 'react';
import { Persona, InventoryItem } from '../../types';

const mockItems: InventoryItem[] = [
  { id: '1', name: 'Smart Sensors Pro V2', sku: 'SS-00249', quantity: 1240, location: 'Shelf S-102', status: 'In Stock', lastUpdated: '2 hours ago' },
  { id: '2', name: 'Industrial Controller Hub', sku: 'ICH-9981', quantity: 82, location: 'Shelf S-105', status: 'Low Stock', lastUpdated: '5 mins ago' },
  { id: '3', name: 'Circuit Break Units (Grade A)', sku: 'CB-88210', quantity: 450, location: 'Shelf S-101', status: 'In Stock', lastUpdated: '1 day ago' },
  { id: '4', name: 'High-Temp Thermal Tape', sku: 'HT-6602', quantity: 15, location: 'Shelf S-103', status: 'Low Stock', lastUpdated: 'Just now' },
  { id: '5', name: 'Pneumatic Valves 12mm', sku: 'PV-3341', quantity: 2100, location: 'Shelf S-104', status: 'In Stock', lastUpdated: '3 hours ago' },
];

const InventoryView: React.FC<{ persona: Persona }> = ({ persona }) => {
  const [search, setSearch] = useState('');

  const filteredItems = mockItems.filter(item => 
    item.name.toLowerCase().includes(search.toLowerCase()) || 
    item.sku.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h3 className="text-2xl font-black text-slate-900 font-display tracking-tight">Global Inventory</h3>
          <p className="text-sm text-slate-500 font-medium">Real-time status of 4,820 active shelf units</p>
        </div>
        <div className="flex items-center gap-3">
           <button className="px-5 py-3 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">download</span> Export CSV
           </button>
           <button className="px-5 py-3 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">add</span> New Item
           </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-3xl border border-slate-200/60 shadow-sm flex flex-wrap gap-4 items-center">
        <div className="flex-1 relative min-w-[300px]">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
          <input 
            type="text" 
            placeholder="Search SKU, name, or location..."
            className="w-full pl-12 pr-4 h-12 bg-slate-50/50 border-slate-100 rounded-2xl text-sm font-bold focus:bg-white focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
           <select className="h-12 bg-slate-50/50 border-slate-100 rounded-2xl px-4 text-[10px] font-black uppercase tracking-widest text-slate-500 outline-none">
              <option>All Warehouses</option>
              <option>North Hub (SF-01)</option>
              <option>East Hub (NJ-02)</option>
           </select>
           <button className="h-12 w-12 bg-slate-50/50 border-slate-100 rounded-2xl flex items-center justify-center text-slate-400 hover:text-primary transition-colors">
              <span className="material-symbols-outlined">filter_list</span>
           </button>
        </div>
      </div>

      <div className="bg-white rounded-4xl border border-slate-200/60 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Product & SKU</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Qty</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Shelf Location</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Health Status</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-6">
                    <p className="font-black text-slate-900 text-sm mb-1">{item.name}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest font-mono">{item.sku}</p>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <span className="font-display font-black text-lg text-slate-900">{item.quantity.toLocaleString()}</span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                      <span className="material-symbols-outlined text-sm text-primary">location_on</span>
                      {item.location}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                      item.status === 'In Stock' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button className="p-2 text-slate-300 hover:text-primary transition-colors hover:bg-white rounded-xl shadow-sm">
                        <span className="material-symbols-outlined text-lg">edit</span>
                      </button>
                      <button className="p-2 text-slate-300 hover:text-red-500 transition-colors hover:bg-white rounded-xl shadow-sm">
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-8 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Showing {filteredItems.length} of 4,820 records</p>
           <div className="flex gap-2">
              <button className="p-2 rounded-xl border border-slate-200 bg-white text-slate-400 hover:text-primary disabled:opacity-50" disabled><span className="material-symbols-outlined">chevron_left</span></button>
              <button className="p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:text-primary"><span className="material-symbols-outlined">chevron_right</span></button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryView;
