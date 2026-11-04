import { SignUp } from "@clerk/nextjs";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

export const dynamic = "force-dynamic";

export default function SignUpPage() {
  const configured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between bg-black p-10 text-white lg:flex">
        <Logo href="/" />
        <div className="space-y-4">
          <p className="inline-flex w-fit rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
            Join the team
          </p>
          <h1 className="max-w-md text-4xl font-semibold leading-tight">
            Turn consistent outreach into booked calls.
          </h1>
          <p className="max-w-md text-sm text-white/70">
            Create your account to log first messages, follow-ups and replies.
            An admin approves access when approval is required.
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
        <main className="flex flex-1 flex-col items-center justify-center px-4 pb-12">
          <div className="mb-6 flex flex-col items-center gap-2 text-center">
            <Logo href="/" showText={false} size={56} />
            <p className="text-base font-semibold text-foreground">
              AIVized Lead Tracker
            </p>
          </div>
          {configured ? (
            <SignUp />
          ) : (
            <div className="max-w-sm rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
              Clerk is not configured. Add your Clerk keys to the environment to
              enable sign-up.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
