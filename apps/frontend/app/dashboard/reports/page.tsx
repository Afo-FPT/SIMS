
'use client';

import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const forecastData = [
  { name: 'Week 1', usage: 65, forecast: 65 },
  { name: 'Week 2', usage: 68, forecast: 70 },
  { name: 'Week 3', usage: 72, forecast: 75 },
  { name: 'Week 4', usage: null, forecast: 82 },
  { name: 'Week 5', usage: null, forecast: 88 },
  { name: 'Week 6', usage: null, forecast: 95 },
];

export default function ReportsPage() {
  return (
    <div className="space-y-8 animate-slide-up">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-black text-slate-900 tracking-tight">AI Capacity Forecasting</h3>
          <p className="text-sm text-slate-500 font-medium">Predictive analytics for facility scaling</p>
        </div>
        <button className="px-6 py-3 bg-primary text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20 flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">download</span> Export PDF
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-4xl border border-slate-200/60 shadow-sm">
           <div className="flex items-center justify-between mb-8">
              <h4 className="font-black text-slate-900 uppercase tracking-tight">Capacity Trend (Next 6 Weeks)</h4>
              <div className="flex items-center gap-4 text-[9px] font-black uppercase tracking-widest">
                <span className="flex items-center gap-1.5"><div className="size-2 bg-primary rounded-full"></div> Historical</span>
                <span className="flex items-center gap-1.5 text-slate-300"><div className="size-2 bg-slate-200 rounded-full"></div> AI Forecast</span>
              </div>
           </div>
           <div className="h-96">
             <ResponsiveContainer width="100%" height="100%">
               <AreaChart data={forecastData}>
                 <defs>
                   <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="5%" stopColor="#006c75" stopOpacity={0.1}/>
                     <stop offset="95%" stopColor="#006c75" stopOpacity={0}/>
                   </linearGradient>
                 </defs>
                 <CartesianGrid strokeDasharray="8 8" vertical={false} stroke="#f1f5f9" />
                 <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                 <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                 <Tooltip />
                 <Area type="monotone" dataKey="forecast" stroke="#e2e8f0" strokeWidth={2} strokeDasharray="5 5" fill="transparent" />
                 <Area type="monotone" dataKey="usage" stroke="#006c75" strokeWidth={4} fill="url(#forecastGrad)" />
               </AreaChart>
             </ResponsiveContainer>
           </div>
        </div>

        <div className="space-y-6">
           <div className="bg-red-500 text-white p-8 rounded-4xl shadow-2xl relative overflow-hidden group">
              <div className="relative z-10">
                <span className="material-symbols-outlined !text-4xl mb-4">notification_important</span>
                <h4 className="text-xl font-black mb-2">Critical Warning</h4>
                <p className="text-sm text-red-100 leading-relaxed mb-6">AI predicts Zone A will hit 100% capacity by <strong>Nov 12</strong>. Immediate stock clearance or expansion required.</p>
                <button className="w-full py-4 bg-white text-red-500 font-black rounded-xl text-[10px] uppercase tracking-widest">Plan Expansion</button>
              </div>
           </div>

           <div className="bg-white p-8 rounded-4xl border border-slate-200 shadow-sm">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Recommendations</h4>
              <div className="space-y-4">
                 {[
                   { msg: 'Move low-turnover items to Zone C', priority: 'High' },
                   { msg: 'Incentivize early shipping for Hub-04', priority: 'Med' },
                 ].map((rec, i) => (
                   <div key={i} className="flex gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className={`size-2 rounded-full mt-1.5 shrink-0 ${rec.priority === 'High' ? 'bg-red-500' : 'bg-amber-500'}`}></div>
                      <p className="text-xs font-bold text-slate-700">{rec.msg}</p>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
