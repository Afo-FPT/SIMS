
import React from 'react';
import { LogEntry } from '../types';

const mockLogs: LogEntry[] = [
  { id: '1', timestamp: 'Oct 24, 2023 • 14:22:15', user: 'john.doe@swsms.ai', message: 'System processed batch AI analysis for 1,200 records.', category: 'AI Events', status: 'Success' },
  { id: '2', timestamp: 'Oct 24, 2023 • 13:45:02', user: 'System Admin', message: 'Unauthorized login attempt from IP 192.168.1.105', category: 'Security', status: 'Warning' },
  { id: '3', timestamp: 'Oct 24, 2023 • 12:10:44', user: 's.smith@swsms.ai', message: 'Updated organization global configuration settings', category: 'Operations', status: 'Success' },
  { id: '4', timestamp: 'Oct 24, 2023 • 11:30:19', user: 'm.johnson@swsms.ai', message: 'API Gateway timeout while connecting to AI Core Service', category: 'Operations', status: 'Failed' },
  { id: '5', timestamp: 'Oct 24, 2023 • 10:05:55', user: 'System Security', message: 'Automatic password rotation policy applied to 4 accounts', category: 'Security', status: 'Success' },
];

const SystemLogs: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[300px]">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">search</span>
          <input className="w-full pl-10 pr-4 py-2 bg-slate-50 border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" placeholder="Search logs by message, user, or IP..." type="text"/>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 p-1 rounded-lg">
            <button className="px-3 py-1.5 text-xs font-bold bg-white text-slate-900 rounded-md shadow-sm">All</button>
            <button className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700">Security</button>
            <button className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700">Operations</button>
            <button className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700">AI Events</button>
          </div>
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold hover:bg-slate-50 transition-colors">
            <span className="material-symbols-outlined text-[18px]">filter_list</span>
            More Filters
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Timestamp & User</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Event Message</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">Status</th>
                <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {mockLogs.map((log) => (
                <tr key={log.id} className={`hover:bg-slate-50/50 transition-colors ${log.status === 'Failed' ? 'bg-red-50/10' : ''}`}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[20px] text-slate-400">
                          {log.category === 'Security' ? 'shield' : log.category === 'AI Events' ? 'schedule' : 'settings'}
                        </span>
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-900">{log.timestamp}</div>
                        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">User: {log.user}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className={`text-sm font-medium max-w-xs truncate ${log.status === 'Failed' ? 'text-red-600' : 'text-slate-600'}`}>
                      {log.message}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                      log.category === 'AI Events' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                      log.category === 'Security' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                      'bg-slate-100 text-slate-700 border-slate-200'
                    }`}>
                      {log.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                      log.status === 'Success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                      log.status === 'Warning' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                      'bg-red-50 text-red-700 border-red-100'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        log.status === 'Success' ? 'bg-emerald-500' :
                        log.status === 'Warning' ? 'bg-amber-500' : 'bg-red-500'
                      }`}></span>
                      {log.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-all" title="View Details">
                        <span className="material-symbols-outlined text-lg">visibility</span>
                      </button>
                      <button className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-all">
                        <span className="material-symbols-outlined text-lg">download</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SystemLogs;
