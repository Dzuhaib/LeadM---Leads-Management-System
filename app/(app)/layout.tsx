import { AppShell } from "@/components/app-shell";
import { requireActiveUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireActiveUser();

  return (
    <AppShell
      user={{
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
      }}
    >
      {children}
    </AppShell>
  );
}
