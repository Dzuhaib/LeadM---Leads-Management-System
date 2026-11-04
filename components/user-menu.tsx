"use client";

import * as React from "react";
import { useClerk } from "@clerk/nextjs";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { initials } from "@/lib/utils";

export function UserMenu({
  fullName,
  email,
  role,
  avatarUrl,
}: {
  fullName: string;
  email: string;
  role: "admin" | "employee";
  avatarUrl?: string | null;
}) {
  const { signOut } = useClerk();
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function handleSignOut() {
    setPending(true);
    try {
      await signOut();
      router.push("/sign-in");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt=""
          className="h-9 w-9 rounded-full object-cover"
        />
      ) : (
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">
          {initials(fullName, email)}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">
          {fullName || email}
        </p>
        <p className="truncate text-xs capitalize text-muted-foreground">
          {role}
        </p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Sign out"
        onClick={handleSignOut}
        disabled={pending}
      >
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );
}
