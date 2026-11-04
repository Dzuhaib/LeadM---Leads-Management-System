"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, parseISO } from "date-fns";

const COLORS = [
  "#0071e3",
  "#30b0c7",
  "#34c759",
  "#ff9f0a",
  "#ff3b30",
  "#86868b",
  "#0040dd",
  "#63e6e2",
  "#ffd60a",
  "#1d1d1f",
];

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

export function TeamMessagesStackedChart({
  members,
  data,
}: {
  members: { id: string; fullName: string; email: string }[];
  data: Record<string, number | string>[];
}) {
  if (members.length === 0 || data.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center rounded-md border border-dashed border-border text-sm text-muted-foreground">
        No team activity in this period.
      </div>
    );
  }

  const chartData = data.map((row) => ({
    ...row,
    label: dayLabel(String(row.day)),
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart
        data={chartData}
        margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--border)"
          vertical={false}
        />
        <XAxis dataKey="label" {...axisProps} />
        <YAxis allowDecimals={false} {...axisProps} />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {members.map((member, index) => (
          <Bar
            key={member.id}
            dataKey={member.id}
            name={member.fullName || member.email}
            stackId="team"
            fill={COLORS[index % COLORS.length]}
            radius={
              index === members.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]
            }
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
