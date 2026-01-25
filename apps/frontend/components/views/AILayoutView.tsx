
import React from 'react';

const AILayoutView: React.FC = () => {
  return (
    <div className="h-full space-y-8 animate-in fade-in duration-700">
      <div className="bg-white p-10 rounded-5xl border border-slate-200/60 shadow-sm relative overflow-hidden group">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-2xl font-black text-slate-900 font-display tracking-tight">Active Floorplan</h2>
            <p className="text-sm text-slate-500 font-medium uppercase tracking-widest">Real-time heat distribution NT-04</p>
          </div>
          <div className="p-1 bg-slate-100 rounded-2xl flex">
            <button className="px-4 py-2 bg-white rounded-xl text-[10px] font-black uppercase text-primary shadow-sm">2D Map</button>
            <button className="px-4 py-2 text-[10px] font-black uppercase text-slate-400">3D View</button>
          </div>
        </div>

        <div className="aspect-[16/9] w-full bg-slate-50 border-2 border-slate-100 rounded-4xl p-12 grid grid-cols-12 grid-rows-6 gap-4 relative">
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#006c75_1px,transparent_1px)] [background-size:24px_24px]"></div>
          
          <div className="col-span-3 row-span-4 bg-red-50 border-2 border-dashed border-red-200 rounded-3xl flex flex-col items-center justify-center gap-3">
             <span className="material-symbols-outlined text-red-500 animate-pulse">priority_high</span>
             <span className="text-[10px] font-black text-red-700 uppercase tracking-widest">Bottleneck A</span>
          </div>
          
          <div className="col-start-5 col-span-5 row-span-2 bg-emerald-50 border border-emerald-100 rounded-3xl flex items-center justify-center">
             <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Zone B (Optimal)</span>
          </div>

          <div className="col-start-1 col-span-12 row-start-5 row-span-2 bg-slate-100 border border-slate-200 rounded-3xl flex items-center justify-center">
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Expansion Zone</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AILayoutView;
