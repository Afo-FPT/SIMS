
import React from 'react';
import { Persona } from '../types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { name: 'Mon', occupied: 4000, capacity: 2400 },
  { name: 'Tue', occupied: 3500, capacity: 1398 },
  { name: 'Wed', occupied: 5200, capacity: 9800 },
  { name: 'Thu', occupied: 4780, capacity: 3908 },
  { name: 'Fri', occupied: 5890, capacity: 4800 },
  { name: 'Sat', occupied: 6100, capacity: 4200 },
  { name: 'Sun', occupied: 5900, capacity: 4100 },
];

const Dashboard: React.FC<{ persona: Persona }> = ({ persona }) => {
  const stats = [
    { label: 'Active Hubs', value: '42', trend: '+2.4%', icon: 'warehouse', color: 'text-primary bg-primary/10' },
    { label: persona === 'ADMIN' ? 'Node Uptime' : 'Shelf Units', value: persona === 'ADMIN' ? '99.9%' : '12,480', trend: 'Optimal', icon: 'speed', color: 'text-blue-600 bg-blue-50' },
    { label: 'Util. Rate', value: '84.2%', trend: '+5.0%', icon: 'donut_large', color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Active SLA', value: '106', trend: 'Stable', icon: 'security', color: 'text-amber-600 bg-amber-50' },
  ];

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white p-7 rounded-[2rem] border border-slate-200/60 shadow-sm hover:shadow-xl hover:border-primary/20 transition-all group relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
              <span className="material-symbols-outlined text-6xl">{stat.icon}</span>
            </div>
            <div className="flex items-center justify-between mb-6">
              <div className={`size-12 rounded-2xl flex items-center justify-center transition-transform group-hover:rotate-12 ${stat.color}`}>
                <span className="material-symbols-outlined text-2xl">{stat.icon}</span>
              </div>
              <span className={`text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-[0.2em] ${
                stat.trend.startsWith('+') ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'
              }`}>
                {stat.trend}
              </span>
            </div>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">{stat.label}</p>
            <p className="text-4xl font-black text-slate-900 tracking-tighter font-display">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-200/60 shadow-sm flex flex-col group">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h3 className="font-black text-slate-900 text-xl font-display tracking-tight">Throughput Analysis</h3>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Real-time shelf interaction metrics</p>
            </div>
            <div className="flex items-center gap-6 text-[10px] font-black uppercase tracking-widest">
              <div className="flex items-center gap-2"><span className="size-2.5 rounded-full bg-primary ring-4 ring-primary/10"></span> Current</div>
              <div className="flex items-center gap-2 text-slate-300"><span className="size-2.5 rounded-full bg-slate-100 ring-4 ring-slate-50"></span> Projected</div>
            </div>
          </div>
          <div className="h-96 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorPrimary" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#006c75" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#006c75" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="8 8" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 800, fill: '#94a3b8'}} dy={15} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 800, fill: '#94a3b8'}} />
                <Tooltip 
                  cursor={{ stroke: '#006c75', strokeWidth: 2, strokeDasharray: '4 4' }}
                  contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '16px' }}
                  itemStyle={{ fontWeight: 900, fontSize: '14px', textTransform: 'uppercase' }}
                />
                <Area type="monotone" dataKey="occupied" stroke="#006c75" strokeWidth={5} fillOpacity={1} fill="url(#colorPrimary)" animationDuration={2000} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-slate-900 text-white p-8 rounded-[2.5rem] shadow-2xl shadow-slate-900/20 relative overflow-hidden">
            <div className="relative z-10">
              <div className="size-14 bg-white/10 backdrop-blur-2xl rounded-[1.5rem] flex items-center justify-center mb-6">
                <span className="material-symbols-outlined !text-3xl">bolt</span>
              </div>
              <h3 className="font-black text-xl tracking-tight mb-3">AI Engine Status</h3>
              <p className="text-xs text-slate-400 font-medium leading-relaxed mb-8">Intelligence nodes are operating at 94% efficiency. Predictive layout models updated 12m ago.</p>
              <button className="w-full py-4 bg-primary text-white font-black rounded-2xl hover:opacity-90 active:scale-[0.98] transition-all text-[11px] uppercase tracking-widest shadow-xl shadow-primary/20">
                Optimize Infrastructure
              </button>
            </div>
            <div className="absolute -bottom-12 -right-12 size-48 bg-primary/20 blur-[60px] rounded-full"></div>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200/60 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h3 className="font-black text-slate-900 text-sm uppercase tracking-widest">Active Alerts</h3>
              <span className="size-2 bg-red-500 rounded-full animate-ping"></span>
            </div>
            <div className="space-y-5">
              {[
                { type: 'High', msg: 'Zone D-14 Capacity Over 95%', time: '2m ago' },
                { type: 'Med', msg: 'API Gateway Latency Spike', time: '14m ago' },
                { type: 'Low', msg: 'Backup Sync Completed', time: '1h ago' }
              ].map((alert, i) => (
                <div key={i} className="flex gap-4 group cursor-pointer">
                  <div className={`size-2 rounded-full mt-1.5 shrink-0 ${
                    alert.type === 'High' ? 'bg-red-500' : alert.type === 'Med' ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-700 truncate group-hover:text-primary transition-colors">{alert.msg}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter mt-0.5">{alert.time}</p>
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

export default Dashboard;
