"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MessageSquareReply } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { logReply } from "@/actions/activities";
import { REPLY_TAGS, REPLY_TAG_LABELS, type ReplyTag } from "@/lib/constants";

export function LogReplyDialog({
  leadId,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: {
  leadId: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = React.useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [replyText, setReplyText] = React.useState("");
  const [replyTag, setReplyTag] = React.useState<ReplyTag>("interested");
  const [occurredAt, setOccurredAt] = React.useState("");
  const [pending, startTransition] = React.useTransition();

  function reset() {
    setReplyText("");
    setReplyTag("interested");
    setOccurredAt("");
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const result = await logReply({
        leadId,
        replyText,
        replyTag,
        occurredAt: occurredAt || undefined,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Reply logged. Follow-ups stopped.");
      setOpen(false);
      reset();
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {controlledOpen === undefined ? (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button type="button" variant="outline" size="sm">
              <MessageSquareReply className="h-3.5 w-3.5" />
              Log reply
            </Button>
          )}
        </DialogTrigger>
      ) : null}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log client reply</DialogTitle>
          <DialogDescription>
            This stops the follow-up sequence for this lead.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reply-text">What did the client say?</Label>
            <Textarea
              id="reply-text"
              value={replyText}
              onChange={(event) => setReplyText(event.target.value)}
              placeholder="Paste or summarise the reply"
              required
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="reply-tag">Reply tag</Label>
              <Select
                id="reply-tag"
                value={replyTag}
                onChange={(event) => setReplyTag(event.target.value as ReplyTag)}
              >
                {REPLY_TAGS.map((tag) => (
                  <option key={tag} value={tag}>
                    {REPLY_TAG_LABELS[tag]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reply-date">When</Label>
              <Input
                id="reply-date"
                type="datetime-local"
                value={occurredAt}
                onChange={(event) => setOccurredAt(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save reply"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
