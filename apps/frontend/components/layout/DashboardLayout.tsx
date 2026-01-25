
import React from 'react';
import Sidebar from '../Sidebar';
import Header from '../Header';
import { Persona, User } from '../../types';

interface DashboardLayoutProps {
  children: React.ReactNode;
  persona: Persona;
  activeView: string;
  onNavigate: (view: string) => void;
  user: User | null;
  onLogout: () => void;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ 
  children, 
  persona, 
  activeView, 
  onNavigate, 
  user, 
  onLogout 
}) => {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans">
      <Sidebar 
        persona={persona} 
        activeView={activeView} 
        onNavigate={onNavigate} 
        user={user} 
        onLogout={onLogout}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header activeView={activeView} persona={persona} />
        <main className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-10">
          <div className="max-w-[1600px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
