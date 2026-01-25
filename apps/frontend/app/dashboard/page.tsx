
'use client';

import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { name: 'Mon', occupied: 4000 },
  { name: 'Tue', occupied: 3500 },
  { name: 'Wed', occupied: 5200 },
  { name: 'Thu', occupied: 4780 },
  { name: 'Fri', occupied: 5890 },
  { name: 'Sat', occupied: 6100 },
  { name: 'Sun', occupied: 5900 },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8 animate-slide-up">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Active Rents', value: '1,248', trend: '+12%', icon: 'inventory_2', color: 'bg-primary' },
          { label: 'Efficiency', value: '94.2%', trend: '+2.4%', icon: 'bolt', color: 'bg-amber-500' },
          { label: 'System Uptime', value: '99.98%', trend: 'Stable', icon: 'speed', color: 'bg-emerald-500' },
          { label: 'Active Alerts', value: '2', trend: 'Critical', icon: 'warning', color: 'bg-red-500' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-4xl border border-slate-200/60 shadow-sm hover:shadow-xl transition-all group">
            <div className="flex justify-between items-start mb-6">
              <div className={`size-12 rounded-2xl ${stat.color} text-white flex items-center justify-center shadow-lg`}>
                <span className="material-symbols-outlined">{stat.icon}</span>
              </div>
              <span className="text-[10px] font-black px-2 py-1 bg-slate-50 text-slate-400 rounded-lg uppercase">{stat.trend}</span>
            </div>
            <p className="text-3xl font-black text-slate-900 tracking-tighter">{stat.value}</p>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-4xl border border-slate-200/60 shadow-sm">
          <h3 className="text-lg font-black text-slate-900 mb-8">Throughput velocity</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="velocityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#006c75" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#006c75" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="8 8" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                <Tooltip />
                <Area type="monotone" dataKey="occupied" stroke="#006c75" strokeWidth={4} fill="url(#velocityGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-900 text-white p-8 rounded-4xl shadow-2xl relative overflow-hidden group">
          <div className="relative z-10">
            <div className="size-12 bg-white/10 rounded-2xl flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-primary-light">auto_awesome</span>
            </div>
            <h4 className="text-xl font-black mb-2">AI Optimization</h4>
            <p className="text-sm text-slate-400 mb-8 leading-relaxed">System has detected 14% pathing conflict in Zone B. Recommend re-layout.</p>
            <button className="w-full py-4 bg-primary text-white font-black rounded-2xl text-[10px] uppercase tracking-widest hover:scale-105 transition-all">Execute Optimize</button>
          </div>
        </div>
      </div>
    </div>
  );
}
