import { redirect } from "next/navigation";
import { Clock3, ShieldAlert } from "lucide-react";
import { Logo } from "@/components/logo";
import { SignOutButton } from "@/components/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { getCurrentDbUser, homePathFor } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function PendingPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const user = await getCurrentDbUser();
  if (!user) redirect("/sign-in");
  if (user.status === "active") redirect(homePathFor(user));

  const params = await searchParams;
  const deactivated = params.state === "deactivated" || user.status === "deactivated";

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b border-border px-4 py-4 lg:px-8">
        <Logo href="/pending" />
        <ThemeToggle />
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-md rounded-lg border border-border bg-card p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-primary">
            {deactivated ? (
              <ShieldAlert className="h-6 w-6" />
            ) : (
              <Clock3 className="h-6 w-6" />
            )}
          </div>
          <h1 className="mt-5 text-xl font-bold text-foreground">
            {deactivated ? "Account deactivated" : "Waiting for approval"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {deactivated
              ? "Your account has been deactivated by an admin. Reach out to your team lead if you think this is a mistake."
              : "Your account is created. An admin needs to approve it before you can access the tracker."}
          </p>
          <p className="mt-4 text-xs text-muted-foreground">
            Signed in as {user.email}
          </p>
          <div className="mt-6 flex justify-center">
            <SignOutButton />
          </div>
        </div>
      </main>
    </div>
  );
}
