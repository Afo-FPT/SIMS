
import React from 'react';
import { Warehouse } from '../../types';

const mockWarehouses: Warehouse[] = [
  { id: 'WH-9021', name: 'Alpha Distribution Hub', location: 'San Francisco, CA', totalShelves: 2450, occupancy: 82, status: 'Active' },
  { id: 'WH-4482', name: 'East Coast Fulfillment', location: 'Newark, NJ', totalShelves: 1890, occupancy: 45, status: 'Active' },
  { id: 'WH-7731', name: 'London Export Center', location: 'London, UK', totalShelves: 1200, occupancy: 95, status: 'Active' },
];

const WarehouseView: React.FC = () => {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-black text-slate-900 font-display tracking-tight">Facilities Network</h3>
          <p className="text-sm text-slate-500 font-medium">Managing 3 global nodes with real-time sync</p>
        </div>
        <button className="px-6 py-3 bg-primary text-white text-[10px] font-black rounded-2xl shadow-xl shadow-primary/20 uppercase tracking-widest hover:scale-105 transition-all">Register New Facility</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Total Capacity', value: '5,540', sub: 'Active Shelves', icon: 'grid_view', color: 'text-primary' },
          { label: 'Avg. Occupancy', value: '74%', sub: 'Across regions', icon: 'donut_large', color: 'text-amber-500' },
          { label: 'Active Alerts', value: '2', sub: 'Action required', icon: 'warning', color: 'text-red-500' },
        ].map((m, i) => (
          <div key={i} className="bg-white p-6 rounded-4xl border border-slate-200/60 shadow-sm flex items-center gap-4">
            <div className={`size-12 rounded-2xl bg-slate-50 flex items-center justify-center ${m.color}`}>
              <span className="material-symbols-outlined text-2xl">{m.icon}</span>
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900 tracking-tight">{m.value}</p>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{m.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {mockWarehouses.map(wh => (
          <div key={wh.id} className="bg-white p-8 rounded-5xl border border-slate-200/60 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
            <div className="flex items-center justify-between mb-8 relative z-10">
              <div className="flex items-center gap-4">
                <div className="size-14 bg-primary/5 rounded-3xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined !text-3xl">warehouse</span>
                </div>
                <div>
                  <p className="font-black text-slate-900 text-lg tracking-tight">{wh.name}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[14px]">location_on</span>
                    {wh.location}
                  </p>
                </div>
              </div>
              <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                wh.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-50 text-slate-500 border border-slate-100'
              }`}>
                {wh.status}
              </span>
            </div>
            
            <div className="space-y-6 relative z-10">
              <div>
                <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2.5">
                  <span>Occupancy Density</span>
                  <span className="text-slate-900">{wh.occupancy}% utilized</span>
                </div>
                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden p-0.5">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ${
                      wh.occupancy > 90 ? 'bg-red-500' : wh.occupancy > 70 ? 'bg-primary' : 'bg-amber-400'
                    }`} 
                    style={{ width: `${wh.occupancy}%` }}
                  ></div>
                </div>
              </div>
              <div className="flex justify-between items-center pt-6 border-t border-slate-50">
                 <div className="grid grid-cols-2 gap-8">
                    <div>
                       <p className="text-lg font-black text-slate-900">{wh.totalShelves.toLocaleString()}</p>
                       <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Shelves</p>
                    </div>
                    <div>
                       <p className="text-lg font-black text-slate-900">{(wh.totalShelves * wh.occupancy / 100).toFixed(0)}</p>
                       <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Allocated</p>
                    </div>
                 </div>
                 <button className="px-6 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-[9px] font-black uppercase tracking-widest text-slate-600 hover:bg-primary hover:text-white hover:border-primary transition-all">Configure Hub</button>
              </div>
            </div>
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
               <span className="material-symbols-outlined text-[120px]">analytics</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WarehouseView;
