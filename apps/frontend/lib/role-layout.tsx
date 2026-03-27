
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { AiChatWidget } from '../components/AiChatWidget';
import { Persona, User } from '../types';
import { useToastHelpers } from './toast';

interface RoleLayoutProps {
  children: React.ReactNode;
  requiredRole: Persona;
}

export default function RoleLayout({ children, requiredRole }: RoleLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToastHelpers();
  const [persona, setPersona] = useState<Persona>(requiredRole);
  const [loading, setLoading] = useState(true);
  const [userTick, setUserTick] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const savedRole = localStorage.getItem('sws_persona') as Persona;
    const isVerified = localStorage.getItem('sws_verified') === 'true';

    if (savedRole === requiredRole && isVerified) {
      setPersona(savedRole);
    } else {
      localStorage.removeItem('sws_persona');
      localStorage.removeItem('sws_email');
      localStorage.removeItem('sws_verified');
      router.push('/login');
    }
    setLoading(false);
  }, [router, requiredRole]);

  useEffect(() => {
    const v = localStorage.getItem('sws_sidebar_collapsed');
    setSidebarCollapsed(v === 'true');

    const onStorage = (e: StorageEvent) => {
      if (e.key === 'sws_avatar' || e.key === 'sws_name' || e.key === 'sws_title') {
        setUserTick((x) => x + 1);
      }
      if (e.key === 'sws_sidebar_collapsed') {
        setSidebarCollapsed(e.newValue === 'true');
      }
    };

    const onProfileUpdated = () => setUserTick((x) => x + 1);

    window.addEventListener('storage', onStorage);
    window.addEventListener('sws:profile-updated', onProfileUpdated as any);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('sws:profile-updated', onProfileUpdated as any);
    };
  }, []);

  const handleToggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('sws_sidebar_collapsed', String(next));
      return next;
    });
  };

  const handleNavigate = (view: string) => {
    const rolePrefix = requiredRole.toLowerCase();
    const pathMap: Record<string, string> = {
      'DASHBOARD': 'dashboard',
      'RENT_REQUESTS': 'rent-requests',
      'CONTRACTS': 'contracts',
      'PACKAGES': 'packages',
      'SERVICE_REQUESTS': 'service-requests',
      'INVENTORY': 'inventory',
      'WAREHOUSE_SERVICES': 'warehouse-services',
      'TASKS': 'tasks',
      'WAREHOUSES': 'warehouses',
      'REPORTS': 'reports',
      'USERS': 'users',
      'LOGS': 'logs',
      'SCANNER': 'scanner',
      'SHIPMENTS': 'shipments',
      'BILLING': 'billing',
      'DOCUMENTS': 'documents',
      'AI_CHAT': 'ai-chat',
      'AI_LAYOUT': 'ai-layout',
      'PERFORMANCE': 'performance',
      'CONFIG': 'config',
      'SETTINGS': 'settings',
      'HISTORY': 'history',
      'INBOUND_REQUESTS': 'inbound-requests',
      'OUTBOUND_REQUESTS': 'outbound-requests',
      'CYCLE_COUNT': 'cycle-count',
      'REPORT_ISSUE': 'report-issue',
      'NOTIFICATIONS': 'notifications',
    };

    const targetPath = pathMap[view] || view.toLowerCase();
    const target = `/${rolePrefix}/${targetPath}`;

    router.push(target);
  };

  const handleLogout = () => {
    localStorage.removeItem('sws_persona');
    localStorage.removeItem('sws_email');
    localStorage.removeItem('sws_name');
    localStorage.removeItem('sws_title');
    localStorage.removeItem('sws_avatar');
    localStorage.removeItem('sws_verified');
    sessionStorage.clear();
    toast.info('Logged out successfully');
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="size-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const getUserData = (): User => {
    const email = localStorage.getItem('sws_email') || '';
    const name = localStorage.getItem('sws_name') || '';
    const title = localStorage.getItem('sws_title') || '';
    const avatar = localStorage.getItem('sws_avatar') || '';

    const idPrefix = requiredRole === 'ADMIN' ? 'ADM' : requiredRole === 'MANAGER' ? 'MGR' : requiredRole === 'STAFF' ? 'OP' : 'CUST';
    const id = `${idPrefix}-${email.split('@')[0].toUpperCase().slice(0, 3)}`;

    return {
      id,
      name: name || email.split('@')[0],
      email,
      role: requiredRole,
      avatar: avatar || `https://picsum.photos/seed/${requiredRole.toLowerCase()}/100/100`,
      title: title || (requiredRole === 'ADMIN' ? 'System Architect' : requiredRole === 'MANAGER' ? 'Regional Ops Manager' : requiredRole === 'STAFF' ? 'Warehouse Lead' : 'Account Owner')
    };
  };

  // Re-evaluate user data when profile changes in localStorage
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _ = userTick;
  const user = getUserData();
  const pathParts = pathname.split('/');
  const lastPart = pathParts[pathParts.length - 1] || 'dashboard';

  const reverseMap: Record<string, string> = {
    'dashboard': 'DASHBOARD',
    'rent-requests': 'RENT_REQUESTS',
    'contracts': 'CONTRACTS',
    'packages': 'PACKAGES',
    'service-requests': 'SERVICE_REQUESTS',
    'inventory': 'INVENTORY',
    'warehouse-services': 'WAREHOUSE_SERVICES',
    'cycle-count': 'CYCLE_COUNT',
    'tasks': 'TASKS',
    'warehouses': 'WAREHOUSES',
    'reports': 'REPORTS',
    'users': 'USERS',
    'logs': 'LOGS',
    'scanner': 'SCANNER',
    'shipments': 'SHIPMENTS',
    'billing': 'BILLING',
    'documents': 'DOCUMENTS',
    'ai-chat': 'AI_CHAT',
    'ai-layout': 'AI_LAYOUT',
    'performance': 'PERFORMANCE',
    'config': 'CONFIG',
    'settings': 'SETTINGS',
    'history': 'HISTORY',
    'inbound-requests': 'INBOUND_REQUESTS',
    'outbound-requests': 'OUTBOUND_REQUESTS',
    'notifications': 'NOTIFICATIONS',
  };

  let activeView = reverseMap[lastPart] || 'DASHBOARD';
  if (pathname.includes('/contracts')) activeView = 'CONTRACTS';
  else if (pathname.includes('/tasks')) activeView = 'TASKS';
  else if (pathname.includes('/cycle-count')) activeView = 'CYCLE_COUNT';

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans">
      <Sidebar
        persona={persona}
        activeView={activeView}
        onNavigate={handleNavigate}
        user={user}
        onLogout={handleLogout}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={handleToggleSidebar}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header activeView={activeView} persona={persona} />
        <main className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-10">
          <div className="max-w-[1600px] mx-auto animate-in fade-in duration-500">
            {children}
          </div>
        </main>
      </div>
      <AiChatWidget />
    </div>
  );
}
