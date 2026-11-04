"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, parseISO } from "date-fns";
import { CHANNEL_LABELS, LEAD_STATUS_LABELS, type Channel, type LeadStatus } from "@/lib/constants";

const tooltipStyle = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  color: "var(--foreground)",
  fontSize: 12,
};

const axisProps = {
  stroke: "var(--muted-foreground)",
  fontSize: 11,
  tickLine: false,
  axisLine: false,
};

function dayLabel(day: string) {
  try {
    return format(parseISO(day), "d MMM");
  } catch {
    return day;
  }
}

function ChartEmpty({ message }: { message: string }) {
  return (
    <div className="flex h-[240px] items-center justify-center rounded-md border border-dashed border-border text-sm text-muted-foreground">
      {message}
    </div>
  );
}

export function MessagesBarChart({
  data,
}: {
  data: { day: string; value: number }[];
}) {
  if (data.length === 0) return <ChartEmpty message="No messages in this period." />;
  const chartData = data.map((row) => ({ ...row, label: dayLabel(row.day) }));
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="label" {...axisProps} />
        <YAxis allowDecimals={false} {...axisProps} />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar dataKey="value" name="Messages" fill="#7C3AED" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function RepliesLineChart({
  data,
}: {
  data: { day: string; value: number }[];
}) {
  if (data.length === 0) return <ChartEmpty message="No replies in this period." />;
  const chartData = data.map((row) => ({ ...row, label: dayLabel(row.day) }));
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="label" {...axisProps} />
        <YAxis allowDecimals={false} {...axisProps} />
        <Tooltip contentStyle={tooltipStyle} />
        <Line
          type="monotone"
          dataKey="value"
          name="Replies"
          stroke="#BC542F"
          strokeWidth={2.5}
          dot={{ r: 3, fill: "#BC542F" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function ChannelBreakdownChart({
  data,
}: {
  data: { channel: Channel; messages: number; replies: number }[];
}) {
  if (data.length === 0) return <ChartEmpty message="No channel activity yet." />;
  const chartData = data.map((row) => ({
    ...row,
    label: CHANNEL_LABELS[row.channel] ?? row.channel,
  }));
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="label" {...axisProps} />
        <YAxis allowDecimals={false} {...axisProps} />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar dataKey="messages" name="Messages" fill="#7C3AED" radius={[6, 6, 0, 0]} />
        <Bar dataKey="replies" name="Replies" fill="#BC542F" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function FunnelChart({
  data,
}: {
  data: { status: LeadStatus; value: number }[];
}) {
  const chartData = data.map((row) => ({
    ...row,
    label: LEAD_STATUS_LABELS[row.status] ?? row.status,
  }));
  const colors = ["#A78BFA", "#8B5CF6", "#7C3AED", "#6D28D9", "#5B21B6", "#4C1D95"];
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
        <XAxis type="number" allowDecimals={false} {...axisProps} />
        <YAxis type="category" dataKey="label" width={98} {...axisProps} />
        <Tooltip contentStyle={tooltipStyle} />
        <Bar dataKey="value" name="Leads" radius={[0, 6, 6, 0]}>
          {chartData.map((entry, index) => (
            <Cell key={entry.status} fill={colors[index % colors.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
