
import React, { useState } from 'react';

const AILayout: React.FC = () => {
  const [selectedZone, setSelectedZone] = useState<string | null>(null);

  const zones = [
    { id: 'A', name: 'High Frequency', color: 'bg-red-500', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', status: 'Bottleneck Detected', utilization: '98%' },
    { id: 'B', name: 'Medium Storage', color: 'bg-amber-500', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', status: 'Optimal', utilization: '65%' },
    { id: 'C', name: 'Bulk Area', color: 'bg-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', status: 'Underutilized', utilization: '12%' },
    { id: 'D', name: 'Loading Docks', color: 'bg-blue-500', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', status: 'Active', utilization: '45%' },
  ];

  return (
    <div className="flex flex-col lg:flex-row h-full gap-8 animate-in fade-in duration-700">
      <div className="flex-1 space-y-6">
        <div className="bg-white p-8 rounded-5xl border border-slate-200/60 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-black tracking-tight font-display">Floorplan Intelligence</h2>
              <p className="text-sm text-slate-500 font-medium">Real-time heat distribution across North Terminal NT-04</p>
            </div>
            <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-2xl">
              <button className="px-4 py-2 bg-white shadow-sm rounded-xl text-[10px] font-black uppercase tracking-widest text-primary">Live View</button>
              <button className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors">History</button>
            </div>
          </div>

          <div className="aspect-[16/9] w-full bg-slate-50 rounded-4xl border border-slate-200 relative p-8 grid grid-cols-12 grid-rows-6 gap-3">
            {/* Dynamic Grid visualization */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#006c75 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
            
            {/* Zone A: Bottleneck */}
            <button 
              onClick={() => setSelectedZone('A')}
              className={`col-span-3 row-span-4 rounded-3xl border-2 border-dashed ${selectedZone === 'A' ? 'border-red-500 bg-red-100/50 ring-4 ring-red-500/10' : 'border-red-200 bg-red-50/50'} transition-all flex flex-col items-center justify-center gap-2 hover:scale-[1.02] active:scale-95`}
            >
              <span className="material-symbols-outlined text-red-500 animate-pulse">priority_high</span>
              <span className="text-[10px] font-black text-red-700 uppercase tracking-widest">Zone A</span>
            </button>

            {/* Zone B: Medium */}
            <button 
              onClick={() => setSelectedZone('B')}
              className={`col-start-5 col-span-5 row-span-2 rounded-3xl border ${selectedZone === 'B' ? 'border-amber-500 bg-amber-100/50 ring-4 ring-amber-500/10' : 'border-amber-200 bg-amber-50/50'} transition-all flex items-center justify-center hover:scale-[1.02] active:scale-95`}
            >
              <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Zone B</span>
            </button>

            {/* Zone C: Underutilized */}
            <button 
              onClick={() => setSelectedZone('C')}
              className={`col-start-1 col-span-12 row-start-5 row-span-2 rounded-3xl border ${selectedZone === 'C' ? 'border-emerald-500 bg-emerald-100/50 ring-4 ring-emerald-500/10' : 'border-emerald-200 bg-emerald-50/50'} transition-all flex items-center justify-center hover:scale-[1.02] active:scale-95`}
            >
              <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Zone C (Expansion Ready)</span>
            </button>

            {/* Zone D: Docking */}
            <div className="col-start-11 col-span-2 row-start-1 row-span-4 bg-slate-100 rounded-3xl border border-slate-200 flex flex-col items-center justify-center gap-4">
              <span className="material-symbols-outlined text-slate-400 !text-4xl">local_shipping</span>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest rotate-90 whitespace-nowrap">Gate 12-18</span>
            </div>
          </div>
          
          <div className="mt-8 flex items-center justify-center gap-8">
            {zones.map(z => (
              <div key={z.id} className="flex items-center gap-2">
                <div className={`size-3 rounded-full ${z.color}`}></div>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{z.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="w-full lg:w-96 shrink-0 space-y-6">
        <div className="bg-slate-900 text-white p-8 rounded-5xl shadow-2xl shadow-slate-900/20 relative overflow-hidden h-full">
          <div className="relative z-10 flex flex-col h-full">
            <div className="flex items-center gap-3 mb-8">
              <div className="size-12 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center">
                <span className="material-symbols-outlined !text-2xl text-primary-light">auto_awesome</span>
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight">AI Insights</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Live Engine Update</p>
              </div>
            </div>

            {selectedZone ? (
              <div className="flex-1 space-y-6 animate-slide-up">
                <div className="p-6 bg-white/5 rounded-3xl border border-white/10">
                  <p className="text-[10px] font-black text-primary-light uppercase tracking-[0.2em] mb-2">Focused Zone: {selectedZone}</p>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-2xl font-black">{zones.find(z => z.id === selectedZone)?.utilization}</span>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${selectedZone === 'A' ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                      {zones.find(z => z.id === selectedZone)?.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    AI recommendation: Relocate high-turnover SKUs from Shelf A12 to Zone B to reduce pathing conflict by 14%.
                  </p>
                </div>
                <button className="w-full py-4 bg-primary text-white font-black rounded-2xl hover:opacity-90 transition-all text-xs uppercase tracking-widest shadow-xl shadow-primary/20">
                  Deploy Optimization
                </button>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-white/10 rounded-4xl">
                <span className="material-symbols-outlined !text-4xl text-white/20 mb-4">touch_app</span>
                <p className="text-sm font-bold text-slate-400">Select a zone on the floorplan to view detailed AI analysis.</p>
              </div>
            )}
            
            <div className="mt-8 pt-8 border-t border-white/10">
              <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">
                <span>Total Efficiency</span>
                <span className="text-white">88.4%</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-primary-light rounded-full" style={{ width: '88%' }}></div>
              </div>
            </div>
          </div>
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <span className="material-symbols-outlined !text-9xl">analytics</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AILayout;
