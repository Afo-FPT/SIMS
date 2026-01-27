
import RoleLayout from '../../lib/role-layout';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RoleLayout requiredRole="ADMIN">{children}</RoleLayout>;
}
