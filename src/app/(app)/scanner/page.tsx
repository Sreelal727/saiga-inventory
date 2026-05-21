"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import dynamic from "next/dynamic";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { QrCode, Package, Search, AlertTriangle } from "lucide-react";

const QrScanner = dynamic(
  () => import("@yudiel/react-qr-scanner").then((m) => m.Scanner),
  { ssr: false, loading: () => <div className="h-64 animate-pulse rounded-xl bg-muted flex items-center justify-center text-muted-foreground text-sm">Initializing camera…</div> }
);

export default function ScannerPage() {
  const [scanned, setScanned] = useState<string | null>(null);
  const [manualSku, setManualSku] = useState("");
  const [lookupSku, setLookupSku] = useState("");
  const [scanError, setScanError] = useState<string | null>(null);

  const MAX_SKU_LEN = 100;

  const item = useQuery(
    api.items.getBySku,
    lookupSku ? { sku: lookupSku } : "skip",
  );

  function handleScan(result: Array<{ rawValue: string }>) {
    const val = result[0]?.rawValue?.trim().slice(0, MAX_SKU_LEN);
    if (val && val !== scanned) {
      setScanned(val);
      setLookupSku(val);
      setScanError(null);
    }
  }

  function handleManualSearch(e: React.FormEvent) {
    e.preventDefault();
    setLookupSku(manualSku.trim());
    setScanned(null);
  }

  return (
    <div className="max-w-lg space-y-6">
      {/* Camera scanner */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <QrCode className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">QR / Barcode Scanner</h2>
        </div>
        <div className="overflow-hidden rounded-xl">
          <QrScanner
            onScan={handleScan}
            onError={(err) => setScanError(err instanceof Error ? err.message : "Camera error")}
            constraints={{ facingMode: "environment" }}
            styles={{ container: { borderRadius: "0.75rem", overflow: "hidden" } }}
          />
        </div>
        {scanError && (
          <div className="rounded-lg bg-destructive/10 px-4 py-2 text-sm text-destructive">
            {scanError}
          </div>
        )}
        {scanned && (
          <div className="rounded-lg bg-primary/10 border border-primary/20 px-4 py-2 text-sm text-primary font-mono">
            Scanned: {scanned}
          </div>
        )}
      </div>

      {/* Manual search */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <h2 className="font-semibold flex items-center gap-2"><Search className="h-4 w-4" /> Manual Lookup</h2>
        <form onSubmit={handleManualSearch} className="flex gap-2">
          <input
            className="h-9 flex-1 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring font-mono"
            placeholder="Enter SKU or scan result…"
            value={manualSku}
            onChange={(e) => setManualSku(e.target.value)}
          />
          <button type="submit" className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Search
          </button>
        </form>
      </div>

      {/* Result */}
      {lookupSku && (
        <div className="rounded-xl border bg-card p-5">
          {item === undefined && <p className="text-sm text-muted-foreground">Searching…</p>}
          {item === null && (
            <div className="flex items-center gap-3 text-muted-foreground">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <p className="text-sm">No item found for <span className="font-mono">{lookupSku}</span></p>
            </div>
          )}
          {item && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">{item.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{item.sku}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="rounded-lg bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">On Hand</p>
                  <p className="font-semibold">{item.qty_on_hand} {item.unit}</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">Sell Price</p>
                  <p className="font-semibold">{formatCurrency(item.selling_price)}</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">MRP</p>
                  <p className="font-semibold">{formatCurrency(item.mrp)}</p>
                </div>
              </div>
              {item.reorder_level !== undefined && item.qty_on_hand <= item.reorder_level && (
                <div className="flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="h-3.5 w-3.5" /> Low stock alert
                </div>
              )}
              <div className="flex gap-2">
                <Link href={`/inventory/${item._id}`}
                  className="rounded-lg border px-3 py-1.5 text-sm hover:bg-accent">
                  View Details
                </Link>
                <Link href={`/movements/new?item=${item._id}`}
                  className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                  Record Movement
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
