
import RoleLayout from '../../lib/role-layout';

export default function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RoleLayout requiredRole="MANAGER">{children}</RoleLayout>;
}
