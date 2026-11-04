import { SignIn } from "@clerk/nextjs";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

export const dynamic = "force-dynamic";

export default function SignInPage() {
  const configured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between bg-[#1B1033] p-10 text-white lg:flex">
        <Logo href="/" />
        <div className="space-y-4">
          <p className="inline-flex w-fit rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
            Outreach workspace
          </p>
          <h1 className="max-w-md text-4xl font-extrabold leading-tight">
            Every message, follow-up and reply in one place.
          </h1>
          <p className="max-w-md text-sm text-white/70">
            Track LinkedIn, WhatsApp and Facebook outreach, keep follow-ups on
            schedule, and see exactly how the team is performing each day.
          </p>
        </div>
        <p className="text-xs text-white/50">
          AIVized Lead Tracker · built for the AIVized team
        </p>
      </div>
      <div className="flex flex-col">
        <header className="flex items-center justify-between p-4 lg:justify-end">
          <div className="lg:hidden">
            <Logo href="/" />
          </div>
          <ThemeToggle />
        </header>
        <main className="flex flex-1 items-center justify-center px-4 pb-12">
          {configured ? (
            <SignIn />
          ) : (
            <div className="max-w-sm rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
              Clerk is not configured. Add{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
              </code>{" "}
              and{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                CLERK_SECRET_KEY
              </code>{" "}
              to your environment to enable sign-in.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
