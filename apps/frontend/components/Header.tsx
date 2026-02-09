import React from 'react';
import { Persona } from '../types';

interface HeaderProps {
  activeView: string;
  persona: Persona;
}

const Header: React.FC<HeaderProps> = ({ activeView, persona }) => {
  const getTitle = () => {
    switch (activeView) {
      case 'DASHBOARD': return persona === 'ADMIN' ? 'Overview' : persona === 'CUSTOMER' ? 'Overview' : persona === 'MANAGER' ? 'Dashboard' : 'Operational Status';
      case 'RENT_REQUESTS': return 'Rent Requests';
      case 'CONTRACTS': return 'Contracts';
      case 'SERVICE_REQUESTS': return 'Service Requests';
      case 'INVENTORY': return persona === 'CUSTOMER' ? 'My Inventory' : persona === 'MANAGER' ? 'Inventory' : 'Global Inventory';
      case 'INVENTORY_CHECKING': return 'Inventory Checking';
      case 'CYCLE_COUNT': return 'Cycle Count';
      case 'SETTINGS': return 'Settings';
      case 'USERS': return persona === 'ADMIN' ? 'Users' : 'User Control';
      case 'LOGS': return persona === 'ADMIN' ? 'Logs' : 'Audit Logs';
      case 'HISTORY': return 'History';
      case 'CONFIG': return 'AI Parameters';
      case 'WAREHOUSES': return persona === 'MANAGER' ? 'Warehouses' : 'Facilities';
      case 'AI_LAYOUT': return 'Layout Optimization';
      case 'AI_CHAT': return 'AI Intelligence';
      case 'REPORTS': return 'Reports';
      default: return 'Management';
    }
  };

  return (
    <header className="h-20 bg-white/70 backdrop-blur-xl border-b border-slate-200/60 px-8 flex items-center justify-between sticky top-0 z-40 shrink-0">
      <div className="flex flex-col">
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight font-display">{getTitle()}</h2>
        <div className="flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">System Online • v4.0.12</p>
        </div>
      </div>

      <div className="flex items-center gap-5">
        <div className="relative group hidden md:flex items-center">
          <span className="material-symbols-outlined absolute left-4 text-slate-400 text-lg">search</span>
          <input
            className="pl-11 pr-4 py-2.5 bg-slate-100/50 border border-slate-200/50 rounded-2xl text-xs w-80 focus:ring-4 focus:ring-primary/5 focus:border-primary/50 focus:bg-white transition-all outline-none font-medium"
            placeholder="Search SKUs, orders, or logs..."
            type="text"
          />
        </div>

        <div className="flex items-center gap-2">
          <button className="p-2.5 text-slate-500 hover:text-primary hover:bg-primary/5 rounded-2xl relative transition-all group">
            <span className="material-symbols-outlined text-[22px]">notifications</span>
            <span className="absolute top-2.5 right-2.5 size-2 bg-red-500 rounded-full border-2 border-white ring-2 ring-red-500/10"></span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
