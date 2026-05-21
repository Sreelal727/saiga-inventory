"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

export function MovementTrendChart() {
  const data = useQuery(api.movements.movementTrend, { days: 14 });

  if (!data) return <div className="h-48 animate-pulse rounded bg-muted" />;
  if (data.length === 0) return <p className="text-sm text-muted-foreground text-center py-8">No movement data yet</p>;

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="inGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="outGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        <Legend />
        <Area type="monotone" dataKey="in" stroke="#22c55e" fill="url(#inGrad)" strokeWidth={2} />
        <Area type="monotone" dataKey="out" stroke="#ef4444" fill="url(#outGrad)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
