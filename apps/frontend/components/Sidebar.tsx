
import React from 'react';
import { Persona, User } from '../types';

interface SidebarProps {
  persona: Persona;
  activeView: string;
  onNavigate: (view: string) => void;
  user: User | null;
  onLogout: () => void;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ persona, activeView, onNavigate, user, onLogout, collapsed = false, onToggleCollapsed }) => {
  const getSections = () => {
    switch (persona) {
      case 'ADMIN':
        return [
          {
            section: 'System', items: [
              { id: 'DASHBOARD', label: 'Overview', icon: 'dashboard' },
              { id: 'USERS', label: 'Users', icon: 'people' },
              { id: 'LOGS', label: 'Logs', icon: 'description' },
              { id: 'REPORTS', label: 'Reports', icon: 'monitoring' },
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
              { id: 'PACKAGES', label: 'Contract Packages', icon: 'category' },
            ]
          },
          {
            section: 'Operations', items: [
              { id: 'INBOUND_REQUESTS', label: 'Assign Inbound Tasks', icon: 'inbox' },
              { id: 'OUTBOUND_REQUESTS', label: 'Assign Outbound Tasks', icon: 'outbox' },
              { id: 'TASKS', label: 'Tasks', icon: 'assignment_turned_in' },
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
            section: 'Overview', items: [
              { id: 'DASHBOARD', label: 'Dashboard', icon: 'dashboard' },
            ]
          },
          {
            section: 'Work', items: [
              { id: 'TASKS', label: 'Tasks', icon: 'assignment' },
              { id: 'INBOUND_REQUESTS', label: 'Inbound Putaway', icon: 'inbox' },
              { id: 'OUTBOUND_REQUESTS', label: 'Outbound Picking', icon: 'outbox' },
              { id: 'CYCLE_COUNT', label: 'Cycle Count', icon: 'fact_check' },
              { id: 'SCANNER', label: 'Scanner', icon: 'barcode_scanner' },
            ]
          },
          {
            section: 'Operations', items: [
              { id: 'INVENTORY', label: 'Inventory Movement', icon: 'inventory_2' },
              { id: 'REPORT_ISSUE', label: 'Report Issue', icon: 'report_problem' },
              { id: 'NOTIFICATIONS', label: 'Notifications', icon: 'notifications' },
            ]
          },
          {
            section: 'Insights', items: [
              { id: 'HISTORY', label: 'History', icon: 'history' },
              { id: 'REPORTS', label: 'Reports', icon: 'monitoring' },
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
              { id: 'WAREHOUSE_SERVICES', label: 'Warehouse Services', icon: 'warehouse' },
            ]
          },
          {
            section: 'Requests', items: [
              { id: 'RENT_REQUESTS', label: 'Rent Requests', icon: 'request_quote' },
              { id: 'SERVICE_REQUESTS', label: 'Service Requests', icon: 'local_shipping' },
            ]
          },
          {
            section: 'Contracts & Insights', items: [
              { id: 'CONTRACTS', label: 'Contracts', icon: 'description' },
              { id: 'INVENTORY', label: 'Inventory', icon: 'inventory_2' },
              { id: 'HISTORY', label: 'History', icon: 'history' },
              { id: 'REPORTS', label: 'Reports', icon: 'monitoring' },
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
    <aside className={`${collapsed ? 'w-[88px]' : 'w-80'} bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0 shrink-0 z-50 transition-[width] duration-200`}>
      <div className={`${collapsed ? 'p-5' : 'p-8'} border-b border-slate-50 flex items-center gap-4`}>
        <div className="size-11 bg-primary rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-primary/30 group-hover:scale-110 transition-transform duration-500">
          <button
            type="button"
            className="inline-flex items-center justify-center w-full h-full"
            onClick={() => onNavigate('DASHBOARD')}
            title="Home"
          >
            <span className="material-symbols-outlined !text-2xl">warehouse</span>
          </button>
        </div>
        {!collapsed && (
          <div className="flex flex-col flex-1">
            <h1 className="text-slate-900 font-black text-xl tracking-tighter leading-none mb-1">SIMS-AI</h1>
            <p className="text-primary text-[10px] font-black uppercase tracking-[0.2em]">{persona} NODE</p>
          </div>
        )}
        {onToggleCollapsed && (
          <button
            type="button"
            onClick={onToggleCollapsed}
            className={`ml-auto inline-flex items-center justify-center ${collapsed ? 'size-9' : 'size-10'} rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors`}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <span className="material-symbols-outlined">{collapsed ? 'chevron_right' : 'chevron_left'}</span>
          </button>
        )}
      </div>

      <nav className={`flex-1 ${collapsed ? 'p-4' : 'p-6'} space-y-10 overflow-y-auto no-scrollbar`}>
        {sections.map((sec, i) => (
          <div key={i} className="space-y-3">
            {!collapsed && (
              <h3 className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{sec.section}</h3>
            )}
            <div className="space-y-1">
              {sec.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  title={collapsed ? item.label : undefined}
                  className={`w-full flex items-center ${collapsed ? 'justify-center' : ''} gap-4 ${collapsed ? 'px-0' : 'px-4'} py-3.5 rounded-2xl transition-all group relative ${activeView === item.id
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
                  {!collapsed && <span className="text-sm tracking-tight">{item.label}</span>}
                </button>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {user && (
        <div className={`${collapsed ? 'px-3 pb-4 pt-4' : 'px-5 pb-5 pt-4'} border-t border-slate-50`}>
          <div className="bg-primary text-white rounded-2xl px-4 py-3 shadow-lg shadow-primary/30 relative overflow-hidden group">
            <div className="relative z-10 flex items-center gap-3">
              <div className="relative shrink-0">
                <img
                  alt={user.name}
                  className="size-9 rounded-2xl object-cover border-2 border-white/10 shadow-sm transition-transform group-hover:scale-105"
                  src={user.avatar}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = `https://picsum.photos/seed/${user.role.toLowerCase()}/100/100`;
                  }}
                />
                <span className="absolute -bottom-1 -right-1 size-2.5 bg-emerald-500 rounded-full border-2 border-primary"></span>
              </div>
              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black truncate">{user.name}</p>
                  <p className="text-[9px] text-primary-light/90 bg-white/10 px-2 py-0.5 rounded-full font-bold uppercase tracking-[0.18em] truncate">
                    {user.title}
                  </p>
                </div>
              )}
              <button
                onClick={onLogout}
                title="Logout"
                className={`inline-flex items-center justify-center gap-1 ${collapsed ? 'px-2 py-2' : 'px-2.5 py-1.5'} bg-white/10 hover:bg-white/20 rounded-lg ${collapsed ? '' : 'text-[9px] font-black uppercase tracking-[0.18em]'} transition-colors shrink-0`}
              >
                <span className="material-symbols-outlined text-[16px]">logout</span>
                {!collapsed && <span>Out</span>}
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
