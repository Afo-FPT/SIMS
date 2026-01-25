
'use client';

import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import Header from '../../components/Header';
import { Persona, User } from '../../types';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [persona, setPersona] = useState<Persona>('STAFF');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedRole = localStorage.getItem('sws_persona') as Persona;
    if (savedRole) {
      setPersona(savedRole);
    } else {
      window.location.href = '/login';
    }
    setLoading(false);
  }, []);

  const handleNavigate = (view: string) => {
    const pathMap: Record<string, string> = {
      'DASHBOARD': '',
      'AI_CHAT': 'ai-chat',
      'AI_LAYOUT': 'ai-layout',
      'WAREHOUSES': 'warehouses',
      'LOGS': 'logs',
      'CONFIG': 'config',
      'INVENTORY': 'inventory',
      'TASKS': 'tasks',
      'BILLING': 'billing',
      'USERS': 'users',
      'SHIPMENTS': 'shipments',
      'DOCUMENTS': 'documents',
      'SCANNER': 'scanner',
      'TRANSFERS': 'transfers',
      'PERFORMANCE': 'performance',
      'REPORTS': 'reports'
    };
    
    const targetPath = pathMap[view] !== undefined ? pathMap[view] : view.toLowerCase();
    const target = `/dashboard${targetPath ? '/' + targetPath : ''}`;
    
    window.history.pushState({}, '', target);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const handleLogout = () => {
    localStorage.removeItem('sws_persona');
    window.location.href = '/';
  };

  if (loading) return null;

  const getUserData = (): User => {
    switch(persona) {
      case 'ADMIN': return { id: 'ADM-01', name: 'John Doe', email: 'admin@sws.ai', role: 'ADMIN', avatar: 'https://picsum.photos/seed/admin/100/100', title: 'System Architect' };
      case 'MANAGER': return { id: 'MGR-05', name: 'Sarah Miller', email: 'sarah@sws.ai', role: 'MANAGER', avatar: 'https://picsum.photos/seed/manager/100/100', title: 'Regional Ops Manager' };
      case 'STAFF': return { id: 'OP-122', name: 'Mike Sterling', email: 'mike@sws.ai', role: 'STAFF', avatar: 'https://picsum.photos/seed/staff/100/100', title: 'Warehouse Lead' };
      case 'CUSTOMER': return { id: 'CUST-88', name: 'Alex Sterling', email: 'alex@enterprise.com', role: 'CUSTOMER', avatar: 'https://picsum.photos/seed/customer/100/100', title: 'Account Owner' };
      default: return { id: 'GUEST', name: 'Guest', email: '', role: 'STAFF', avatar: '', title: '' };
    }
  };

  const user = getUserData();
  const rawPath = window.location.pathname;
  const pathParts = rawPath.split('/');
  const lastPart = pathParts[pathParts.length - 1];
  
  const reverseMap: Record<string, string> = {
    'ai-chat': 'AI_CHAT',
    'ai-layout': 'AI_LAYOUT',
    'warehouses': 'WAREHOUSES',
    'logs': 'LOGS',
    'config': 'CONFIG',
    'inventory': 'INVENTORY',
    'tasks': 'TASKS',
    'billing': 'BILLING',
    'users': 'USERS',
    'shipments': 'SHIPMENTS',
    'documents': 'DOCUMENTS',
    'scanner': 'SCANNER',
    'transfers': 'TRANSFERS',
    'performance': 'PERFORMANCE',
    'reports': 'REPORTS',
    'dashboard': 'DASHBOARD'
  };
  
  const activeView = reverseMap[lastPart] || 'DASHBOARD';

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans">
      <Sidebar 
        persona={persona} 
        activeView={activeView} 
        onNavigate={handleNavigate} 
        user={user}
        onLogout={handleLogout}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header activeView={activeView} persona={persona} />
        <main className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-10">
          <div className="max-w-[1600px] mx-auto animate-in fade-in duration-500">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
