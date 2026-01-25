
import React from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Persona } from '../types';

interface HeaderProps {
  activeView: string;
  persona: Persona;
}

const Header: React.FC<HeaderProps> = ({ activeView, persona }) => {
  const getTitle = () => {
    switch (activeView) {
      case 'DASHBOARD': return persona === 'ADMIN' ? 'System Overview' : 'Operational Status';
      case 'INVENTORY': return 'Global Inventory';
      case 'LOGS': return 'Audit Logs';
      case 'CONFIG': return 'AI Parameters';
      case 'WAREHOUSES': return 'Facilities';
      case 'AI_LAYOUT': return 'Layout Optimization';
      case 'AI_CHAT': return 'AI Intelligence';
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
          
          <div className="h-6 w-px bg-slate-200 mx-1"></div>

          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="flex items-center gap-3 p-1.5 pl-3 rounded-2xl border border-slate-200/50 hover:bg-slate-50 transition-all outline-none">
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-bold text-slate-900 leading-none mb-1">J. Sterling</p>
                  <p className="text-[9px] text-slate-400 font-black uppercase tracking-tighter">Enterprise Plan</p>
                </div>
                <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold overflow-hidden border-2 border-white shadow-sm">
                  <img src="https://picsum.photos/seed/user12/100/100" className="object-cover size-full" alt="avatar" />
                </div>
              </button>
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
              <DropdownMenu.Content className="radix-dropdown-content min-w-[200px] bg-white rounded-2xl p-2 shadow-[0px_10px_38px_-10px_rgba(22,_23,_24,_0.35),_0px_10px_20px_-15px_rgba(22,_23,_24,_0.2)] border border-slate-100 z-50" sideOffset={8}>
                <DropdownMenu.Label className="px-3 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Account Settings</DropdownMenu.Label>
                <DropdownMenu.Item className="flex items-center gap-3 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-primary/5 hover:text-primary rounded-xl outline-none cursor-pointer transition-colors">
                  <span className="material-symbols-outlined text-lg">person</span>
                  Edit Profile
                </DropdownMenu.Item>
                <DropdownMenu.Item className="flex items-center gap-3 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-primary/5 hover:text-primary rounded-xl outline-none cursor-pointer transition-colors">
                  <span className="material-symbols-outlined text-lg">payments</span>
                  Billing
                </DropdownMenu.Item>
                <DropdownMenu.Separator className="h-px bg-slate-100 my-1" />
                <DropdownMenu.Item className="flex items-center gap-3 px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-50 rounded-xl outline-none cursor-pointer transition-colors">
                  <span className="material-symbols-outlined text-lg">logout</span>
                  Sign Out
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </div>
    </header>
  );
};

export default Header;
