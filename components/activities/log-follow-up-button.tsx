"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { logFollowUp } from "@/actions/activities";

export function LogFollowUpButton({
  leadId,
  label = "Mark follow-up sent",
  ...buttonProps
}: { leadId: string; label?: string } & Omit<ButtonProps, "onClick">) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await logFollowUp({ leadId });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Follow-up logged.");
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      size="sm"
      onClick={handleClick}
      disabled={pending}
      {...buttonProps}
    >
      <Send className="h-3.5 w-3.5" />
      {pending ? "Saving…" : label}
    </Button>
  );
}
