"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserRoundCog } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { reassignLeads } from "@/actions/admin";

type EmployeeOption = { id: string; fullName: string; email: string };

export function ReassignLeadButton({
  leadIds,
  employees,
  currentOwnerId,
  label = "Reassign",
  size = "sm",
  variant = "outline",
  onDone,
}: {
  leadIds: string[];
  employees: EmployeeOption[];
  currentOwnerId?: string;
  label?: string;
  size?: "default" | "sm" | "icon";
  variant?: "default" | "outline" | "secondary" | "ghost";
  onDone?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [ownerId, setOwnerId] = React.useState(
    employees.find((employee) => employee.id !== currentOwnerId)?.id ??
      employees[0]?.id ??
      "",
  );
  const [pending, startTransition] = React.useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!ownerId) {
      toast.error("Choose an employee first.");
      return;
    }
    startTransition(async () => {
      const result = await reassignLeads({ leadIds, ownerId });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(
        leadIds.length === 1
          ? "Lead reassigned."
          : `${leadIds.length} leads reassigned.`,
      );
      setOpen(false);
      onDone?.();
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant={variant}
          size={size}
          aria-label={label}
          disabled={employees.length === 0}
        >
          <UserRoundCog />
          {size === "icon" ? null : label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reassign lead{leadIds.length === 1 ? "" : "s"}</DialogTitle>
          <DialogDescription>
            The new owner will see this lead on their dashboard and lead list.
            The change is recorded in the audit log.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reassign-owner">New owner</Label>
            <Select
              id="reassign-owner"
              value={ownerId}
              onChange={(event) => setOwnerId(event.target.value)}
            >
              {employees.length === 0 ? (
                <option value="">No active employees</option>
              ) : null}
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.fullName || employee.email}
                </option>
              ))}
            </Select>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !ownerId}>
              {pending ? "Reassigning…" : "Reassign"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
