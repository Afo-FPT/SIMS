
import React, { useState } from 'react';

interface RequestFormProps {
  onCancel: () => void;
  onComplete: () => void;
}

const RequestForm: React.FC<RequestFormProps> = ({ onCancel, onComplete }) => {
  const [step, setStep] = useState(1);

  return (
    <div className="min-h-screen bg-background-light py-12 flex flex-col items-center px-6">
      {/* Header */}
      <div className="w-full max-w-7xl mx-auto flex justify-between items-center mb-12">
        <div className="flex items-center gap-3">
          <div className="bg-primary p-2 rounded-lg text-white">
            <span className="material-symbols-outlined">warehouse</span>
          </div>
          <span className="text-xl font-black tracking-tight text-slate-900 uppercase">SWSMS-AI</span>
        </div>
        <button onClick={onCancel} className="text-sm font-bold text-slate-400 hover:text-primary transition-colors">Cancel Application</button>
      </div>

      {/* Step Indicator */}
      <div className="w-full max-w-2xl mb-12">
        <div className="relative flex justify-between items-center">
          <div className="absolute top-5 left-0 w-full h-[2px] bg-slate-200 -z-10"></div>
          <div className={`absolute top-5 left-0 h-[2px] bg-primary -z-10 transition-all duration-500 ${step === 1 ? 'w-0' : step === 2 ? 'w-1/2' : 'w-full'}`}></div>
          
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex flex-col items-center gap-3">
              <div className={`size-10 rounded-full border-2 flex items-center justify-center font-bold transition-all duration-300 ${
                step > s ? 'bg-primary border-primary text-white' : 
                step === s ? 'bg-white border-primary text-primary ring-4 ring-primary/10' : 
                'bg-slate-50 border-slate-200 text-slate-400'
              }`}>
                {step > s ? <span className="material-symbols-outlined text-lg">check</span> : s}
              </div>
              <span className={`text-[10px] font-black uppercase tracking-widest ${step === s ? 'text-primary' : 'text-slate-400'}`}>
                {s === 1 ? 'Company' : s === 2 ? 'Requirements' : 'Review'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Form Card */}
      <div className="w-full max-w-2xl bg-white rounded-[2rem] border border-slate-200 shadow-2xl p-8 lg:p-12 animate-in fade-in zoom-in duration-500">
        {step === 1 && (
          <div className="space-y-8">
            <div className="text-center md:text-left">
              <h2 className="text-3xl font-black text-slate-900 mb-2">Apply for Storage Space</h2>
              <p className="text-primary font-bold text-lg">Step 1: Company & Contact Information</p>
            </div>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Company Name</label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-primary/50 group-focus-within:text-primary">business</span>
                  <input className="w-full pl-12 pr-4 h-14 bg-slate-50 border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all outline-none" placeholder="e.g. Sterling Logistics Solutions" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Business Email</label>
                  <input className="w-full px-4 h-14 bg-slate-50 border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all outline-none" placeholder="name@company.com" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Phone Number</label>
                  <input className="w-full px-4 h-14 bg-slate-50 border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all outline-none" placeholder="+1 (555) 000-0000" />
                </div>
              </div>
              <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 flex items-start gap-4">
                <span className="material-symbols-outlined text-primary">info</span>
                <p className="text-xs text-primary/80 leading-relaxed font-medium">Security Notice: Your account will be provisioned only after our regional manager approves the request within 24 hours.</p>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8">
             <div className="text-center md:text-left">
              <h2 className="text-3xl font-black text-slate-900 mb-2">Storage Needs</h2>
              <p className="text-primary font-bold text-lg">Step 2: Capacity & Specifications</p>
            </div>
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Requested Shelf Capacity</label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-primary/50 group-focus-within:text-primary">grid_view</span>
                  <input type="number" className="w-full pl-12 pr-4 h-14 bg-slate-50 border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all outline-none" placeholder="e.g. 50 shelves" />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400 uppercase">Shelves</div>
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Preferred Location</label>
                <select className="w-full h-14 bg-slate-50 border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all outline-none px-4">
                  <option>Select a region...</option>
                  <option>West Coast Distribution - Long Beach, CA</option>
                  <option>East Coast Distribution - Newark, NJ</option>
                  <option>Midwest Logistics - Chicago, IL</option>
                </select>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Special Handling</label>
                <textarea className="w-full p-4 bg-slate-50 border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all outline-none min-h-[120px]" placeholder="Temperature control, oversized items, etc." />
              </div>
            </div>
          </div>
        )}

        <div className="mt-12 flex items-center justify-between gap-4 border-t border-slate-100 pt-8">
          <button 
            onClick={() => step > 1 ? setStep(step - 1) : onCancel()} 
            className="px-8 py-4 text-slate-600 font-bold hover:bg-slate-50 rounded-2xl transition-all"
          >
            {step === 1 ? 'Cancel' : 'Go Back'}
          </button>
          <button 
            onClick={() => step < 3 ? setStep(step + 1) : onComplete()}
            className="px-10 py-4 bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
          >
            {step === 3 ? 'Submit Request' : 'Next Step'}
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </button>
        </div>
      </div>
      
      <p className="mt-12 text-xs text-slate-400 font-bold uppercase tracking-widest">Copyright © 2024 SWSMS-AI Logistics. All rights reserved.</p>
    </div>
  );
};

export default RequestForm;
