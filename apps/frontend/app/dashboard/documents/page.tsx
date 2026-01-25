
'use client';

import React from 'react';

const mockDocs = [
  { name: 'Master Storage Agreement.pdf', date: 'Oct 01, 2024', size: '2.4 MB', type: 'Contract' },
  { name: 'Service Level Agreement (SLA).pdf', date: 'Oct 01, 2024', size: '1.1 MB', type: 'SLA' },
  { name: 'Hazardous Materials Disclosure.pdf', date: 'Oct 12, 2024', size: '0.8 MB', type: 'Disclosure' },
];

export default function DocumentsPage() {
  return (
    <div className="space-y-8 animate-slide-up">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-2xl font-black text-slate-900 tracking-tight">Documents & Vault</h3>
          <p className="text-sm text-slate-500 font-medium">Access your signed contracts and regulatory filings</p>
        </div>
      </div>

      <div className="bg-white rounded-5xl border border-slate-200 shadow-sm overflow-hidden">
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1 divide-x divide-slate-50">
            {mockDocs.map((doc, i) => (
              <div key={i} className="p-8 hover:bg-slate-50 transition-all group cursor-pointer border-b border-slate-50">
                 <div className="size-14 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-primary/10 group-hover:text-primary transition-all">
                   <span className="material-symbols-outlined !text-3xl">description</span>
                 </div>
                 <h4 className="font-black text-slate-900 leading-tight mb-2 truncate">{doc.name}</h4>
                 <div className="flex items-center gap-3 mb-6">
                    <span className="px-2 py-0.5 bg-slate-950 text-white text-[8px] font-black uppercase tracking-widest rounded-md">{doc.type}</span>
                    <span className="text-[10px] text-slate-400 font-bold">{doc.size}</span>
                 </div>
                 <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{doc.date}</p>
                    <button className="p-2 text-primary hover:scale-110 transition-transform">
                      <span className="material-symbols-outlined">download</span>
                    </button>
                 </div>
              </div>
            ))}
         </div>
      </div>
    </div>
  );
}
