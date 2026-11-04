"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  CHANNELS,
  CHANNEL_LABELS,
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
} from "@/lib/constants";

export type LeadFilterValues = {
  q?: string;
  status?: string;
  channel?: string;
  industry?: string;
  country?: string;
  due?: string;
  from?: string;
  to?: string;
  sort?: string;
  dir?: string;
};

export function LeadsFilters({
  values,
  industries,
  countries,
}: {
  values: LeadFilterValues;
  industries: string[];
  countries: string[];
}) {
  const router = useRouter();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    for (const [key, value] of formData.entries()) {
      const text = String(value).trim();
      if (text) params.set(key, text);
    }
    params.set("page", "1");
    router.push(`/leads?${params.toString()}`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-3 rounded-lg border border-border bg-card p-4 md:grid-cols-2 xl:grid-cols-7"
    >
      <div className="relative md:col-span-2 xl:col-span-2">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          name="q"
          defaultValue={values.q ?? ""}
          placeholder="Search business, contact, email…"
          className="pl-9"
          aria-label="Search leads"
        />
      </div>
      <Select
        name="status"
        defaultValue={values.status ?? ""}
        aria-label="Filter by status"
      >
        <option value="">All statuses</option>
        {LEAD_STATUSES.map((status) => (
          <option key={status} value={status}>
            {LEAD_STATUS_LABELS[status]}
          </option>
        ))}
      </Select>
      <Select
        name="channel"
        defaultValue={values.channel ?? ""}
        aria-label="Filter by channel"
      >
        <option value="">All channels</option>
        {CHANNELS.map((channel) => (
          <option key={channel} value={channel}>
            {CHANNEL_LABELS[channel]}
          </option>
        ))}
      </Select>
      <Select
        name="industry"
        defaultValue={values.industry ?? ""}
        aria-label="Filter by industry"
      >
        <option value="">All industries</option>
        {industries.map((industry) => (
          <option key={industry} value={industry}>
            {industry}
          </option>
        ))}
      </Select>
      <Select
        name="country"
        defaultValue={values.country ?? ""}
        aria-label="Filter by country"
      >
        <option value="">All countries</option>
        {countries.map((country) => (
          <option key={country} value={country}>
            {country}
          </option>
        ))}
      </Select>
      <Select
        name="due"
        defaultValue={values.due ?? ""}
        aria-label="Filter by follow-up"
      >
        <option value="">Any follow-up</option>
        <option value="today">Due today</option>
        <option value="overdue">Overdue</option>
      </Select>
      <Input
        type="date"
        name="from"
        defaultValue={values.from ?? ""}
        aria-label="Added from date"
      />
      <Input
        type="date"
        name="to"
        defaultValue={values.to ?? ""}
        aria-label="Added to date"
      />
      <Select
        name="sort"
        defaultValue={values.sort ?? "created_at"}
        aria-label="Sort leads by"
      >
        <option value="created_at">Sort: date added</option>
        <option value="business_name">Sort: business</option>
        <option value="status">Sort: status</option>
        <option value="next_follow_up_at">Sort: follow-up</option>
      </Select>
      <Select
        name="dir"
        defaultValue={values.dir ?? "desc"}
        aria-label="Sort direction"
      >
        <option value="desc">Descending</option>
        <option value="asc">Ascending</option>
      </Select>
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm">
          Filter
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label="Clear filters"
          onClick={() => router.push("/leads")}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}
