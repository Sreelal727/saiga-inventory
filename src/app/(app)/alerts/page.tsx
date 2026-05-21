"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import Link from "next/link";
import { formatDate, daysUntil, stockAgeingDays } from "@/lib/utils";
import { AlertTriangle, Clock, Package, TrendingDown } from "lucide-react";

export default function AlertsPage() {
  const items = useQuery(api.items.list, {});
  const expiringBatches = useQuery(api.batches.listExpiring, { days: 30 });
  const allBatches = useQuery(api.batches.listAll, { status: "active" });

  const lowStockItems = items?.filter(
    (i) => i.reorder_level !== undefined && i.qty_on_hand <= i.reorder_level,
  ) ?? [];

  const outOfStockItems = items?.filter((i) => i.qty_on_hand === 0) ?? [];

  const agedBatches = allBatches?.filter((b) => stockAgeingDays(b.received_at) > 90) ?? [];

  const urgentExpiry = expiringBatches?.filter((b) => {
    const d = daysUntil(b.expiry_date);
    return d !== undefined && d <= 7;
  }) ?? [];

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <AlertStat label="Low Stock" value={lowStockItems.length} color="amber" />
        <AlertStat label="Out of Stock" value={outOfStockItems.length} color="red" />
        <AlertStat label="Expiring (30d)" value={expiringBatches?.length ?? 0} color="orange" />
        <AlertStat label="Aged > 90d" value={agedBatches.length} color="purple" />
      </div>

      {/* Out of stock */}
      {outOfStockItems.length > 0 && (
        <AlertSection title="Out of Stock" icon={<Package className="h-4 w-4" />} severity="critical">
          {outOfStockItems.map((i) => (
            <AlertRow key={i._id}
              label={i.name}
              detail={`${i.sku} • ${i.unit}`}
              badge="OUT OF STOCK"
              badgeColor="red"
              href={`/inventory/${i._id}`}
            />
          ))}
        </AlertSection>
      )}

      {/* Low stock */}
      {lowStockItems.length > 0 && (
        <AlertSection title="Low Stock" icon={<TrendingDown className="h-4 w-4" />} severity="warning">
          {lowStockItems.map((i) => (
            <AlertRow key={i._id}
              label={i.name}
              detail={`${i.qty_on_hand} ${i.unit} remaining (reorder at ${i.reorder_level})`}
              badge={`${i.qty_on_hand} ${i.unit}`}
              badgeColor="amber"
              href={`/inventory/${i._id}`}
            />
          ))}
        </AlertSection>
      )}

      {/* Urgent expiry */}
      {urgentExpiry.length > 0 && (
        <AlertSection title="Expiring in 7 Days" icon={<Clock className="h-4 w-4" />} severity="critical">
          {urgentExpiry.map((b) => (
            <AlertRow key={b._id}
              label={b.batch_no}
              detail={`Expires ${formatDate(b.expiry_date)} • Qty: ${b.qty_remaining}`}
              badge={`${daysUntil(b.expiry_date)}d`}
              badgeColor="red"
              href={`/batches`}
            />
          ))}
        </AlertSection>
      )}

      {/* All expiring */}
      {expiringBatches && expiringBatches.length > urgentExpiry.length && (
        <AlertSection title="Expiring in 8–30 Days" icon={<Clock className="h-4 w-4" />} severity="warning">
          {expiringBatches.filter((b) => {
            const d = daysUntil(b.expiry_date);
            return d !== undefined && d > 7;
          }).map((b) => (
            <AlertRow key={b._id}
              label={b.batch_no}
              detail={`Expires ${formatDate(b.expiry_date)} • Qty: ${b.qty_remaining}`}
              badge={`${daysUntil(b.expiry_date)}d`}
              badgeColor="amber"
              href={`/batches`}
            />
          ))}
        </AlertSection>
      )}

      {/* Aged stock */}
      {agedBatches.length > 0 && (
        <AlertSection title="Aged Stock (90+ days)" icon={<AlertTriangle className="h-4 w-4" />} severity="info">
          {agedBatches.map((b) => (
            <AlertRow key={b._id}
              label={b.batch_no}
              detail={`Received ${stockAgeingDays(b.received_at)} days ago • ${b.qty_remaining} remaining`}
              badge={`${stockAgeingDays(b.received_at)}d`}
              badgeColor="purple"
              href={`/batches`}
            />
          ))}
        </AlertSection>
      )}

      {lowStockItems.length === 0 && outOfStockItems.length === 0 && (expiringBatches?.length ?? 0) === 0 && agedBatches.length === 0 && (
        <div className="rounded-xl border bg-card p-12 text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
            <AlertTriangle className="h-8 w-8 text-green-500" />
          </div>
          <h2 className="font-semibold text-lg">All Clear!</h2>
          <p className="text-sm text-muted-foreground mt-1">No alerts at this time. Stock levels look healthy.</p>
        </div>
      )}
    </div>
  );
}

function AlertStat({ label, value, color }: { label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    amber: "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400",
    red: "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400",
    orange: "bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400",
    purple: "bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400",
  };
  return (
    <div className={`rounded-xl p-4 ${colors[color]}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs mt-0.5 opacity-80">{label}</p>
    </div>
  );
}

function AlertSection({ title, icon, severity, children }: {
  title: string;
  icon: React.ReactNode;
  severity: "critical" | "warning" | "info";
  children: React.ReactNode;
}) {
  const border = { critical: "border-red-200 dark:border-red-800", warning: "border-amber-200 dark:border-amber-800", info: "border-blue-200 dark:border-blue-800" };
  const header = { critical: "text-red-700 dark:text-red-400", warning: "text-amber-700 dark:text-amber-400", info: "text-blue-700 dark:text-blue-400" };
  return (
    <div className={`rounded-xl border ${border[severity]} bg-card`}>
      <div className={`flex items-center gap-2 px-4 py-3 border-b ${border[severity]} ${header[severity]}`}>
        {icon}
        <h2 className="font-semibold text-sm">{title}</h2>
      </div>
      <div className="divide-y">{children}</div>
    </div>
  );
}

function AlertRow({ label, detail, badge, badgeColor, href }: {
  label: string;
  detail: string;
  badge: string;
  badgeColor: string;
  href: string;
}) {
  const colors: Record<string, string> = {
    red: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    purple: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  };
  return (
    <Link href={href} className="flex items-center gap-4 px-4 py-3 hover:bg-muted/20 transition-colors">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{label}</p>
        <p className="text-xs text-muted-foreground truncate">{detail}</p>
      </div>
      <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[badgeColor]}`}>
        {badge}
      </span>
    </Link>
  );
}
