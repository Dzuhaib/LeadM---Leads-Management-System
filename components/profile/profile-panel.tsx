"use client";

import * as React from "react";
import { UserProfile } from "@clerk/nextjs";
import { syncProfileFromClerk } from "@/actions/profile";
import { clerkAppearance } from "@/lib/clerk-appearance";

export function ProfilePanel() {
  React.useEffect(() => {
    const sync = () => {
      void syncProfileFromClerk().catch(() => undefined);
    };

    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  return <UserProfile routing="hash" appearance={clerkAppearance} />;
}
