
'use client';

import React from 'react';

export default function LoginPage() {
  const handleLogin = (role: string) => {
    localStorage.setItem('sws_persona', role);
    window.location.href = '/dashboard';
  };

  const roles = [
    { id: 'ADMIN', label: 'Admin Portal', desc: 'System & Security Control', icon: 'admin_panel_settings', color: 'bg-purple-100 text-purple-600' },
    { id: 'MANAGER', label: 'Manager Portal', desc: 'Ops Strategy & Analytics', icon: 'leaderboard', color: 'bg-amber-100 text-amber-600' },
    { id: 'STAFF', label: 'Operator Portal', desc: 'Inventory & Task Execution', icon: 'engineering', color: 'bg-blue-100 text-blue-600' },
    { id: 'CUSTOMER', label: 'Client Portal', desc: 'Storage & Billing Hub', icon: 'storefront', color: 'bg-emerald-100 text-emerald-600' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-display">
      <div className="w-full max-w-xl bg-white rounded-5xl shadow-2xl border border-slate-100 p-12 animate-slide-up">
        <div className="text-center mb-10">
          <div className="inline-flex bg-primary p-3 rounded-2xl text-white shadow-xl shadow-primary/20 mb-6 cursor-pointer" onClick={() => window.location.href = '/'}>
            <span className="material-symbols-outlined text-3xl">warehouse</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">SWSMS-AI Access</h1>
          <p className="text-slate-500 font-medium">Select your dedicated workspace</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {roles.map((role) => (
            <button 
              key={role.id}
              onClick={() => handleLogin(role.id)}
              className="p-6 bg-slate-50 border border-slate-100 hover:border-primary hover:bg-primary/5 rounded-4xl transition-all flex flex-col items-start gap-4 group text-left"
            >
              <div className={`size-12 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform ${role.color}`}>
                <span className="material-symbols-outlined">{role.icon}</span>
              </div>
              <div>
                <p className="font-black text-slate-900">{role.label}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-tight mt-1">{role.desc}</p>
              </div>
            </button>
          ))}
        </div>

        <button onClick={() => window.location.href = '/'} className="w-full mt-10 text-xs font-black text-slate-400 uppercase tracking-widest hover:text-primary transition-colors">
          Return to Website
        </button>
      </div>
    </div>
  );
}
