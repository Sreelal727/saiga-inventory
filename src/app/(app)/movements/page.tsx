"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import Link from "next/link";
import { formatDateTime } from "@/lib/utils";
import { TrendingUp, TrendingDown, Plus, Filter } from "lucide-react";

const TYPES = ["receipt", "sale", "adjustment", "transfer_in", "transfer_out", "return", "wastage", "opening"] as const;

export default function MovementsPage() {
  const [typeFilter, setTypeFilter] = useState<string>("");

  const movements = useQuery(api.movements.listAll, {
    type: typeFilter ? (typeFilter as typeof TYPES[number]) : undefined,
  });

  const items = useQuery(api.items.list, {});

  const itemById = useMemo(
    () => new Map(items?.map((i) => [i._id, i]) ?? []),
    [items],
  );

  function itemName(id: string) {
    return itemById.get(id as Id<"inventory_items">)?.name ?? "—";
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            className="h-9 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">All types</option>
            {TYPES.map((t) => (
              <option key={t} value={t}>{t.replace("_", " ")}</option>
            ))}
          </select>
        </div>
        <div className="flex-1" />
        <Link
          href="/movements/new"
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 h-9"
        >
          <Plus className="h-4 w-4" /> Record Movement
        </Link>
      </div>

      {/* Summary chips */}
      {movements && (
        <div className="flex gap-3 text-sm">
          <span className="rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-3 py-1 text-xs font-medium">
            ↑ {movements.filter((m) => m.direction === "in").reduce((s, m) => s + m.qty, 0)} units in
          </span>
          <span className="rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-3 py-1 text-xs font-medium">
            ↓ {movements.filter((m) => m.direction === "out").reduce((s, m) => s + m.qty, 0)} units out
          </span>
          <span className="rounded-full bg-muted text-muted-foreground px-3 py-1 text-xs font-medium">
            {movements.length} records
          </span>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/30">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Item</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Qty</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Before</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">After</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Reference</th>
            </tr>
          </thead>
          <tbody>
            {movements === undefined && (
              <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">Loading…</td></tr>
            )}
            {movements?.length === 0 && (
              <tr><td colSpan={7} className="py-10 text-center text-muted-foreground">No movements found</td></tr>
            )}
            {movements?.map((m) => (
              <tr key={m._id} className="border-t hover:bg-muted/20">
                <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                  {formatDateTime(m.occurred_at)}
                </td>
                <td className="px-4 py-3">
                  <Link href={`/inventory/${m.item_id}`} className="hover:text-primary truncate block max-w-[160px]">
                    {itemName(m.item_id)}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {m.direction === "in"
                      ? <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                      : <TrendingDown className="h-3.5 w-3.5 text-red-400" />
                    }
                    <span className="capitalize">{m.type.replace(/_/g, " ")}</span>
                  </div>
                </td>
                <td className={`px-4 py-3 text-right font-mono font-semibold ${m.direction === "in" ? "text-green-600" : "text-red-500"}`}>
                  {m.direction === "in" ? "+" : "-"}{m.qty}
                </td>
                <td className="px-4 py-3 text-right text-muted-foreground">{m.qty_before}</td>
                <td className="px-4 py-3 text-right font-medium">{m.qty_after}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground max-w-[120px] truncate">
                  {m.reference ?? m.notes ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
