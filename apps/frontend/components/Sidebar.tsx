
import React from 'react';
import Link from 'next/link';
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
              { id: 'CONFIG', label: 'Config', icon: 'tune' },
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
              { id: 'INBOUND_REQUESTS', label: 'Inbound Tasks', icon: 'inbox' },
              { id: 'OUTBOUND_REQUESTS', label: 'Outbound Tasks', icon: 'outbox' },
              { id: 'TASKS', label: 'Tasks', icon: 'assignment_turned_in' },
              { id: 'CYCLE_COUNT', label: 'Cycle Count', icon: 'fact_check' },
              { id: 'WAREHOUSES', label: 'Warehouses', icon: 'warehouse' },
              { id: 'STAFFS', label: 'Staffs', icon: 'group' },
            ]
          },
          {
            section: 'Reports', items: [
              { id: 'REPORTS', label: 'Reports', icon: 'monitoring' },
              { id: 'PAYMENTS', label: 'Payments', icon: 'payments' },
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
              { id: 'INBOUND_REQUESTS', label: 'Inbound Putaway', icon: 'inbox' },
              { id: 'OUTBOUND_REQUESTS', label: 'Outbound Picking', icon: 'outbox' },
              { id: 'CYCLE_COUNT', label: 'Cycle Count', icon: 'fact_check' },
            ]
          },
          {
            section: 'Operations', items: [
              { id: 'TASKS', label: 'Tasks', icon: 'assignment' },
            ]
          },
          {
            section: 'Insights', items: [
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
            ]
          },
          {
            section: 'Requests', items: [
              { id: 'RENT_REQUESTS', label: 'Rent Requests', icon: 'request_quote' },
              { id: 'SERVICE_REQUESTS', label: 'Service Requests', icon: 'local_shipping' },
            ]
          },
          {
            section: 'Contracts', items: [
              { id: 'CONTRACTS', label: 'Contracts', icon: 'description' },
              { id: 'INVENTORY', label: 'Inventory', icon: 'inventory_2' },
              { id: 'HISTORY', label: 'History', icon: 'history' },
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
      default:
        return [];
    }
  };

  const sections = getSections();

  return (
    <aside
      className={`${
        collapsed ? 'w-20' : 'w-80'
      } relative flex h-screen shrink-0 flex-col border-r border-slate-200/90 bg-white shadow-[4px_0_24px_-12px_rgba(15,23,42,0.06)] transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] sticky top-0 z-50`}
    >
      <div
        className={`border-b border-slate-100/90 ${
          collapsed
            ? 'flex flex-col items-center gap-3 px-2.5 py-4'
            : 'flex items-center gap-3 px-6 py-5'
        }`}
      >
        <Link
          href="/"
          className={`group flex min-w-0 items-center rounded-2xl transition-colors hover:bg-slate-50/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 ${
            collapsed ? 'justify-center p-1.5' : 'flex-1 gap-4 p-1'
          }`}
          title="Back to homepage"
        >
          <div
            className={`flex shrink-0 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/25 transition-transform duration-300 group-hover:scale-[1.03] ${
              collapsed ? 'size-10' : 'size-11'
            }`}
          >
            <span className="material-symbols-outlined !text-[22px]">warehouse</span>
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1 flex-col">
              <h1 className="mb-0.5 text-xl font-black leading-none tracking-tighter text-slate-900">SIMS-AI</h1>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">{persona} NODE</p>
            </div>
          )}
        </Link>
        {onToggleCollapsed && (
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-expanded={!collapsed}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={`inline-flex shrink-0 items-center justify-center rounded-xl border border-slate-200/90 bg-white text-slate-500 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 hover:shadow active:scale-[0.97] ${
              collapsed ? 'size-9' : 'size-9'
            }`}
          >
            <span className="material-symbols-outlined text-[20px] !leading-none">
              {collapsed ? 'chevron_right' : 'chevron_left'}
            </span>
          </button>
        )}
      </div>

      <nav className={`flex-1 space-y-8 overflow-y-auto no-scrollbar ${collapsed ? 'px-2 py-4' : 'space-y-10 px-4 py-5'}`}>
        {sections.map((sec, i) => (
          <div key={i} className="space-y-3">
            {!collapsed && (
              <h3 className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{sec.section}</h3>
            )}
            <div className="space-y-1">
              {sec.items.map((item) => {
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onNavigate(item.id)}
                    title={collapsed ? item.label : undefined}
                    className={`group relative flex w-full items-center rounded-2xl py-3 transition-all ${
                      collapsed ? 'justify-center px-0' : 'gap-4 px-4'
                    } ${
                      isActive
                        ? collapsed
                          ? 'bg-primary/10 text-primary ring-1 ring-primary/15'
                          : 'bg-primary/5 font-bold text-primary'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    {isActive && !collapsed && (
                      <div className="absolute bottom-3 left-0 top-3 w-1 rounded-r-full bg-primary" />
                    )}
                    <span
                      className={`material-symbols-outlined text-[24px] transition-colors ${
                        isActive ? 'text-primary' : 'text-slate-400 group-hover:text-primary'
                      }`}
                    >
                      {item.icon}
                    </span>
                    {!collapsed && <span className="text-sm tracking-tight">{item.label}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {user && (
        <div className={`border-t border-slate-100/90 ${collapsed ? 'px-2 pb-4 pt-3' : 'px-5 pb-6 pt-4'}`}>
          <div
            className={`relative overflow-hidden rounded-2xl bg-primary text-white shadow-lg shadow-primary/25 ${
              collapsed ? 'flex justify-center px-2 py-2.5' : 'px-4 py-3'
            } group`}
          >
            <div className={`relative z-10 flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
              <div className="relative shrink-0" title={collapsed ? `${user.name} · ${user.title}` : undefined}>
                <img
                  alt={user.name}
                  className={`rounded-2xl border-2 border-white/10 object-cover shadow-sm transition-transform group-hover:scale-105 ${
                    collapsed ? 'size-8' : 'size-9'
                  }`}
                  src={user.avatar}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = `https://picsum.photos/seed/${user.role.toLowerCase()}/100/100`;
                  }}
                />
                <span className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full border-2 border-primary bg-emerald-500"></span>
              </div>
              {!collapsed && (
                <>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-black">{user.name}</p>
                    <p className="truncate rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-primary-light/90">
                      {user.title}
                    </p>
                  </div>
                  <button
                    onClick={onLogout}
                    title="Logout"
                    type="button"
                    className="inline-flex shrink-0 items-center justify-center gap-1 rounded-lg bg-white/10 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.18em] transition-colors hover:bg-white/20"
                  >
                    <span className="material-symbols-outlined text-[16px]">logout</span>
                    <span>Out</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
