"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarRange } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  DATE_RANGES,
  DATE_RANGE_LABELS,
  type DateRangeKey,
} from "@/lib/constants";

export function DateRangeFilter({
  range,
  from,
  to,
}: {
  range: DateRangeKey;
  from?: string;
  to?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [customFrom, setCustomFrom] = React.useState(from ?? "");
  const [customTo, setCustomTo] = React.useState(to ?? "");

  function pushParams(next: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <div className="w-full sm:w-44">
        <Select
          aria-label="Date range"
          value={range}
          onChange={(event) => {
            const value = event.target.value as DateRangeKey;
            pushParams({
              range: value,
              ...(value === "custom" ? {} : { from: undefined, to: undefined }),
            });
          }}
        >
          {DATE_RANGES.map((key) => (
            <option key={key} value={key}>
              {DATE_RANGE_LABELS[key]}
            </option>
          ))}
        </Select>
      </div>
      {range === "custom" ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            type="date"
            aria-label="From date"
            value={customFrom}
            onChange={(event) => setCustomFrom(event.target.value)}
            className="sm:w-40"
          />
          <Input
            type="date"
            aria-label="To date"
            value={customTo}
            onChange={(event) => setCustomTo(event.target.value)}
            className="sm:w-40"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              pushParams({ range: "custom", from: customFrom, to: customTo })
            }
          >
            <CalendarRange className="h-4 w-4" />
            Apply
          </Button>
        </div>
      ) : null}
    </div>
  );
}
