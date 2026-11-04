import { PageHeader } from "@/components/page-header";
import { ProfilePanel } from "@/components/profile/profile-panel";
import { requireActiveUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await requireActiveUser();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Your profile"
        description="Change your photo, name or password. Updates are saved to your account."
      />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <ProfilePanel />
        <aside className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground">Account</h2>
          <dl className="mt-4 space-y-4 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Name</dt>
              <dd className="mt-1 font-medium text-foreground">
                {user.fullName || "Not set"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Email</dt>
              <dd className="mt-1 break-all font-medium text-foreground">
                {user.email}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Role</dt>
              <dd className="mt-1 font-medium capitalize text-foreground">
                {user.role}
              </dd>
            </div>
          </dl>
          <p className="mt-5 border-t border-border pt-4 text-xs text-muted-foreground">
            Photo, name and password are managed securely through Clerk.
          </p>
        </aside>
      </div>
    </div>
  );
}
