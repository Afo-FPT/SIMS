
'use client';

import React from 'react';

const staffPerformance = [
  { name: 'Mike Sterling', tasks: 142, speed: '94 picks/hr', accuracy: '99.8%', status: 'Top Performer' },
  { name: 'Anna Chen', tasks: 128, speed: '88 picks/hr', accuracy: '99.2%', status: 'Active' },
  { name: 'David Smith', tasks: 94, speed: '72 picks/hr', accuracy: '95.4%', status: 'Needs Support' },
  { name: 'Leo V.', tasks: 110, speed: '82 picks/hr', accuracy: '98.9%', status: 'Active' },
];

export default function PerformancePage() {
  return (
    <div className="space-y-8 animate-slide-up">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-black text-slate-900 tracking-tight">Staff KPI & Performance</h3>
          <p className="text-sm text-slate-500 font-medium">Monitor picking speed and accuracy across your team</p>
        </div>
        <button className="px-6 py-3 bg-white border border-slate-200 text-slate-900 font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-sm">Reward Program</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Avg Speed', value: '82/hr', icon: 'speed', color: 'bg-blue-500' },
          { label: 'Avg Accuracy', value: '98.2%', icon: 'verified', color: 'bg-emerald-500' },
          { label: 'Tasks Done', value: '1,440', icon: 'task_alt', color: 'bg-primary' },
          { label: 'Active Staff', value: '12', icon: 'groups', color: 'bg-purple-500' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-4xl border border-slate-200/60 shadow-sm">
            <div className={`size-10 rounded-xl ${stat.color} text-white flex items-center justify-center mb-4`}>
              <span className="material-symbols-outlined text-xl">{stat.icon}</span>
            </div>
            <p className="text-2xl font-black text-slate-900">{stat.value}</p>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-4xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
           <thead>
             <tr className="bg-slate-50/50 border-b border-slate-100">
               <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Operator</th>
               <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Tasks Done</th>
               <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Picking Speed</th>
               <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Accuracy</th>
               <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Status</th>
             </tr>
           </thead>
           <tbody className="divide-y divide-slate-50">
             {staffPerformance.map((staff, i) => (
               <tr key={i} className="hover:bg-slate-50/30 transition-colors">
                 <td className="px-8 py-6">
                   <div className="flex items-center gap-4">
                     <img src={`https://picsum.photos/seed/${staff.name}/100/100`} className="size-10 rounded-xl object-cover" alt="" />
                     <p className="font-black text-slate-900 text-sm">{staff.name}</p>
                   </div>
                 </td>
                 <td className="px-8 py-6 text-center">
                   <span className="font-black text-slate-900">{staff.tasks}</span>
                 </td>
                 <td className="px-8 py-6 text-center text-sm font-bold text-slate-600">
                   {staff.speed}
                 </td>
                 <td className="px-8 py-6 text-center text-sm font-bold text-emerald-600">
                   {staff.accuracy}
                 </td>
                 <td className="px-8 py-6 text-right">
                   <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                     staff.status === 'Top Performer' ? 'bg-emerald-50 text-emerald-600' : 
                     staff.status === 'Needs Support' ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-500'
                   }`}>{staff.status}</span>
                 </td>
               </tr>
             ))}
           </tbody>
        </table>
      </div>
    </div>
  );
}
