
import React from 'react';
import { Persona } from '../../types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

const throughputData = [
  { name: '08:00', value: 400 },
  { name: '10:00', value: 720 },
  { name: '12:00', value: 1200 },
  { name: '14:00', value: 1100 },
  { name: '16:00', value: 1500 },
  { name: '18:00', value: 900 },
  { name: '20:00', value: 300 },
];

const distributionData = [
  { name: 'Zone A', count: 420 },
  { name: 'Zone B', count: 310 },
  { name: 'Zone C', count: 180 },
  { name: 'Zone D', count: 540 },
];

const DashboardView: React.FC<{ persona: Persona }> = ({ persona }) => {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Active Rents', value: '1,248', sub: 'Shelves occupied', trend: '+12%', icon: 'inventory_2', color: 'bg-primary' },
          { label: 'Efficiency', value: '94.2%', sub: 'Pathing optimal', trend: '+2.4%', icon: 'bolt', color: 'bg-amber-500' },
          { label: 'Pending Tasks', value: '42', sub: 'Priority high', trend: '-5%', icon: 'assignment', color: 'bg-blue-500' },
          { label: 'System Uptime', value: '99.98%', sub: 'Last 30 days', trend: 'Stable', icon: 'speed', color: 'bg-emerald-500' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-4xl border border-slate-200/60 shadow-sm relative group overflow-hidden transition-all hover:shadow-xl">
            <div className="flex justify-between items-start relative z-10">
              <div className={`size-12 rounded-2xl ${stat.color} text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                <span className="material-symbols-outlined">{stat.icon}</span>
              </div>
              <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-widest ${stat.trend.startsWith('+') ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>
                {stat.trend}
              </span>
            </div>
            <div className="mt-6">
              <p className="text-3xl font-black text-slate-900 tracking-tighter">{stat.value}</p>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{stat.label}</p>
              <p className="text-[9px] text-slate-400 font-medium mt-1 italic">{stat.sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-8 rounded-4xl border border-slate-200/60 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Throughput Velocity</h3>
                <p className="text-xs text-slate-400 font-medium">Real-time shelf interaction metrics</p>
              </div>
              <div className="p-1 bg-slate-50 rounded-xl flex">
                <button className="px-3 py-1.5 text-[10px] font-black bg-white rounded-lg shadow-sm text-primary uppercase tracking-widest">Hourly</button>
                <button className="px-3 py-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors">Daily</button>
              </div>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={throughputData}>
                  <defs>
                    <linearGradient id="velocityGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#006c75" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#006c75" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="8 8" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                  <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'}} />
                  <Area type="monotone" dataKey="value" stroke="#006c75" strokeWidth={4} fillOpacity={1} fill="url(#velocityGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-8 rounded-4xl border border-slate-200/60 shadow-sm overflow-hidden relative">
             <div className="flex items-center justify-between mb-8">
                <h3 className="text-lg font-black text-slate-900 tracking-tight">Zone Utilization</h3>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Status</span>
             </div>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {distributionData.map((d, i) => (
                  <div key={i} className="p-4 bg-slate-50 rounded-3xl border border-slate-100 flex flex-col items-center text-center">
                    <div className="size-2 rounded-full bg-primary mb-3"></div>
                    <p className="text-xl font-black text-slate-900">{d.count}</p>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{d.name}</p>
                  </div>
                ))}
             </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-slate-900 text-white p-8 rounded-4xl shadow-2xl relative overflow-hidden group">
            <div className="relative z-10">
              <div className="size-12 bg-white/10 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-xl border border-white/10">
                <span className="material-symbols-outlined text-primary-light">auto_awesome</span>
              </div>
              <h4 className="text-xl font-black tracking-tight mb-2">AI Layout Engine</h4>
              <p className="text-sm text-slate-400 leading-relaxed mb-8">Current shelf configuration is at 88% efficiency. Deploying optimizations could save 12km of worker travel daily.</p>
              <button className="w-full py-4 bg-primary text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all">Run Optimization Engine</button>
            </div>
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:rotate-12 transition-transform">
              <span className="material-symbols-outlined text-[180px]">cognition</span>
            </div>
          </div>

          <div className="bg-white p-8 rounded-4xl border border-slate-200/60 shadow-sm">
             <div className="flex items-center justify-between mb-6">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Recent Activity</h4>
                <button className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline">View All</button>
             </div>
             <div className="space-y-6">
                {[
                  { user: 'J. Sterling', action: 'Modified Zone B', time: '12m ago', color: 'bg-emerald-500' },
                  { user: 'AI Core', action: 'Optimization Successful', time: '45m ago', color: 'bg-primary' },
                  { user: 'System', action: 'Daily Backup Completed', time: '2h ago', color: 'bg-slate-300' },
                ].map((act, i) => (
                  <div key={i} className="flex gap-4">
                    <div className={`size-2 rounded-full mt-1.5 shrink-0 ${act.color}`}></div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 leading-none mb-1">{act.action}</p>
                      <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">{act.user} • {act.time}</p>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
