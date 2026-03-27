
import RoleLayout from '../../lib/role-layout';

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RoleLayout requiredRole="CUSTOMER">{children}</RoleLayout>;
}
