
import React, { useState } from 'react';

const RequestFormView: React.FC<{ onCancel: () => void; onComplete: () => void }> = ({ onCancel, onComplete }) => {
  const [step, setStep] = useState(1);
  return (
    <div className="min-h-screen bg-slate-50 py-16 flex flex-col items-center px-6 font-display">
       <div className="w-full max-w-2xl bg-white rounded-5xl shadow-2xl border border-slate-100 p-12 animate-in zoom-in duration-500">
          <div className="mb-10 flex justify-between items-center">
             <h2 className="text-3xl font-black text-slate-900">Application</h2>
             <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-black rounded-full uppercase">Step {step} of 3</span>
          </div>
          
          <div className="space-y-8">
            <div className="space-y-4">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Company Representative</label>
               <input className="w-full h-16 bg-slate-50 border-slate-200 rounded-3xl px-6 font-bold outline-none focus:ring-8 focus:ring-primary/5 focus:border-primary transition-all" placeholder="Enter full name" />
            </div>
          </div>

          <div className="mt-12 flex justify-between items-center pt-10 border-t border-slate-100">
             <button onClick={onCancel} className="text-xs font-black text-slate-400 uppercase tracking-widest hover:text-red-500">Cancel</button>
             <button onClick={() => step < 3 ? setStep(step + 1) : onComplete()} className="px-10 py-5 bg-primary text-white font-black rounded-3xl shadow-2xl hover:bg-primary-dark shadow-primary/20 transition-all text-xs uppercase tracking-widest">Continue</button>
          </div>
       </div>
    </div>
  );
};

export default RequestFormView;
