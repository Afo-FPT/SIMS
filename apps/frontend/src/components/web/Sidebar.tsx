import { 
  LayoutDashboard, 
  Package, 
  PackagePlus, 
  PackageMinus, 
  Archive, 
  ClipboardCheck, 
  Bell, 
  TrendingUp,
  User,
  LogOut
} from 'lucide-react';

export interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  userRole: 'admin' | 'staff';
}

export function Sidebar({ currentView, onNavigate, userRole }: SidebarProps) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'staff'] },
    { id: 'stock-in', label: 'Stock In', icon: PackagePlus, roles: ['admin', 'staff'] },
    { id: 'stock-out', label: 'Stock Out', icon: PackageMinus, roles: ['admin', 'staff'] },
    { id: 'products', label: 'Products', icon: Package, roles: ['admin'] },
    { id: 'batches', label: 'Batches', icon: Archive, roles: ['admin', 'staff'] },
    { id: 'cycle-count', label: 'Cycle Count', icon: ClipboardCheck, roles: ['admin', 'staff'] },
    { id: 'alerts', label: 'Alerts', icon: Bell, roles: ['admin', 'staff'] },
    { id: 'forecast', label: 'AI Forecast', icon: TrendingUp, roles: ['admin'] },
  ];

  const filteredNavItems = navItems.filter(item => item.roles.includes(userRole));

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen">
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-blue-600">SIMS-AI</h1>
        <p className="text-gray-600">Smart Inventory</p>
      </div>
      
      <nav className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-1">
          {filteredNavItems.map(item => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                currentView === item.id
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center gap-3 px-4 py-3 mb-2">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
            <User className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <p className="text-gray-900">{userRole === 'admin' ? 'Admin User' : 'Staff User'}</p>
            <p className="text-gray-500 capitalize">{userRole}</p>
          </div>
        </div>
        <button 
          onClick={() => onNavigate('login')}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100"
        >
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}
