
import React from 'react';
import { LogEntry } from '../../types';

const mockLogs: LogEntry[] = [
  { id: '1', timestamp: 'Oct 24 • 14:22', user: 'john.doe', message: 'Inference completed for Zone A layout.', category: 'AI Events', status: 'Success' },
  { id: '2', timestamp: 'Oct 24 • 13:45', user: 'system', message: 'Failed login from unknown IP: 1.2.3.4', category: 'Security', status: 'Warning' },
];

const SystemLogsView: React.FC = () => {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white p-6 rounded-4xl border border-slate-200/60 shadow-sm">
        <h3 className="text-xl font-black text-slate-900 font-display mb-6">Security & Operational Logs</h3>
        <div className="space-y-4">
          {mockLogs.map(log => (
            <div key={log.id} className="flex items-center gap-6 p-5 bg-slate-50/50 rounded-3xl border border-slate-100 hover:border-primary/20 transition-all group">
              <div className={`size-10 rounded-2xl flex items-center justify-center shrink-0 ${
                log.category === 'Security' ? 'bg-red-100 text-red-600' : 'bg-primary/10 text-primary'
              }`}>
                <span className="material-symbols-outlined">{log.category === 'Security' ? 'shield' : 'cognition'}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-black text-slate-900 uppercase tracking-widest">[{log.category}]</p>
                  <span className="text-[10px] text-slate-400 font-bold">{log.timestamp}</span>
                </div>
                <p className="text-sm font-medium text-slate-600 truncate">{log.message}</p>
                <p className="text-[10px] text-slate-400 mt-1 font-bold italic">User: {log.user}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SystemLogsView;
