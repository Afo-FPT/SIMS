export interface StatusBadgeProps {
  status: 'normal' | 'low-stock' | 'near-expiry' | 'expired' | 'new' | 'read';
  children: React.ReactNode;
}

export function StatusBadge({ status, children }: StatusBadgeProps) {
  const statusStyles = {
    'normal': 'bg-green-100 text-green-700 border-green-200',
    'low-stock': 'bg-orange-100 text-orange-700 border-orange-200',
    'near-expiry': 'bg-yellow-100 text-yellow-700 border-yellow-200',
    'expired': 'bg-red-100 text-red-700 border-red-200',
    'new': 'bg-blue-100 text-blue-700 border-blue-200',
    'read': 'bg-gray-100 text-gray-600 border-gray-200',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full border ${statusStyles[status]}`}>
      {children}
    </span>
  );
}
