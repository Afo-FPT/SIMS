import { LucideIcon } from 'lucide-react';

export interface DashboardCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconColor: string;
  trend?: string;
}

export function DashboardCard({ title, value, icon: Icon, iconColor, trend }: DashboardCardProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-gray-600 mb-1">{title}</p>
          <h3 className="text-gray-900 mb-1">{value}</h3>
          {trend && (
            <p className="text-gray-500">{trend}</p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${iconColor}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}
