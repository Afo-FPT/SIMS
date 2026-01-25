
'use client';

import React from 'react';

export default function TasksPage() {
  const tasks = [
    { id: 'T-102', title: 'Restock Zone B Shelf 12', priority: 'High', status: 'In Progress', time: 'Due in 2h' },
    { id: 'T-103', title: 'Cycle Count - Cold Storage', priority: 'Medium', status: 'Pending', time: 'Due in 5h' },
    { id: 'T-104', title: 'Labeling Batch #4492', priority: 'Low', status: 'Pending', time: 'Tomorrow' },
  ];

  return (
    <div className="space-y-8 animate-slide-up">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-black text-slate-900 tracking-tight">Active Tasks</h3>
          <p className="text-sm text-slate-500 font-medium">Real-time operational queue</p>
        </div>
        <button className="px-6 py-3 bg-primary text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20">Create New Task</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {tasks.map((task) => (
          <div key={task.id} className="bg-white p-7 rounded-4xl border border-slate-200/60 shadow-sm hover:shadow-xl transition-all group">
            <div className="flex justify-between items-start mb-6">
              <div className="size-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                <span className="material-symbols-outlined">assignment</span>
              </div>
              <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                task.priority === 'High' ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-400'
              }`}>{task.priority}</span>
            </div>
            <h4 className="text-lg font-black text-slate-900 leading-tight mb-2">{task.title}</h4>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-tighter mb-6">{task.id} • {task.time}</p>
            <div className="flex items-center justify-between pt-6 border-t border-slate-50">
              <span className="text-[10px] font-black text-primary uppercase tracking-widest">{task.status}</span>
              <button className="p-2 bg-primary/10 text-primary rounded-xl hover:bg-primary hover:text-white transition-all">
                <span className="material-symbols-outlined text-lg">play_arrow</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
