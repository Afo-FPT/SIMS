
'use client';

import React, { useState, useEffect } from 'react';
import LandingPage from './app/page';
import LoginPage from './app/login/page';
import RequestPage from './app/request/page';
import DashboardLayout from './app/dashboard/layout';
import DashboardPage from './app/dashboard/page';
import InventoryPage from './app/dashboard/inventory/page';
import AIChatPage from './app/dashboard/ai-chat/page';
import AILayoutPage from './app/dashboard/ai-layout/page';
import WarehousesPage from './app/dashboard/warehouses/page';
import LogsPage from './app/dashboard/logs/page';
import ConfigPage from './app/dashboard/config/page';
import TasksPage from './app/dashboard/tasks/page';
import BillingPage from './app/dashboard/billing/page';
import UsersPage from './app/dashboard/users/page';
import ShipmentsPage from './app/dashboard/shipments/page';
import DocumentsPage from './app/dashboard/documents/page';
import ScannerPage from './app/dashboard/scanner/page';
import TransfersPage from './app/dashboard/transfers/page';
import PerformancePage from './app/dashboard/performance/page';
import ReportsPage from './app/dashboard/reports/page';

const App: React.FC = () => {
  const [currentPath, setCurrentPath] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const handleLocationChange = () => {
      const rawPath = window.location.pathname;
      const normalizedPath = rawPath === '/' ? '/' : rawPath.replace(/\/$/, '');
      setCurrentPath(normalizedPath);
    };

    window.addEventListener('popstate', handleLocationChange);
    handleLocationChange();
    setIsInitialized(true);

    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  if (!isInitialized || currentPath === null) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="size-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Routing Logic
  if (currentPath === '/' || currentPath === '') return <LandingPage />;
  if (currentPath === '/login') return <LoginPage />;
  if (currentPath === '/request') return <RequestPage />;

  if (currentPath.startsWith('/dashboard')) {
    const renderDashboardContent = () => {
      switch (currentPath) {
        case '/dashboard/inventory': return <InventoryPage />;
        case '/dashboard/ai-chat': return <AIChatPage />;
        case '/dashboard/ai-layout': return <AILayoutPage />;
        case '/dashboard/warehouses': return <WarehousesPage />;
        case '/dashboard/logs': return <LogsPage />;
        case '/dashboard/config': return <ConfigPage />;
        case '/dashboard/tasks': return <TasksPage />;
        case '/dashboard/billing': return <BillingPage />;
        case '/dashboard/users': return <UsersPage />;
        case '/dashboard/shipments': return <ShipmentsPage />;
        case '/dashboard/documents': return <DocumentsPage />;
        case '/dashboard/scanner': return <ScannerPage />;
        case '/dashboard/transfers': return <TransfersPage />;
        case '/dashboard/performance': return <PerformancePage />;
        case '/dashboard/reports': return <ReportsPage />;
        case '/dashboard':
        default: return <DashboardPage />;
      }
    };

    // Explicitly pass children as a prop to satisfy TypeScript requirements in strict environments
    return (
      <DashboardLayout children={renderDashboardContent()} />
    );
  }

  return <LandingPage />;
};

export default App;
