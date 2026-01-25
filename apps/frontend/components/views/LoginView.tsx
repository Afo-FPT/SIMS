
import React from 'react';
import { Persona } from '../../types';

interface LoginViewProps {
  onLogin: (persona: Persona) => void;
  onBack: () => void;
}

const LoginView: React.FC<LoginViewProps> = ({ onLogin, onBack }) => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-display">
      <div className="w-full max-w-md bg-white rounded-5xl shadow-2xl border border-slate-100 p-12">
        <div className="text-center mb-10">
          <div className="inline-flex bg-primary p-3 rounded-2xl text-white shadow-xl shadow-primary/20 mb-6">
            <span className="material-symbols-outlined text-3xl">warehouse</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Access Portal</h1>
          <p className="text-slate-500 font-medium">Please select your administrative role</p>
        </div>

        <div className="space-y-4">
          {(['ADMIN', 'STAFF', 'CUSTOMER'] as Persona[]).map((role) => (
            <button 
              key={role}
              onClick={() => onLogin(role)}
              className="w-full p-5 bg-slate-50 border border-slate-100 hover:border-primary hover:bg-primary/5 rounded-3xl transition-all flex items-center gap-4 group"
            >
              <div className={`size-12 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform ${
                role === 'ADMIN' ? 'bg-purple-100 text-purple-600' : 
                role === 'STAFF' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'
              }`}>
                <span className="material-symbols-outlined">
                  {role === 'ADMIN' ? 'admin_panel_settings' : role === 'STAFF' ? 'engineering' : 'storefront'}
                </span>
              </div>
              <div className="text-left">
                <p className="font-black text-slate-900">{role.charAt(0) + role.slice(1).toLowerCase()} Portal</p>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Secure Login Required</p>
              </div>
            </button>
          ))}
        </div>

        <button onClick={onBack} className="w-full mt-10 text-xs font-black text-slate-400 uppercase tracking-widest hover:text-primary transition-colors">
          Return to Website
        </button>
      </div>
    </div>
  );
};

export default LoginView;
