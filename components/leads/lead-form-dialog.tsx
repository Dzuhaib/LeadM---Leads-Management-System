"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Plus } from "lucide-react";
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
import { createLead, updateLead } from "@/actions/leads";
import {
  CHANNELS,
  CHANNEL_LABELS,
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  SERVICES,
} from "@/lib/constants";
import type { Lead } from "@/db/schema";

export function LeadFormDialog({
  lead,
  trigger,
  variant = "default",
  size = "default",
  allowDuplicate = false,
}: {
  lead?: Lead;
  trigger?: React.ReactNode;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "icon";
  allowDuplicate?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [overrideDuplicate, setOverrideDuplicate] = React.useState(false);
  const isEdit = Boolean(lead);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload: Record<string, unknown> = {};
    for (const [key, value] of formData.entries()) {
      const text = String(value).trim();
      if (text) payload[key] = text;
    }
    if (allowDuplicate && overrideDuplicate) payload.allowDuplicate = true;

    startTransition(async () => {
      const result = isEdit
        ? await updateLead({ ...payload, id: lead!.id })
        : await createLead(payload);

      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(isEdit ? "Lead updated." : "Lead added.");
      setOpen(false);
      setOverrideDuplicate(false);
      form.reset();
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button
            type="button"
            variant={variant}
            size={size}
            aria-label={isEdit ? "Edit lead" : "Add lead"}
          >
            {isEdit ? (
              <Pencil className="h-4 w-4" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {size === "icon" ? null : isEdit ? "Edit" : "Add lead"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit lead" : "Add a new lead"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? lead?.businessName
                ? `Update ${lead.businessName}.`
                : "Update the details for this lead."
              : "Seven fields. Duplicates are checked across the team automatically."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="serviceWanted">Service they want *</Label>
              <Input
                id="serviceWanted"
                name="serviceWanted"
                placeholder="What are they looking for?"
                defaultValue={lead?.serviceWanted ?? ""}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="channel">Channel *</Label>
              <Select
                id="channel"
                name="channel"
                defaultValue={lead?.channel ?? "linkedin"}
              >
                {CHANNELS.map((channel) => (
                  <option key={channel} value={channel}>
                    {CHANNEL_LABELS[channel]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="servicePitched">Service pitched as it is *</Label>
              <Select
                id="servicePitched"
                name="servicePitched"
                defaultValue={lead?.servicePitched ?? "AI Systems"}
              >
                {SERVICES.map((service) => (
                  <option key={service} value={service}>
                    {service}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="profileUrl">Source URL *</Label>
              <Input
                id="profileUrl"
                name="profileUrl"
                placeholder="https://linkedin.com/in/…"
                defaultValue={lead?.profileUrl ?? ""}
                required
              />
              <p className="text-xs text-muted-foreground">
                The profile or post where you found this lead.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status as it is *</Label>
              <Select
                id="status"
                name="status"
                defaultValue={lead?.status ?? "new"}
              >
                {LEAD_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {LEAD_STATUS_LABELS[status]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email (optional)</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="name@company.com"
                defaultValue={lead?.email ?? ""}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="phone">Phone number (optional)</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder="+92 300 0000000"
                defaultValue={lead?.phone ?? ""}
              />
            </div>
          </div>
          {allowDuplicate ? (
            <label className="flex items-start gap-3 rounded-lg border border-border bg-secondary/40 p-3 text-sm">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-border accent-[#0071e3]"
                checked={overrideDuplicate}
                onChange={(event) => setOverrideDuplicate(event.target.checked)}
              />
              <span>
                Allow this duplicate
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Admin only. The team duplicate rule is skipped for this save.
                </span>
              </span>
            </label>
          ) : null}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : isEdit ? "Save changes" : "Add lead"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
