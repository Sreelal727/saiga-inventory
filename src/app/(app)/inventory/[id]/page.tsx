"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import Link from "next/link";
import { formatCurrency, formatDate, formatDateTime, daysUntil, stockAgeingDays } from "@/lib/utils";
import {
  ArrowLeft, Edit, Package, QrCode, AlertTriangle, TrendingDown,
  TrendingUp, Clock, Calendar, Layers,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import QRCode from "qrcode";
import { MovementTrendChart } from "@/components/stock/movement-trend-chart";

export default function ItemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const itemId = id as Id<"inventory_items">;

  const item = useQuery(api.items.get, { id: itemId });
  const batches = useQuery(api.batches.listByItem, { item_id: itemId });
  const movements = useQuery(api.movements.listByItem, { item_id: itemId, limit: 20 });
  const categories = useQuery(api.categories.list, {});
  const imageUrl = useQuery(api.items.getImageUrl, { image_id: item?.image_id });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "batches" | "movements" | "pricing">("overview");

  useEffect(() => {
    if (canvasRef.current && item?.sku) {
      QRCode.toCanvas(canvasRef.current, item.sku, { width: 160, margin: 1 });
    }
  }, [item?.sku]);

  if (!item) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading…</div>;
  }

  const cat = categories?.find((c) => c._id === item.category_id);
  const isLow = item.reorder_level !== undefined && item.qty_on_hand <= item.reorder_level;
  const activeBatches = batches?.filter((b) => b.status === "active") ?? [];
  const expiringBatches = activeBatches.filter((b) => {
    if (!b.expiry_date) return false;
    const d = daysUntil(b.expiry_date);
    return d !== undefined && d <= 30;
  });

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button onClick={() => history.back()} className="mt-1 rounded-lg p-2 hover:bg-accent text-muted-foreground">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-bold">{item.name}</h1>
              <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-mono">{item.sku}</span>
                {cat && (
                  <>
                    <span>•</span>
                    <span className="rounded-full px-2 py-0.5 text-xs"
                      style={{ backgroundColor: `${cat.color ?? "#6366f1"}20`, color: cat.color ?? "#6366f1" }}>
                      {cat.name}
                    </span>
                  </>
                )}
                <span>•</span>
                <span className="capitalize">{item.item_type.replace("_", " ")}</span>
              </div>
            </div>
            <Link href={`/inventory/${id}/edit`}
              className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm hover:bg-accent">
              <Edit className="h-4 w-4" /> Edit
            </Link>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {isLow && (
        <div className="flex items-center gap-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Low stock: {item.qty_on_hand} {item.unit} remaining (reorder at {item.reorder_level})
        </div>
      )}
      {expiringBatches.length > 0 && (
        <div className="flex items-center gap-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          <Clock className="h-4 w-4 shrink-0" />
          {expiringBatches.length} batch{expiringBatches.length > 1 ? "es" : ""} expiring within 30 days
        </div>
      )}

      {/* Top stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="On Hand" value={`${item.qty_on_hand} ${item.unit}`} highlight={isLow ? "amber" : "default"} />
        <Stat label="Selling Price" value={formatCurrency(item.selling_price)} />
        <Stat label="Stock Value" value={formatCurrency((item.cost_price ?? 0) * item.qty_on_hand)} />
        <Stat label="Active Batches" value={String(activeBatches.length)} />
      </div>

      {/* Tabs */}
      <div className="border-b flex gap-0">
        {(["overview", "batches", "movements", "pricing"] as const).map((tab) => (
          <button key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium capitalize border-b-2 -mb-px transition-colors ${
              activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}>
            {tab}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {activeTab === "overview" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            {/* Photo + Description */}
            <div className="rounded-xl border bg-card p-5 flex gap-5">
              <div className="h-24 w-24 shrink-0 rounded-xl bg-muted overflow-hidden flex items-center justify-center">
                {imageUrl ? (
                  <img src={imageUrl} alt={item.name} className="h-full w-full object-cover" />
                ) : (
                  <Package className="h-8 w-8 text-muted-foreground/40" />
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{item.description || "No description."}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <Tag label="Unit" value={item.unit} />
                  <Tag label="Type" value={item.item_type.replace("_", " ")} />
                  {item.tracks_batch && <Tag label="Batch Tracking" value="Enabled" />}
                  {item.tracks_expiry && <Tag label="Expiry Tracking" value="Enabled" />}
                  {item.shelf_life_days && <Tag label="Shelf Life" value={`${item.shelf_life_days} days`} />}
                  {item.barcode && <Tag label="Barcode" value={item.barcode} />}
                </div>
              </div>
            </div>

            {/* Stock Movement Trend */}
            <div className="rounded-xl border bg-card p-5">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-4">Movement Trend</h3>
              <MovementTrendChart />
            </div>
          </div>

          {/* QR Code panel */}
          <div className="space-y-4">
            <div className="rounded-xl border bg-card p-5 text-center">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-4">QR Code</h3>
              <canvas ref={canvasRef} className="mx-auto rounded-lg" />
              <p className="mt-2 font-mono text-xs text-muted-foreground">{item.sku}</p>
              <button
                onClick={() => {
                  const c = canvasRef.current;
                  if (!c) return;
                  const a = document.createElement("a");
                  a.download = `qr-${item.sku}.png`;
                  a.href = c.toDataURL("image/png");
                  a.click();
                }}
                className="mt-3 flex items-center gap-2 mx-auto rounded-lg border px-4 py-2 text-xs hover:bg-accent"
              >
                <QrCode className="h-3.5 w-3.5" /> Download QR
              </button>
            </div>

            {/* Stock age of oldest active batch */}
            {activeBatches.length > 0 && (
              <div className="rounded-xl border bg-card p-5">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-3">Stock Ageing</h3>
                {activeBatches.slice(0, 5).map((b) => {
                  const age = stockAgeingDays(b.received_at);
                  const color = age > 90 ? "text-red-500" : age > 60 ? "text-orange-500" : age > 30 ? "text-amber-500" : "text-green-500";
                  return (
                    <div key={b._id} className="flex items-center justify-between py-1.5 text-sm border-b last:border-0">
                      <span className="text-muted-foreground truncate">{b.batch_no}</span>
                      <span className={`font-medium ${color}`}>{age}d</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Batches tab */}
      {activeTab === "batches" && (
        <div className="rounded-xl border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Batch No</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Received</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Remaining</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Expiry</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Age</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {batches?.length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center text-muted-foreground text-sm">No batches</td></tr>
              )}
              {batches?.map((b) => {
                const days = b.expiry_date ? daysUntil(b.expiry_date) : undefined;
                const age = stockAgeingDays(b.received_at);
                return (
                  <tr key={b._id} className="border-t hover:bg-muted/20">
                    <td className="px-4 py-3 font-mono text-xs">{b.batch_no}</td>
                    <td className="px-4 py-3 text-right">{new Date(b.received_at).toLocaleDateString("en-IN")}</td>
                    <td className="px-4 py-3 text-right font-medium">{b.qty_remaining}</td>
                    <td className="px-4 py-3 text-right">
                      {b.expiry_date ? (
                        <span className={days !== undefined && days <= 7 ? "text-red-600 font-medium" : days !== undefined && days <= 30 ? "text-amber-600" : ""}>
                          {formatDate(b.expiry_date)}
                          {days !== undefined && days <= 30 && ` (${days}d)`}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={age > 90 ? "text-red-500" : age > 60 ? "text-orange-500" : age > 30 ? "text-amber-500" : "text-green-500"}>
                        {age}d
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        b.status === "active" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                        b.status === "depleted" ? "bg-muted text-muted-foreground" :
                        b.status === "expired" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                        "bg-gray-100 text-gray-600"
                      }`}>{b.status}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="border-t p-4">
            <Link href={`/movements/new?item=${id}`}
              className="text-sm text-primary hover:underline">+ Add batch receipt</Link>
          </div>
        </div>
      )}

      {/* Movements tab */}
      {activeTab === "movements" && (
        <div className="rounded-xl border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Qty</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Before</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">After</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Reference</th>
              </tr>
            </thead>
            <tbody>
              {movements?.map((m) => (
                <tr key={m._id} className="border-t hover:bg-muted/20">
                  <td className="px-4 py-3 text-xs text-muted-foreground">{formatDateTime(m.occurred_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {m.direction === "in"
                        ? <TrendingUp className="h-3.5 w-3.5 text-green-500" />
                        : <TrendingDown className="h-3.5 w-3.5 text-red-400" />
                      }
                      <span className="capitalize">{m.type.replace("_", " ")}</span>
                    </div>
                  </td>
                  <td className={`px-4 py-3 text-right font-mono font-medium ${m.direction === "in" ? "text-green-600" : "text-red-500"}`}>
                    {m.direction === "in" ? "+" : "-"}{m.qty}
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{m.qty_before}</td>
                  <td className="px-4 py-3 text-right font-medium">{m.qty_after}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{m.reference ?? m.notes ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pricing tab */}
      {activeTab === "pricing" && (
        <div className="rounded-xl border bg-card p-6">
          <h3 className="font-semibold mb-4">All Price Tiers</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <PriceRow label="Cost Price" value={item.cost_price} />
            <PriceRow label="Selling Price" value={item.selling_price} highlight />
            <PriceRow label="MRP" value={item.mrp} />
            <PriceRow label="Wholesale Price" value={item.wholesale_price} />
            <PriceRow label="Special / Promo Price" value={item.special_price} />
          </div>
          {item.selling_price && item.cost_price && (
            <div className="mt-4 rounded-lg bg-muted/40 p-4">
              <p className="text-sm font-medium">Margin Analysis</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {(((item.selling_price - item.cost_price) / item.selling_price) * 100).toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground">gross margin on selling price</p>
            </div>
          )}
          <div className="mt-4">
            <Link href={`/inventory/${id}/edit`}
              className="text-sm text-primary hover:underline">Edit prices →</Link>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: "amber" | "default" }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${highlight === "amber" ? "text-amber-600" : ""}`}>{value}</p>
    </div>
  );
}

function Tag({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-full border px-2 py-0.5 text-xs">
      <span className="text-muted-foreground">{label}: </span>{value}
    </span>
  );
}

function PriceRow({ label, value, highlight }: { label: string; value?: number; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${highlight ? "border-primary/30 bg-primary/5" : ""}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg font-semibold ${highlight ? "text-primary" : ""}`}>
        {value !== undefined ? formatCurrency(value) : <span className="text-muted-foreground text-sm">Not set</span>}
      </p>
    </div>
  );
}
