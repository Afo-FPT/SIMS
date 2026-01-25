
import React from 'react';

interface LandingPageProps {
  onStart: () => void;
  onLogin: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onStart, onLogin }) => {
  return (
    <div className="min-h-screen bg-white font-display overflow-x-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-primary p-2 rounded-xl text-white">
              <span className="material-symbols-outlined !text-2xl">warehouse</span>
            </div>
            <span className="text-xl font-black tracking-tight text-slate-900 uppercase">SWSMS-AI</span>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={onLogin}
              className="px-6 py-2.5 text-sm font-bold text-slate-600 hover:text-primary transition-all"
            >
              Login
            </button>
            <button 
              onClick={onStart}
              className="px-6 py-2.5 bg-primary text-white text-sm font-black rounded-xl shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
            >
              Submit Request
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-40 pb-24 px-6 relative overflow-hidden">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div className="relative z-10 space-y-8 animate-in fade-in slide-in-from-left-4 duration-1000">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black tracking-widest uppercase">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              Intelligent Logistics Ecosystem
            </div>
            <h1 className="text-6xl lg:text-8xl font-black leading-[0.95] tracking-tighter text-slate-900">
              Smart <span className="text-primary">Shelf-Based</span> Warehouse Rental
            </h1>
            <p className="text-xl text-slate-500 leading-relaxed max-w-xl font-medium">
              Revolutionizing supply chains with AI-driven precision. Scale your storage needs on a per-shelf basis with 24/7 intelligence and automated optimization.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button 
                onClick={onStart}
                className="px-10 py-5 bg-primary text-white font-black rounded-2xl shadow-2xl shadow-primary/30 hover:-translate-y-1 transition-all text-lg"
              >
                Start Free Trial
              </button>
              <button className="px-10 py-5 border-2 border-slate-100 font-bold rounded-2xl hover:bg-slate-50 transition-all flex items-center justify-center gap-3">
                <span className="material-symbols-outlined text-slate-400">play_circle</span>
                Watch Demo
              </button>
            </div>
          </div>
          
          <div className="relative animate-in fade-in zoom-in duration-1000 delay-300">
            <div className="absolute -inset-10 bg-primary/10 rounded-[3rem] blur-3xl opacity-50"></div>
            <img 
              alt="Warehouse Interior" 
              className="relative rounded-[2.5rem] shadow-2xl border-8 border-white object-cover aspect-[4/3] w-full"
              src="https://picsum.photos/seed/warehouse/800/600"
            />
            <div className="absolute bottom-10 left-10 p-6 bg-white/90 backdrop-blur shadow-2xl rounded-3xl border border-white/20 w-64">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-bold text-slate-400 uppercase">Utilization</span>
                <span className="text-xs font-black text-primary">84.2%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full w-[84%]"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Bar */}
      <section className="py-12 bg-slate-50/50 border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-6 flex flex-wrap justify-between items-center opacity-30 gap-8">
          <span className="text-2xl font-black italic tracking-tighter">GLOBAL LOGISTICS</span>
          <span className="text-2xl font-black italic tracking-tighter">STERLING INC</span>
          <span className="text-2xl font-black italic tracking-tighter">NEXUS HUB</span>
          <span className="text-2xl font-black italic tracking-tighter">SPEEDWAY OPS</span>
          <span className="text-2xl font-black italic tracking-tighter">SMART CHAIN</span>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
