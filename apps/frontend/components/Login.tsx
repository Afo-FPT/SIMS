
import React, { useState } from 'react';
import { Persona } from '../types';

interface LoginProps {
  onLogin: (persona: Persona) => void;
  onBack: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, onBack }) => {
  const [loading, setLoading] = useState(false);

  const handleLogin = (persona: Persona) => {
    setLoading(true);
    setTimeout(() => {
      onLogin(persona);
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-display items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 p-10 lg:p-12 animate-in fade-in zoom-in duration-500">
        <div className="text-center mb-10">
          <div className="inline-flex bg-primary p-2 rounded-xl text-white mb-6">
            <span className="material-symbols-outlined text-3xl">warehouse</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Welcome back</h1>
          <p className="text-slate-500 font-medium">Select your portal role to continue</p>
        </div>

        <div className="space-y-4">
          <button 
            disabled={loading}
            onClick={() => handleLogin('ADMIN')}
            className="w-full p-5 bg-white border-2 border-slate-100 hover:border-primary hover:bg-primary/5 rounded-3xl transition-all flex items-center gap-4 group"
          >
            <div className="size-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined">admin_panel_settings</span>
            </div>
            <div className="text-left">
              <p className="font-black text-slate-900">Admin Portal</p>
              <p className="text-xs text-slate-500 font-medium">System config & user mgmt</p>
            </div>
          </button>

          <button 
            disabled={loading}
            onClick={() => handleLogin('STAFF')}
            className="w-full p-5 bg-white border-2 border-slate-100 hover:border-primary hover:bg-primary/5 rounded-3xl transition-all flex items-center gap-4 group"
          >
            <div className="size-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined">engineering</span>
            </div>
            <div className="text-left">
              <p className="font-black text-slate-900">Operations Portal</p>
              <p className="text-xs text-slate-500 font-medium">Inventory & task history</p>
            </div>
          </button>

          <button 
            disabled={loading}
            onClick={() => handleLogin('CUSTOMER')}
            className="w-full p-5 bg-white border-2 border-slate-100 hover:border-primary hover:bg-primary/5 rounded-3xl transition-all flex items-center gap-4 group"
          >
            <div className="size-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined">storefront</span>
            </div>
            <div className="text-left">
              <p className="font-black text-slate-900">Customer Portal</p>
              <p className="text-xs text-slate-500 font-medium">Rental requests & contracts</p>
            </div>
          </button>
        </div>

        <button 
          onClick={onBack}
          className="w-full mt-10 py-4 text-slate-400 font-bold hover:text-primary transition-all text-sm uppercase tracking-widest"
        >
          Back to Homepage
        </button>
      </div>
      
      <p className="mt-12 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">SWSMS-AI • SECURE ACCESS ONLY • v4.0.12</p>
    </div>
  );
};

export default Login;
