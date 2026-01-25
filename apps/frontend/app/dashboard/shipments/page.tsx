
'use client';

import React from 'react';

const mockShipments = [
  { id: 'SHP-4492', type: 'Inbound', items: '24x Electronics Box', status: 'En Route', eta: 'Oct 28, 14:00' },
  { id: 'SHP-3310', type: 'Outbound', items: '12x Heavy Duty Rack', status: 'Delivered', eta: 'Completed' },
  { id: 'SHP-1102', type: 'Inbound', items: '100x Sensor Units', status: 'Pending Approval', eta: 'TBD' },
];

export default function ShipmentsPage() {
  return (
    <div className="space-y-8 animate-slide-up">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-black text-slate-900 tracking-tight">Shipment Tracking</h3>
          <p className="text-sm text-slate-500 font-medium">Coordinate your inbound and outbound logistics</p>
        </div>
        <div className="flex gap-4">
          <button className="px-6 py-3 bg-white border border-slate-200 text-slate-900 font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-sm">Request Outbound</button>
          <button className="px-6 py-3 bg-primary text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20">Announce Inbound</button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {mockShipments.map((shp) => (
          <div key={shp.id} className="bg-white p-6 rounded-4xl border border-slate-200/60 shadow-sm flex items-center justify-between group hover:border-primary/30 transition-all">
            <div className="flex items-center gap-6">
               <div className={`size-14 rounded-2xl flex items-center justify-center ${shp.type === 'Inbound' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                 <span className="material-symbols-outlined !text-3xl">{shp.type === 'Inbound' ? 'south_west' : 'north_east'}</span>
               </div>
               <div>
                 <div className="flex items-center gap-2 mb-1">
                   <h4 className="font-black text-slate-900">{shp.id}</h4>
                   <span className="px-2 py-0.5 bg-slate-100 text-[8px] font-black uppercase tracking-widest text-slate-400 rounded-md">{shp.type}</span>
                 </div>
                 <p className="text-sm font-medium text-slate-600">{shp.items}</p>
               </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-black text-slate-900 uppercase tracking-widest mb-1">{shp.status}</p>
              <p className="text-[10px] text-slate-400 font-bold">ETA: {shp.eta}</p>
            </div>
            <div className="flex items-center gap-2 ml-10">
               <button className="size-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 hover:text-primary transition-colors">
                 <span className="material-symbols-outlined text-xl">map</span>
               </button>
               <button className="size-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 hover:text-primary transition-colors">
                 <span className="material-symbols-outlined text-xl">visibility</span>
               </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
