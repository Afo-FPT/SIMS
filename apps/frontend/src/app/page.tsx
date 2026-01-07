'use client';

import { useState } from 'react';
import { LoginScreen } from '../components/web/LoginScreen';
import { Sidebar } from '../components/web/Sidebar';
import { Dashboard } from '../components/web/Dashboard';
import { StockInScreen } from '../components/web/StockInScreen';
import { StockOutScreen } from '../components/web/StockOutScreen';
import { ProductManagement } from '../components/web/ProductManagement';
import { BatchManagement } from '../components/web/BatchManagement';
import { CycleCountScreen } from '../components/web/CycleCountScreen';
import { AlertManagement } from '../components/web/AlertManagement';
import { AIForecastDashboard } from '../components/web/AIForecastDashboard';
import { MobileHomeScreen } from '../components/mobile/MobileHomeScreen';
import { MobileScanScreen } from '../components/mobile/MobileScanScreen';
import { MobileProductDetail } from '../components/mobile/MobileProductDetail';
import { Smartphone, Monitor } from 'lucide-react';

type UserRole = 'admin' | 'staff' | null;
type View = 'login' | 'dashboard' | 'stock-in' | 'stock-out' | 'products' | 'batches' | 'cycle-count' | 'alerts' | 'forecast' | 'mobile-home' | 'mobile-scan' | 'mobile-detail';

export default function Page() {
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [currentView, setCurrentView] = useState<View>('login');
  const [appMode, setAppMode] = useState<'web' | 'mobile'>('web');

  const handleLogin = (role: 'admin' | 'staff') => {
    setUserRole(role);
    setCurrentView('dashboard');
  };

  const handleNavigate = (view: View) => {
    if (view === 'login') {
      setUserRole(null);
    }
    setCurrentView(view);
  };

  const switchToMobile = () => {
    setAppMode('mobile');
    setCurrentView('mobile-home');
  };

  const switchToWeb = () => {
    setAppMode('web');
    setCurrentView('login');
    setUserRole(null);
  };

  // Show login screen if not logged in
  if (currentView === 'login') {
    return (
      <div>
        <LoginScreen onLogin={handleLogin} />
        {/* Mode Switcher */}
        <div className="fixed bottom-6 right-6 flex gap-2">
          <button
            onClick={switchToMobile}
            className="bg-white rounded-lg shadow-lg p-3 hover:bg-gray-50 transition-colors border border-gray-200"
            title="Switch to Mobile App"
          >
            <Smartphone className="w-6 h-6 text-gray-700" />
          </button>
        </div>
      </div>
    );
  }

  // Mobile App
  if (appMode === 'mobile') {
    return (
      <div className="bg-gray-100 min-h-screen">
        {currentView === 'mobile-home' && <MobileHomeScreen onNavigate={handleNavigate} />}
        {currentView === 'mobile-scan' && <MobileScanScreen onNavigate={handleNavigate} />}
        {currentView === 'mobile-detail' && <MobileProductDetail onNavigate={handleNavigate} />}
        
        {/* Mode Switcher */}
        <div className="fixed bottom-20 right-6">
          <button
            onClick={switchToWeb}
            className="bg-white rounded-lg shadow-lg p-3 hover:bg-gray-50 transition-colors border border-gray-200"
            title="Switch to Web App"
          >
            <Monitor className="w-6 h-6 text-gray-700" />
          </button>
        </div>
      </div>
    );
  }

  // Web App
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar 
        currentView={currentView} 
        onNavigate={handleNavigate} 
        userRole={userRole || 'staff'}
      />
      
      <div className="flex-1 overflow-y-auto">
        {currentView === 'dashboard' && <Dashboard />}
        {currentView === 'stock-in' && <StockInScreen />}
        {currentView === 'stock-out' && <StockOutScreen />}
        {currentView === 'products' && <ProductManagement />}
        {currentView === 'batches' && <BatchManagement />}
        {currentView === 'cycle-count' && <CycleCountScreen />}
        {currentView === 'alerts' && <AlertManagement />}
        {currentView === 'forecast' && <AIForecastDashboard />}
      </div>

      {/* Mode Switcher */}
      <div className="fixed bottom-6 right-6">
        <button
          onClick={switchToMobile}
          className="bg-white rounded-lg shadow-lg p-3 hover:bg-gray-50 transition-colors border border-gray-200"
          title="Switch to Mobile App"
        >
          <Smartphone className="w-6 h-6 text-gray-700" />
        </button>
      </div>
    </div>
  );
}

