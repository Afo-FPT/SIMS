
import React from 'react';
import { Warehouse } from '../types';

const mockWarehouses: Warehouse[] = [
  { id: 'WH-9021', name: 'Alpha Distribution Hub', location: 'San Francisco, CA', totalShelves: 2450, occupancy: 82, status: 'Active' },
  { id: 'WH-4482', name: 'East Coast Fulfillment', location: 'New Jersey, NY', totalShelves: 1890, occupancy: 45, status: 'Active' },
  { id: 'WH-1102', name: 'Southwest Storage B-1', location: 'Austin, TX', totalShelves: 3200, occupancy: 0, status: 'Inactive' },
  { id: 'WH-7731', name: 'London Export Center', location: 'London, UK', totalShelves: 1200, occupancy: 95, status: 'Active' },
];

const WarehouseManagement: React.FC = () => {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="size-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <span className="material-symbols-outlined !text-3xl">check_circle</span>
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Facilities</p>
            <p className="text-3xl font-black text-slate-900 tracking-tighter">38</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="size-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
            <span className="material-symbols-outlined !text-3xl">warning</span>
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">At Capacity</p>
            <p className="text-3xl font-black text-slate-900 tracking-tighter">12</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="size-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
            <span className="material-symbols-outlined !text-3xl">auto_graph</span>
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Avg. Occupancy</p>
            <p className="text-3xl font-black text-slate-900 tracking-tighter">74.2%</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Warehouse Name</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Location</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Shelves</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Occupancy %</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {mockWarehouses.map((wh) => (
                <tr key={wh.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className={`size-10 rounded-xl flex items-center justify-center ${wh.status === 'Active' ? 'bg-primary/5 text-primary' : 'bg-slate-100 text-slate-400'}`}>
                        <span className="material-symbols-outlined text-2xl">warehouse</span>
                      </div>
                      <div>
                        <p className="font-black text-slate-900 text-sm tracking-tight">{wh.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">ID: {wh.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-1.5 text-sm text-slate-600 font-medium">
                      <span className="material-symbols-outlined text-slate-400 text-sm">location_on</span>
                      {wh.location}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-sm font-black text-slate-700">{wh.totalShelves.toLocaleString()}</p>
                  </td>
                  <td className="px-8 py-6">
                    <div className="w-48">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{wh.occupancy}% Full</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-1000 ${
                          wh.occupancy > 90 ? 'bg-red-500' : wh.occupancy > 70 ? 'bg-primary' : 'bg-amber-400'
                        }`} style={{ width: `${wh.occupancy}%` }}></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      wh.status === 'Active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-500'
                    }`}>
                      <span className={`size-1.5 rounded-full ${wh.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                      {wh.status}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <button className="p-2 text-slate-400 hover:text-primary transition-all">
                      <span className="material-symbols-outlined text-xl font-bold">more_vert</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default WarehouseManagement;
