import { ReactNode } from 'react';
import { ArrowLeft, Home, QrCode, User } from 'lucide-react';

interface MobileLayoutProps {
  children: ReactNode;
  title: string;
  onBack?: () => void;
  currentView: string;
  onNavigate: (view: string) => void;
}

export function MobileLayout({ children, title, onBack, currentView, onNavigate }: MobileLayoutProps) {
  return (
    <div className="max-w-md mx-auto bg-white min-h-screen flex flex-col">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4 flex items-center gap-4">
        {onBack && (
          <button onClick={onBack} className="p-1">
            <ArrowLeft className="w-6 h-6" />
          </button>
        )}
        <h1 className="flex-1">{title}</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>

      {/* Bottom Navigation */}
      <div className="border-t border-gray-200 bg-white">
        <div className="grid grid-cols-3 gap-1 p-2">
          <button
            onClick={() => onNavigate('mobile-home')}
            className={`flex flex-col items-center gap-1 py-3 rounded-lg ${
              currentView === 'mobile-home' 
                ? 'bg-blue-50 text-blue-600' 
                : 'text-gray-600'
            }`}
          >
            <Home className="w-6 h-6" />
            <span className="text-xs">Home</span>
          </button>
          <button
            onClick={() => onNavigate('mobile-scan')}
            className={`flex flex-col items-center gap-1 py-3 rounded-lg ${
              currentView === 'mobile-scan' 
                ? 'bg-blue-50 text-blue-600' 
                : 'text-gray-600'
            }`}
          >
            <QrCode className="w-6 h-6" />
            <span className="text-xs">Scan</span>
          </button>
          <button
            onClick={() => onNavigate('mobile-home')}
            className="flex flex-col items-center gap-1 py-3 rounded-lg text-gray-600"
          >
            <User className="w-6 h-6" />
            <span className="text-xs">Profile</span>
          </button>
        </div>
      </div>
    </div>
  );
}
