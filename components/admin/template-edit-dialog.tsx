"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Save } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { updateTemplate } from "@/actions/settings";
import { CHANNEL_LABELS, type Channel } from "@/lib/constants";

export function TemplateEditDialog({
  channel,
  stage,
  title,
  body,
  stageLabel,
}: {
  channel: Channel;
  stage: number;
  title: string;
  body: string;
  stageLabel: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload = {
      channel,
      stage,
      title: String(formData.get("title") ?? ""),
      body: String(formData.get("body") ?? ""),
    };

    startTransition(async () => {
      const result = await updateTemplate(payload);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Template saved.");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline">
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {CHANNEL_LABELS[channel]} · {stageLabel}
          </DialogTitle>
          <DialogDescription>
            Edit the copy employees can copy from the templates page. Keep the
            [Name] and [Business] placeholders where they should be filled in.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor={`template-title-${channel}-${stage}`}>Title</Label>
            <Input
              id={`template-title-${channel}-${stage}`}
              name="title"
              defaultValue={title}
              maxLength={200}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`template-body-${channel}-${stage}`}>Message</Label>
            <Textarea
              id={`template-body-${channel}-${stage}`}
              name="body"
              defaultValue={body}
              rows={9}
              maxLength={4000}
              required
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              <Save className="h-4 w-4" />
              {pending ? "Saving…" : "Save template"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
