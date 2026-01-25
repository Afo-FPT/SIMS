
import React from 'react';

const AIConfig: React.FC = () => {
  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Endpoints */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">api</span>
            API Endpoints & Infrastructure
          </h3>
        </div>
        <div className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Production Model Endpoint</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">link</span>
                <input className="w-full pl-12 pr-4 h-12 bg-slate-50 border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all text-slate-900" defaultValue="https://api.swsms-ai.v1/models/inference" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Development Sandbox</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">terminal</span>
                <input className="w-full pl-12 pr-4 h-12 bg-slate-50 border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all text-slate-900" defaultValue="https://sandbox-dev.swsms-ai.io/internal" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Master API Key</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">key</span>
                <input className="w-full pl-12 pr-12 h-12 bg-slate-50 border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all text-slate-900" type="password" defaultValue="••••••••••••••••••••••••" />
                <button className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary">
                  <span className="material-symbols-outlined text-lg">visibility</span>
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Request Timeout (ms)</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">timer</span>
                <input className="w-full pl-12 pr-4 h-12 bg-slate-50 border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-primary/10 transition-all text-slate-900" type="number" defaultValue="30000" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stability Controls */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">construction</span>
            Service Stability & Maintenance
          </h3>
        </div>
        <div className="p-6 divide-y divide-slate-100">
          {[
            { title: 'Maintenance Mode', desc: 'Redirect all incoming traffic to landing page.', active: false },
            { title: 'Global Rate Limiting', desc: 'Enforce strict rate limits to protect infrastructure.', active: true },
            { title: 'Detailed Debug Logging', desc: 'Verbose logging for AI model inference.', active: false },
            { title: 'Auto-Scaling Infrastructure', desc: 'Dynamically provision compute based on load.', active: true },
          ].map((item, idx) => (
            <div key={idx} className="py-5 flex items-center justify-between group">
              <div className="space-y-0.5">
                <h4 className="text-sm font-black text-slate-900 tracking-tight">{item.title}</h4>
                <p className="text-xs text-slate-500 font-medium">{item.desc}</p>
              </div>
              <button className={`w-12 h-6 rounded-full relative transition-colors duration-300 ${item.active ? 'bg-primary' : 'bg-slate-200'}`}>
                <div className={`absolute top-1 size-4 bg-white rounded-full shadow-sm transition-all duration-300 ${item.active ? 'left-7' : 'left-1'}`}></div>
              </button>
            </div>
          ))}
        </div>
      </div>
      
      <div className="flex justify-end pt-4">
        <button className="px-8 py-4 bg-primary text-white font-black rounded-2xl shadow-2xl shadow-primary/20 hover:-translate-y-1 transition-all flex items-center gap-3">
          <span className="material-symbols-outlined">save</span>
          Save Configuration Changes
        </button>
      </div>
    </div>
  );
};

export default AIConfig;
