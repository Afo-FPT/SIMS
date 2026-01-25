
import React from 'react';

const AIConfigView: React.FC = () => {
  return (
    <div className="max-w-4xl space-y-8 animate-in fade-in duration-700">
      <div className="bg-white p-10 rounded-5xl border border-slate-200/60 shadow-sm">
        <div className="flex items-center gap-4 mb-10">
          <div className="size-14 bg-primary rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-primary/20">
            <span className="material-symbols-outlined !text-3xl">settings_input_component</span>
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 font-display tracking-tight">Inference Settings</h2>
            <p className="text-sm text-slate-500 font-medium uppercase tracking-widest">Gemini Technical Parameters</p>
          </div>
        </div>

        <div className="space-y-8">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Master Model Endpoint</label>
            <input className="w-full h-16 bg-slate-50 border-slate-200 rounded-3xl px-6 text-sm font-bold focus:ring-8 focus:ring-primary/5 focus:border-primary transition-all outline-none" defaultValue="gemini-3-flash-preview" />
          </div>
          <div className="grid grid-cols-2 gap-6">
             <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Temperature</label>
              <input type="range" className="w-full h-2 bg-slate-100 rounded-lg accent-primary" defaultValue="70" />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Top_P Optimization</label>
              <input type="number" className="w-full h-16 bg-slate-50 border-slate-200 rounded-3xl px-6 text-sm font-bold outline-none" defaultValue="0.95" />
            </div>
          </div>
        </div>

        <div className="mt-12 pt-10 border-t border-slate-100 flex justify-end">
           <button className="px-10 py-5 bg-slate-900 text-white font-black rounded-3xl shadow-2xl hover:bg-slate-800 active:scale-95 transition-all text-xs uppercase tracking-widest">Save System Config</button>
        </div>
      </div>
    </div>
  );
};

export default AIConfigView;
