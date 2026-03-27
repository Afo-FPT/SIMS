
import RoleLayout from '../../lib/role-layout';

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RoleLayout requiredRole="STAFF">{children}</RoleLayout>;
}
