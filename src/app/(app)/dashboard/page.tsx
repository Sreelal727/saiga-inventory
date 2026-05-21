"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import Link from "next/link";
import {
  Package, AlertTriangle, TrendingDown, IndianRupee, Clock, ArrowRight,
} from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { MovementTrendChart } from "@/components/stock/movement-trend-chart";
import { StockAgeingChart } from "@/components/stock/ageing-chart";

export default function DashboardPage() {
  const stats = useQuery(api.items.dashboardStats);
  const recentMovements = useQuery(api.movements.listRecent, { limit: 8 });
  const expiringBatches = useQuery(api.batches.listExpiring, { days: 30 });

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total Items"
          value={stats?.total ?? 0}
          icon={<Package className="h-5 w-5" />}
          color="blue"
          href="/inventory"
        />
        <StatCard
          label="Low Stock"
          value={stats?.lowStock ?? 0}
          icon={<TrendingDown className="h-5 w-5" />}
          color="amber"
          href="/inventory?filter=low_stock"
        />
        <StatCard
          label="Out of Stock"
          value={stats?.outOfStock ?? 0}
          icon={<AlertTriangle className="h-5 w-5" />}
          color="red"
          href="/inventory?filter=out_of_stock"
        />
        <StatCard
          label="Inventory Value"
          value={formatCurrency(stats?.totalValue)}
          icon={<IndianRupee className="h-5 w-5" />}
          color="green"
          href="/reports"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Charts */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border bg-card p-5">
            <h2 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Stock Movement Trend (14 days)
            </h2>
            <MovementTrendChart />
          </div>
          <div className="rounded-xl border bg-card p-5">
            <h2 className="mb-4 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Stock Ageing
            </h2>
            <StockAgeingChart />
          </div>
        </div>

        {/* Sidebar panels */}
        <div className="space-y-4">
          {/* Expiring soon */}
          <div className="rounded-xl border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Expiring Soon
              </h2>
              <Link href="/batches?filter=expiring" className="text-xs text-primary hover:underline flex items-center gap-1">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            {expiringBatches?.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">No items expiring</p>
            )}
            <ul className="space-y-2">
              {expiringBatches?.slice(0, 6).map((b) => (
                <li key={b._id} className="flex items-center justify-between text-sm">
                  <span className="truncate flex-1 text-foreground">{b.batch_no}</span>
                  <span className="ml-2 shrink-0 rounded px-1.5 py-0.5 text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {b.expiry_date}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Recent movements */}
          <div className="rounded-xl border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Recent Activity
              </h2>
              <Link href="/movements" className="text-xs text-primary hover:underline flex items-center gap-1">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <ul className="space-y-2">
              {recentMovements?.slice(0, 8).map((m) => (
                <li key={m._id} className="flex items-start gap-2 text-sm">
                  <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${m.direction === "in" ? "bg-green-500" : "bg-red-400"}`} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium capitalize truncate">{m.type.replace("_", " ")}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(m.occurred_at)}</p>
                  </div>
                  <span className={`text-xs font-mono font-semibold ${m.direction === "in" ? "text-green-600" : "text-red-500"}`}>
                    {m.direction === "in" ? "+" : "-"}{m.qty}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label, value, icon, color, href,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: "blue" | "amber" | "red" | "green";
  href: string;
}) {
  const colors = {
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400",
    red: "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400",
    green: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400",
  };
  return (
    <Link href={href} className="rounded-xl border bg-card p-5 hover:shadow-md transition-shadow block">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-bold">{value}</p>
        </div>
        <div className={`rounded-lg p-2.5 ${colors[color]}`}>{icon}</div>
      </div>
    </Link>
  );
}
