
'use client';

import React from 'react';

export default function BillingPage() {
  return (
    <div className="space-y-8 animate-slide-up">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-black text-slate-900 tracking-tight">Billing & Plans</h3>
          <p className="text-sm text-slate-500 font-medium">Manage your storage subscriptions</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-10 rounded-5xl border border-slate-200/60 shadow-sm">
            <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-8">Active Subscription</h4>
            <div className="flex items-center justify-between p-8 bg-slate-950 text-white rounded-4xl relative overflow-hidden">
               <div className="relative z-10">
                 <p className="text-primary-light font-black uppercase tracking-[0.2em] text-[10px] mb-2">Enterprise Plan</p>
                 <h2 className="text-4xl font-black tracking-tighter mb-4">$4,250<span className="text-lg font-medium text-slate-400">/mo</span></h2>
                 <p className="text-sm text-slate-400 font-medium">Covering 500 Shelves • Zone A/B Access</p>
               </div>
               <button className="relative z-10 px-8 py-4 bg-primary text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-xl shadow-primary/20">Manage Plan</button>
               <div className="absolute top-0 right-0 p-8 opacity-10">
                 <span className="material-symbols-outlined !text-9xl">payments</span>
               </div>
            </div>
          </div>

          <div className="bg-white p-10 rounded-5xl border border-slate-200/60 shadow-sm">
             <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6">Payment History</h4>
             <div className="space-y-4">
                {[
                  { id: 'INV-482', date: 'Oct 01, 2024', amount: '$4,250.00', status: 'Paid' },
                  { id: 'INV-421', date: 'Sep 01, 2024', amount: '$4,250.00', status: 'Paid' },
                ].map(inv => (
                  <div key={inv.id} className="flex items-center justify-between p-5 bg-slate-50 rounded-3xl border border-slate-100">
                    <div>
                      <p className="text-sm font-black text-slate-900">{inv.id}</p>
                      <p className="text-[10px] text-slate-400 font-bold">{inv.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-slate-900">{inv.amount}</p>
                      <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">{inv.status}</p>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        </div>

        <div className="bg-primary/5 p-8 rounded-5xl border border-primary/10 flex flex-col items-center text-center justify-center">
           <div className="size-20 bg-primary text-white rounded-3xl flex items-center justify-center mb-6 shadow-2xl shadow-primary/20">
             <span className="material-symbols-outlined !text-4xl">contact_support</span>
           </div>
           <h4 className="text-xl font-black text-slate-900 mb-2">Need Help?</h4>
           <p className="text-sm text-slate-500 font-medium leading-relaxed mb-8">Speak with our regional billing specialist for custom enterprise quotes.</p>
           <button className="w-full py-4 bg-white text-primary border-2 border-primary/20 font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-primary hover:text-white transition-all">Contact Support</button>
        </div>
      </div>
    </div>
  );
}
