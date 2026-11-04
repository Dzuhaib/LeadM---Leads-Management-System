"use client";

import * as React from "react";
import { useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const { signOut } = useClerk();
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  return (
    <Button
      type="button"
      variant="outline"
      onClick={async () => {
        setPending(true);
        try {
          await signOut();
          router.push("/sign-in");
        } finally {
          setPending(false);
        }
      }}
      disabled={pending}
    >
      <LogOut className="h-4 w-4" />
      Sign out
    </Button>
  );
}
