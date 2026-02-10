
import React from 'react';
import { Persona, User } from '../types';

interface SidebarProps {
  persona: Persona;
  activeView: string;
  onNavigate: (view: string) => void;
  user: User | null;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ persona, activeView, onNavigate, user, onLogout }) => {
  const getSections = () => {
    switch (persona) {
      case 'ADMIN':
        return [
          {
            section: 'System', items: [
              { id: 'DASHBOARD', label: 'Overview', icon: 'dashboard' },
              { id: 'USERS', label: 'Users', icon: 'people' },
              { id: 'LOGS', label: 'Logs', icon: 'description' },
            ]
          },
          {
            section: 'Account', items: [
              { id: 'SETTINGS', label: 'Settings', icon: 'settings' },
            ]
          }
        ];
      case 'MANAGER':
        return [
          {
            section: 'Overview', items: [
              { id: 'DASHBOARD', label: 'Dashboard', icon: 'dashboard' },
            ]
          },
          {
            section: 'Requests & Contracts', items: [
              { id: 'RENT_REQUESTS', label: 'Rent Requests', icon: 'request_quote' },
              { id: 'CONTRACTS', label: 'Contracts', icon: 'description' },
              { id: 'SERVICE_REQUESTS', label: 'Service Requests', icon: 'local_shipping' },
            ]
          },
          {
            section: 'Operations', items: [
              { id: 'INBOUND_REQUESTS', label: 'Assign Inbound Tasks', icon: 'inbox' },
              { id: 'OUTBOUND_REQUESTS', label: 'Assign Outbound Tasks', icon: 'outbox' },
              { id: 'TASKS', label: 'Tasks', icon: 'assignment_turned_in' },
              { id: 'INVENTORY', label: 'Inventory', icon: 'inventory_2' },
              { id: 'CYCLE_COUNT', label: 'Cycle Count', icon: 'fact_check' },
              { id: 'WAREHOUSES', label: 'Warehouses', icon: 'warehouse' },
            ]
          },
          {
            section: 'Reports', items: [
              { id: 'REPORTS', label: 'Reports', icon: 'monitoring' },
            ]
          },
          {
            section: 'Account', items: [
              { id: 'SETTINGS', label: 'Settings', icon: 'settings' },
            ]
          }
        ];
      case 'STAFF':
        return [
          {
            section: 'Work', items: [
              { id: 'DASHBOARD', label: 'Dashboard', icon: 'dashboard' },
              { id: 'TASKS', label: 'Tasks', icon: 'assignment' },
              { id: 'CYCLE_COUNT', label: 'Cycle Count', icon: 'fact_check' },
              { id: 'INBOUND_REQUESTS', label: 'Inbound Putaway', icon: 'inbox' },
              { id: 'OUTBOUND_REQUESTS', label: 'Outbound Picking', icon: 'outbox' },
              { id: 'HISTORY', label: 'History', icon: 'history' },
              { id: 'SCANNER', label: 'Scanner', icon: 'barcode_scanner' },
              { id: 'REPORT_ISSUE', label: 'Report Issue', icon: 'report_problem' },
            ]
          },
          {
            section: 'Account', items: [
              { id: 'SETTINGS', label: 'Settings', icon: 'settings' },
            ]
          }
        ];
      case 'CUSTOMER':
        return [
          {
            section: 'Overview', items: [
              { id: 'DASHBOARD', label: 'Dashboard', icon: 'dashboard' },
            ]
          },
          {
            section: 'Rental', items: [
              { id: 'RENT_REQUESTS', label: 'Rent Requests', icon: 'request_quote' },
              { id: 'CONTRACTS', label: 'Contracts', icon: 'description' },
              { id: 'SERVICE_REQUESTS', label: 'Service Requests', icon: 'local_shipping' },
            ]
          },
          {
            section: 'Inventory', items: [
              { id: 'INVENTORY', label: 'Inventory', icon: 'inventory_2' },
            ]
          },
          {
            section: 'Account', items: [
              { id: 'SETTINGS', label: 'Settings', icon: 'settings' },
            ]
          }
        ];
      default:
        return [];
    }
  };

  const sections = getSections();

  return (
    <aside className="w-80 bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0 shrink-0 z-50">
      <div className="p-8 border-b border-slate-50 flex items-center gap-4 group cursor-pointer" onClick={() => onNavigate('DASHBOARD')}>
        <div className="size-11 bg-primary rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-primary/30 group-hover:scale-110 transition-transform duration-500">
          <span className="material-symbols-outlined !text-2xl">warehouse</span>
        </div>
        <div className="flex flex-col">
          <h1 className="text-slate-900 font-black text-xl tracking-tighter leading-none mb-1">SWSMS-AI</h1>
          <p className="text-primary text-[10px] font-black uppercase tracking-[0.2em]">{persona} NODE</p>
        </div>
      </div>

      <nav className="flex-1 p-6 space-y-10 overflow-y-auto no-scrollbar">
        {sections.map((sec, i) => (
          <div key={i} className="space-y-3">
            <h3 className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{sec.section}</h3>
            <div className="space-y-1">
              {sec.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all group relative ${activeView === item.id
                      ? 'bg-primary/5 text-primary font-bold'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                >
                  {activeView === item.id && (
                    <div className="absolute left-0 top-3 bottom-3 w-1 bg-primary rounded-r-full"></div>
                  )}
                  <span className={`material-symbols-outlined text-[24px] transition-colors ${activeView === item.id ? 'text-primary' : 'text-slate-400 group-hover:text-primary'
                    }`}>
                    {item.icon}
                  </span>
                  <span className="text-sm tracking-tight">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {user && (
        <div className="px-5 pb-5 pt-4 border-t border-slate-50">
          <div className="bg-primary text-white rounded-2xl px-4 py-3 shadow-lg shadow-primary/30 relative overflow-hidden group">
            <div className="relative z-10 flex items-center gap-3">
              <div className="relative shrink-0">
                <img
                  alt={user.name}
                  className="size-9 rounded-2xl object-cover border-2 border-white/10 shadow-sm transition-transform group-hover:scale-105"
                  src={user.avatar}
                />
                <span className="absolute -bottom-1 -right-1 size-2.5 bg-emerald-500 rounded-full border-2 border-primary"></span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black truncate">{user.name}</p>
                <p className="text-[9px] text-primary-light/90 bg-white/10 px-2 py-0.5 rounded-full font-bold uppercase tracking-[0.18em] truncate">
                  {user.title}
                </p>
              </div>
              <button
                onClick={onLogout}
                className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-[9px] font-black uppercase tracking-[0.18em] transition-colors shrink-0"
              >
                <span className="material-symbols-outlined text-[16px]">logout</span>
                <span>Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
