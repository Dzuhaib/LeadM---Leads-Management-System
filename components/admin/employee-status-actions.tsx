"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { updateEmployeeStatus } from "@/actions/admin";
import type { User } from "@/db/schema";

export function EmployeeStatusActions({
  userId,
  status,
  role,
  name,
}: {
  userId: string;
  status: User["status"];
  role: User["role"];
  name: string;
}) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  if (role === "admin") {
    return (
      <span className="text-xs text-muted-foreground">Admin account</span>
    );
  }

  function run(next: "active" | "deactivated") {
    startTransition(async () => {
      const result = await updateEmployeeStatus({ userId, status: next });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(
        next === "active"
          ? `${name || "Employee"} is now active.`
          : `${name || "Employee"} has been deactivated.`,
      );
      setConfirmOpen(false);
      router.refresh();
    });
  }

  if (status === "pending") {
    return (
      <Button
        type="button"
        size="sm"
        disabled={pending}
        onClick={() => run("active")}
      >
        Approve
      </Button>
    );
  }

  if (status === "deactivated") {
    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => run("active")}
      >
        Reactivate
      </Button>
    );
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => setConfirmOpen(true)}
      >
        Deactivate
      </Button>
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate this employee?</DialogTitle>
            <DialogDescription>
              {name || "This employee"} will be signed out of the app. Their
              leads and activity history are kept and can be reassigned.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => run("deactivated")}
              disabled={pending}
            >
              {pending ? "Deactivating…" : "Deactivate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
