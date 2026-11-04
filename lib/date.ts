import { addDays, endOfDay, startOfDay, subDays } from "date-fns";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";
import type { DateRangeKey } from "./constants";

export function getAppTimeZone() {
  return process.env.APP_TIMEZONE || "Asia/Karachi";
}

export function zonedDayBounds(date: Date, timeZone: string) {
  const zoned = toZonedTime(date, timeZone);
  return {
    start: fromZonedTime(startOfDay(zoned), timeZone),
    end: fromZonedTime(endOfDay(zoned), timeZone),
  };
}

export type ResolvedRange = { from: Date; to: Date; key: DateRangeKey };

export function resolveDateRange(
  key: DateRangeKey,
  timeZone: string,
  options?: { from?: string; to?: string; now?: Date },
): ResolvedRange {
  const now = options?.now ?? new Date();

  if (key === "custom") {
    const from = options?.from
      ? fromZonedTime(`${options.from}T00:00:00`, timeZone)
      : zonedDayBounds(now, timeZone).start;
    const to = options?.to
      ? fromZonedTime(`${options.to}T23:59:59.999`, timeZone)
      : zonedDayBounds(now, timeZone).end;
    return { from, to, key };
  }

  if (key === "yesterday") {
    const bounds = zonedDayBounds(subDays(now, 1), timeZone);
    return { from: bounds.start, to: bounds.end, key };
  }

  if (key === "7d" || key === "30d") {
    const days = key === "7d" ? 7 : 30;
    const start = zonedDayBounds(subDays(now, days - 1), timeZone).start;
    const end = zonedDayBounds(now, timeZone).end;
    return { from: start, to: end, key };
  }

  const bounds = zonedDayBounds(now, timeZone);
  return { from: bounds.start, to: bounds.end, key: "today" };
}

export function formatDate(date: Date | null | undefined, timeZone: string) {
  if (!date) return "—";
  return formatInTimeZone(date, timeZone, "dd MMM yyyy");
}

export function formatDateTime(
  date: Date | null | undefined,
  timeZone: string,
) {
  if (!date) return "—";
  return formatInTimeZone(date, timeZone, "dd MMM yyyy, HH:mm");
}

export function formatShortDay(date: Date | string, timeZone: string) {
  const value = typeof date === "string" ? new Date(date) : date;
  return formatInTimeZone(value, timeZone, "dd MMM");
}

export function formatRelative(
  date: Date | null | undefined,
  timeZone: string,
) {
  if (!date) return "—";
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(date, timeZone);
}

export function daysBetween(from: Date, to: Date) {
  return Math.floor((to.getTime() - from.getTime()) / 86_400_000);
}

export function addDaysUtc(date: Date, days: number) {
  return addDays(date, days);
}
