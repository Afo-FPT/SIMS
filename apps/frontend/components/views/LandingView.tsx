
import React from 'react';

interface LandingViewProps {
  onStart: () => void;
  onLogin: () => void;
}

const LandingView: React.FC<LandingViewProps> = ({ onStart, onLogin }) => {
  return (
    <div className="min-h-screen bg-white font-display overflow-x-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-5">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-primary p-2 rounded-xl text-white shadow-lg shadow-primary/20">
              <span className="material-symbols-outlined !text-2xl">warehouse</span>
            </div>
            <span className="text-xl font-black tracking-tighter text-slate-900 uppercase">SWSMS-AI</span>
          </div>
          <div className="flex items-center gap-6">
            <button onClick={onLogin} className="text-sm font-bold text-slate-500 hover:text-primary transition-colors">Client Login</button>
            <button onClick={onStart} className="px-6 py-3 bg-primary text-white text-[10px] font-black rounded-2xl shadow-xl shadow-primary/20 uppercase tracking-widest hover:scale-105 active:scale-95 transition-all">Get Started</button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-48 pb-24 px-6 max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
        <div className="space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary text-[10px] font-black rounded-full uppercase tracking-widest">
            <span className="size-2 rounded-full bg-primary animate-pulse"></span>
            Intelligence at every shelf
          </div>
          <h1 className="text-6xl lg:text-8xl font-black text-slate-900 leading-[0.9] tracking-tighter">
            Smart Warehouse <span className="text-primary">Ecosystem.</span>
          </h1>
          <p className="text-xl text-slate-500 font-medium leading-relaxed max-w-xl">
            Rent per-shelf storage space managed by AI. Automated logistics, real-time tracking, and predictive fulfillment for modern enterprises.
          </p>
          <div className="flex gap-4 pt-4">
            <button onClick={onStart} className="px-10 py-5 bg-primary text-white font-black rounded-2xl shadow-2xl shadow-primary/30 text-lg hover:-translate-y-1 transition-all">Start Your Trial</button>
            <button className="px-10 py-5 border-2 border-slate-100 font-bold rounded-2xl hover:bg-slate-50 transition-all">Watch Demo</button>
          </div>
        </div>
        <div className="relative">
          <img src="https://picsum.photos/seed/swslogistics/1000/1000" className="rounded-5xl shadow-2xl border-8 border-white aspect-square object-cover" alt="Logistics Hub" />
          <div className="absolute -bottom-10 -left-10 bg-white p-8 rounded-4xl shadow-2xl border border-slate-100 w-64 animate-bounce-slow">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Throughput Boost</p>
            <p className="text-4xl font-black text-primary tracking-tighter">+42%</p>
            <p className="text-[10px] text-slate-500 font-bold mt-1">Average AI optimization gain</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingView;
