"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateSettings } from "@/actions/settings";

type SettingsValues = {
  timezone: string;
  dailyNewLeadsTarget: number;
  dailyMessagesTarget: number;
  followUpDays: number[];
  noReplyAfterDays: number;
  requireApproval: boolean;
};

export function SettingsForm({ settings }: { settings: SettingsValues }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    const payload = {
      timezone: String(formData.get("timezone") ?? ""),
      dailyNewLeadsTarget: Number(formData.get("dailyNewLeadsTarget")),
      dailyMessagesTarget: Number(formData.get("dailyMessagesTarget")),
      followUpDays: [
        Number(formData.get("followUpDay1")),
        Number(formData.get("followUpDay2")),
        Number(formData.get("followUpDay3")),
      ],
      noReplyAfterDays: Number(formData.get("noReplyAfterDays")),
      requireApproval: formData.get("requireApproval") === "on",
    };

    startTransition(async () => {
      const result = await updateSettings(payload);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Settings saved.");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Workspace settings</CardTitle>
        <CardDescription>
          Time zone, daily targets, follow-up schedule and the approval gate.
          Changes apply to every employee immediately.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="timezone">Time zone</Label>
            <Input
              id="timezone"
              name="timezone"
              defaultValue={settings.timezone}
              placeholder="Asia/Karachi"
              autoComplete="off"
              required
            />
            <p className="text-xs text-muted-foreground">
              Use an IANA time zone name. Day boundaries on dashboards and
              reports use this zone.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="dailyNewLeadsTarget">Daily new-leads target</Label>
              <Input
                id="dailyNewLeadsTarget"
                name="dailyNewLeadsTarget"
                type="number"
                min={1}
                max={500}
                defaultValue={settings.dailyNewLeadsTarget}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dailyMessagesTarget">Daily messages target</Label>
              <Input
                id="dailyMessagesTarget"
                name="dailyMessagesTarget"
                type="number"
                min={1}
                max={500}
                defaultValue={settings.dailyMessagesTarget}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Follow-up schedule</Label>
            <div className="grid grid-cols-3 gap-3">
              {[0, 1, 2].map((index) => (
                <div key={index} className="space-y-1.5">
                  <Label
                    htmlFor={`followUpDay${index + 1}`}
                    className="text-xs font-normal text-muted-foreground"
                  >
                    {index === 0 ? "First follow-up" : `Follow-up ${index + 1}`}
                  </Label>
                  <Input
                    id={`followUpDay${index + 1}`}
                    name={`followUpDay${index + 1}`}
                    type="number"
                    min={1}
                    max={365}
                    defaultValue={settings.followUpDays[index] ?? [3, 7, 14][index]}
                    required
                  />
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Days after the first message, in ascending order. After the last
              follow-up the sequence ends.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="noReplyAfterDays">No-reply threshold (days)</Label>
            <Input
              id="noReplyAfterDays"
              name="noReplyAfterDays"
              type="number"
              min={1}
              max={365}
              defaultValue={settings.noReplyAfterDays}
              required
            />
            <p className="text-xs text-muted-foreground">
              A lead becomes no reply after this many days without a response to
              the last message.
            </p>
          </div>

          <label
            htmlFor="requireApproval"
            className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-3"
          >
            <input
              id="requireApproval"
              name="requireApproval"
              type="checkbox"
              defaultChecked={settings.requireApproval}
              className="mt-0.5 h-4 w-4 accent-primary"
            />
            <span className="space-y-1">
              <span className="block text-sm font-medium">
                Require admin approval for new employees
              </span>
              <span className="block text-xs text-muted-foreground">
                New sign-ups wait on the pending screen until an admin approves
                them. The ADMIN_EMAIL account is always active.
              </span>
            </span>
          </label>

          <div className="flex justify-end">
            <Button type="submit" disabled={pending}>
              <Save className="h-4 w-4" />
              {pending ? "Saving…" : "Save settings"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
