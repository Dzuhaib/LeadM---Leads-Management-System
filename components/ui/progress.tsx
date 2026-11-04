import { cn } from "@/lib/utils";

type ProgressProps = {
  value: number;
  max?: number;
  className?: string;
  indicatorClassName?: string;
  label?: string;
};

function Progress({
  value,
  max = 100,
  className,
  indicatorClassName,
  label,
}: ProgressProps) {
  const safeMax = max <= 0 ? 1 : max;
  const percent = Math.min(100, Math.max(0, (value / safeMax) * 100));
  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={safeMax}
      aria-label={label}
      className={cn(
        "h-2.5 w-full overflow-hidden rounded-full bg-muted",
        className,
      )}
    >
      <div
        className={cn(
          "h-full rounded-full bg-primary transition-all",
          indicatorClassName,
        )}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

export { Progress };
