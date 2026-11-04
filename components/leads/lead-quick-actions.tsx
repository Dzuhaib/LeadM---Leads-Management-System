"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  BadgeCheck,
  CalendarCheck,
  FileText,
  MessageSquareReply,
  MoreHorizontal,
  Send,
  ThumbsDown,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogReplyDialog } from "@/components/activities/log-reply-dialog";
import { logFirstMessage, logFollowUp, logMilestone } from "@/actions/activities";

export function LeadQuickActions({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [replyOpen, setReplyOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  function run(
    action: () => Promise<{ ok: boolean; error?: string }>,
    successMessage: string,
  ) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(result.error ?? "Something went wrong.");
        return;
      }
      toast.success(successMessage);
      router.refresh();
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Lead actions"
            disabled={pending}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Log activity</DropdownMenuLabel>
          <DropdownMenuItem
            onSelect={() =>
              run(
                () => logFirstMessage({ leadId }),
                "First message logged.",
              )
            }
          >
            <Send className="h-3.5 w-3.5" />
            Log first message
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() =>
              run(() => logFollowUp({ leadId }), "Follow-up logged.")
            }
          >
            <CalendarCheck className="h-3.5 w-3.5" />
            Log follow-up (auto)
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              setReplyOpen(true);
            }}
          >
            <MessageSquareReply className="h-3.5 w-3.5" />
            Log reply
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Milestones</DropdownMenuLabel>
          <DropdownMenuItem
            onSelect={() =>
              run(
                () => logMilestone({ leadId, type: "call_booked" }),
                "Call booked.",
              )
            }
          >
            <CalendarCheck className="h-3.5 w-3.5" />
            Book call
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() =>
              run(
                () => logMilestone({ leadId, type: "proposal_sent" }),
                "Proposal marked as sent.",
              )
            }
          >
            <FileText className="h-3.5 w-3.5" />
            Mark proposal sent
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() =>
              run(() => logMilestone({ leadId, type: "won" }), "Marked as won.")
            }
          >
            <Trophy className="h-3.5 w-3.5" />
            Mark won
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() =>
              run(() => logMilestone({ leadId, type: "lost" }), "Marked as lost.")
            }
          >
            <ThumbsDown className="h-3.5 w-3.5" />
            Mark lost
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() =>
              run(
                () => logMilestone({ leadId, type: "note" }),
                "Note activity logged.",
              )
            }
          >
            <BadgeCheck className="h-3.5 w-3.5" />
            Log note activity
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <LogReplyDialog leadId={leadId} open={replyOpen} onOpenChange={setReplyOpen} />
    </>
  );
}
