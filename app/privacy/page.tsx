import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Privacy and messaging rules",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <div className="flex items-center justify-between gap-3">
        <Logo />
        <Button asChild variant="outline" size="sm">
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
            Back to app
          </Link>
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-primary">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Privacy and messaging rules
          </h1>
          <p className="text-sm text-muted-foreground">
            How this lead tracker should be used responsibly.
          </p>
        </div>
      </div>

      <section className="space-y-4 rounded-lg border border-border bg-card p-5 text-sm leading-6 text-foreground">
        <div className="space-y-1">
          <h2 className="font-semibold">Data we store</h2>
          <p className="text-muted-foreground">
            The workspace stores business contact details you enter, your
            outreach activity, reply notes, tags and account information such as
            name and email. Only add the client data you need for legitimate
            outreach.
          </p>
        </div>

        <div className="space-y-1">
          <h2 className="font-semibold">How it is used</h2>
          <p className="text-muted-foreground">
            Data is used to track follow-ups, calculate team dashboards and
            produce the exports you request. Access is limited to the employee
            who owns a lead and the workspace admin. Exports contain personal
            data and must be stored securely.
          </p>
        </div>

        <div className="space-y-1">
          <h2 className="font-semibold">Lawful outreach</h2>
          <p className="text-muted-foreground">
            You must comply with the privacy, data-protection, anti-spam and
            electronic-messaging laws of every country you contact. Only message
            people where you have a lawful basis, honour opt-out requests
            immediately, and do not import purchased or scraped lists unless
            your use is permitted.
          </p>
        </div>

        <div className="space-y-1">
          <h2 className="font-semibold">Retention and deletion</h2>
          <p className="text-muted-foreground">
            Leads are soft-deleted so the team can audit changes and reassign
            work. Ask the workspace admin to remove data that is no longer
            needed for outreach or legal record-keeping.
          </p>
        </div>

        <div className="space-y-1">
          <h2 className="font-semibold">Contact</h2>
          <p className="text-muted-foreground">
            For privacy requests, contact the workspace admin responsible for
            this deployment. They control the database and the accounts.
          </p>
        </div>
      </section>

      <p className="text-xs text-muted-foreground">
        This notice is a practical starting point, not legal advice. Have your
        own counsel review it for the jurisdictions you operate in.
      </p>
    </main>
  );
}
