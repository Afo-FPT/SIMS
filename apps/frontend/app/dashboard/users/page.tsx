
'use client';

import React, { useState } from 'react';

const mockUsers = [
  { id: 'U-992', name: 'John Doe', role: 'ADMIN', status: 'Active', lastSeen: '2m ago', email: 'john@swsms.ai' },
  { id: 'U-881', name: 'Sarah Miller', role: 'MANAGER', status: 'Active', lastSeen: '1h ago', email: 'sarah@swsms.ai' },
  { id: 'U-442', name: 'Mike Sterling', role: 'STAFF', status: 'On Leave', lastSeen: '1d ago', email: 'mike@swsms.ai' },
  { id: 'U-112', name: 'Alex Sterling', role: 'CUSTOMER', status: 'Active', lastSeen: '12m ago', email: 'alex@enterprise.com' },
  { id: 'U-332', name: 'Devin AI', role: 'STAFF', status: 'Active', lastSeen: 'Just now', email: 'devin@swsms.ai' },
];

export default function UsersPage() {
  const [search, setSearch] = useState('');

  const filtered = mockUsers.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.role.toLowerCase().includes(search.toLowerCase())
  );

  const getRoleColor = (role: string) => {
    switch(role) {
      case 'ADMIN': return 'bg-purple-100 text-purple-600';
      case 'MANAGER': return 'bg-amber-100 text-amber-600';
      case 'STAFF': return 'bg-blue-100 text-blue-600';
      default: return 'bg-emerald-100 text-emerald-600';
    }
  };

  return (
    <div className="space-y-8 animate-slide-up">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-black text-slate-900 tracking-tight">Identity & Access Control</h3>
          <p className="text-sm text-slate-500 font-medium">Manage permissions for 48 active operators</p>
        </div>
        <button className="px-6 py-3 bg-primary text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20">Invite New User</button>
      </div>

      <div className="bg-white p-5 rounded-3xl border border-slate-200/60 shadow-sm flex items-center gap-4">
        <div className="flex-1 relative">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
          <input 
            type="text"
            placeholder="Search by name, email or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-12 pl-12 pr-4 bg-slate-50 border-transparent rounded-2xl text-sm font-bold focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
           <button className="h-12 px-6 bg-slate-50 border-transparent rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 transition-all">Role Audit</button>
           <button className="h-12 w-12 bg-slate-50 border-transparent rounded-2xl flex items-center justify-center text-slate-400 hover:text-primary transition-colors">
              <span className="material-symbols-outlined">filter_list</span>
           </button>
        </div>
      </div>

      <div className="bg-white rounded-4xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Operator</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Role</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Security Status</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Last Access</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/30 transition-colors">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                       <img src={`https://picsum.photos/seed/${user.id}/100/100`} className="size-10 rounded-xl object-cover" alt="" />
                       <div>
                          <p className="font-black text-slate-900 text-sm leading-none mb-1">{user.name}</p>
                          <p className="text-[10px] text-slate-400 font-bold">{user.email}</p>
                       </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${getRoleColor(user.role)}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <div className="flex items-center justify-center gap-2">
                       <span className={`size-2 rounded-full ${user.status === 'Active' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
                       <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">{user.status}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-xs font-bold text-slate-400">{user.lastSeen}</p>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button className="p-2 text-slate-300 hover:text-primary transition-all">
                        <span className="material-symbols-outlined text-lg">shield_with_heart</span>
                      </button>
                      <button className="p-2 text-slate-300 hover:text-red-500 transition-all">
                        <span className="material-symbols-outlined text-lg">delete</span>
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
}
