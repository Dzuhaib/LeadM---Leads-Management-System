import { cn } from "@/lib/utils";
import {
  LEAD_STATUS_CLASSES,
  LEAD_STATUS_LABELS,
  type LeadStatus,
} from "@/lib/constants";

export function StatusBadge({
  status,
  className,
}: {
  status: LeadStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        LEAD_STATUS_CLASSES[status],
        className,
      )}
    >
      {LEAD_STATUS_LABELS[status]}
    </span>
  );
}
