"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { formatDate, daysUntil } from "@/lib/utils";
import { toast } from "sonner";
import { Plus, Clock, AlertTriangle } from "lucide-react";

type BatchStatus = "active" | "depleted" | "expired" | "written_off";

export default function BatchesPage() {
  const [showBatchForm, setShowBatchForm] = useState(false);
  const [batchEntries, setBatchEntries] = useState([
    { id: crypto.randomUUID(), item_id: "", batch_no: "", qty_received: "", unit_cost: "", manufacture_date: "", expiry_date: "", notes: "" },
  ]);
  const [statusFilter, setStatusFilter] = useState<BatchStatus | "">("active");
  const [submitting, setSubmitting] = useState(false);

  const batches = useQuery(api.batches.listAll, { status: statusFilter || undefined });
  const items = useQuery(api.items.list, {});
  const bulkCreate = useMutation(api.batches.bulkCreate);
  const markExpired = useMutation(api.batches.markExpired);

  function addRow() {
    setBatchEntries((rows) => [
      ...rows,
      { id: crypto.randomUUID(), item_id: "", batch_no: "", qty_received: "", unit_cost: "", manufacture_date: "", expiry_date: "", notes: "" },
    ]);
  }

  function removeRow(i: number) {
    setBatchEntries((rows) => rows.filter((_, idx) => idx !== i));
  }

  function updateRow(i: number, field: string, value: string) {
    setBatchEntries((rows) => rows.map((r, idx) => idx === i ? { ...r, [field]: value } : r));
  }

  async function handleBulkSubmit(e: React.FormEvent) {
    e.preventDefault();
    const valid = batchEntries.filter((r) => r.item_id && r.batch_no && r.qty_received);
    if (valid.length === 0) return;
    setSubmitting(true);
    try {
      await bulkCreate({
        entries: valid.map((r) => ({
          item_id: r.item_id as Id<"inventory_items">,
          batch_no: r.batch_no,
          qty_received: Number(r.qty_received),
          unit_cost: r.unit_cost ? Number(r.unit_cost) : undefined,
          manufacture_date: r.manufacture_date || undefined,
          expiry_date: r.expiry_date || undefined,
          notes: r.notes || undefined,
        })),
      });
      toast.success(`${valid.length} batch${valid.length > 1 ? "es" : ""} added`);
      setShowBatchForm(false);
      setBatchEntries([{ id: crypto.randomUUID(), item_id: "", batch_no: "", qty_received: "", unit_cost: "", manufacture_date: "", expiry_date: "", notes: "" }]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add batches");
    } finally {
      setSubmitting(false);
    }
  }

  const itemById = useMemo(
    () => new Map(items?.map((i) => [i._id, i]) ?? []),
    [items],
  );

  function itemName(id: string) {
    return itemById.get(id)?.name ?? id;
  }

  async function handleMarkExpired() {
    try {
      const n = await markExpired({});
      toast.success(`Marked ${n} expired`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to check expiry");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <select
          className="h-9 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="depleted">Depleted</option>
          <option value="expired">Expired</option>
          <option value="written_off">Written off</option>
        </select>
        <div className="flex-1" />
        <button
          onClick={handleMarkExpired}
          className="rounded-lg border px-3 py-1.5 text-sm hover:bg-accent h-9"
        >
          Check Expiry
        </button>
        <button
          onClick={() => setShowBatchForm(true)}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 h-9"
        >
          <Plus className="h-4 w-4" /> Batch Entry
        </button>
      </div>

      {/* Bulk batch entry form */}
      {showBatchForm && (
        <form onSubmit={handleBulkSubmit} className="rounded-xl border bg-card p-5 space-y-4 overflow-x-auto">
          <h2 className="font-semibold">Batch Entry</h2>
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr>
                {["Item *", "Batch No *", "Qty *", "Unit Cost", "Mfg Date", "Expiry Date", "Notes", ""].map((h) => (
                  <th key={h} className="px-2 py-1 text-left text-xs font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {batchEntries.map((row, i) => (
                <tr key={row.id} className="border-t">
                  <td className="px-1 py-1">
                    <select className="h-8 rounded border bg-background px-2 text-xs w-40 outline-none" value={row.item_id}
                      onChange={(e) => updateRow(i, "item_id", e.target.value)}>
                      <option value="">Select…</option>
                      {items?.map((it) => <option key={it._id} value={it._id}>{it.name}</option>)}
                    </select>
                  </td>
                  <td className="px-1 py-1"><input className="h-8 w-28 rounded border bg-background px-2 text-xs outline-none" value={row.batch_no} onChange={(e) => updateRow(i, "batch_no", e.target.value)} placeholder="BN-001" /></td>
                  <td className="px-1 py-1"><input type="number" className="h-8 w-16 rounded border bg-background px-2 text-xs outline-none" value={row.qty_received} onChange={(e) => updateRow(i, "qty_received", e.target.value)} /></td>
                  <td className="px-1 py-1"><input type="number" className="h-8 w-20 rounded border bg-background px-2 text-xs outline-none" value={row.unit_cost} onChange={(e) => updateRow(i, "unit_cost", e.target.value)} /></td>
                  <td className="px-1 py-1"><input type="date" className="h-8 rounded border bg-background px-2 text-xs outline-none" value={row.manufacture_date} onChange={(e) => updateRow(i, "manufacture_date", e.target.value)} /></td>
                  <td className="px-1 py-1"><input type="date" className="h-8 rounded border bg-background px-2 text-xs outline-none" value={row.expiry_date} onChange={(e) => updateRow(i, "expiry_date", e.target.value)} /></td>
                  <td className="px-1 py-1"><input className="h-8 w-24 rounded border bg-background px-2 text-xs outline-none" value={row.notes} onChange={(e) => updateRow(i, "notes", e.target.value)} /></td>
                  <td className="px-1 py-1">
                    <button type="button" onClick={() => removeRow(i)} className="text-muted-foreground hover:text-destructive text-xs">✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex gap-2 flex-wrap">
            <button type="button" onClick={addRow} className="rounded border px-3 py-1.5 text-sm hover:bg-accent">+ Add Row</button>
            <button type="submit" disabled={submitting} className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
              {submitting ? "Saving…" : "Save Batches"}
            </button>
            <button type="button" onClick={() => setShowBatchForm(false)} className="rounded border px-3 py-1.5 text-sm hover:bg-accent">Cancel</button>
          </div>
        </form>
      )}

      {/* Batch table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/30">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Batch No</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Item</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Received</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Remaining</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Expiry</th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {batches?.length === 0 && (
              <tr><td colSpan={6} className="py-10 text-center text-muted-foreground">No batches</td></tr>
            )}
            {batches?.map((b) => {
              const days = b.expiry_date ? daysUntil(b.expiry_date) : undefined;
              const expiring = days !== undefined && days <= 30 && b.status === "active";
              return (
                <tr key={b._id} className={`border-t hover:bg-muted/20 ${expiring ? "bg-amber-50/30 dark:bg-amber-950/10" : ""}`}>
                  <td className="px-4 py-3 font-mono text-xs">{b.batch_no}</td>
                  <td className="px-4 py-3">{itemName(b.item_id)}</td>
                  <td className="px-4 py-3 text-right">{b.qty_received}</td>
                  <td className="px-4 py-3 text-right font-medium">{b.qty_remaining}</td>
                  <td className="px-4 py-3 text-right">
                    {b.expiry_date ? (
                      <div className="flex items-center justify-end gap-1">
                        {expiring && <AlertTriangle className="h-3 w-3 text-amber-500" />}
                        <span className={expiring ? "text-amber-600 font-medium" : ""}>
                          {formatDate(b.expiry_date)}
                          {expiring && days !== undefined && <span className="ml-1 text-xs">({days}d)</span>}
                        </span>
                      </div>
                    ) : "—"}
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
      </div>
    </div>
  );
}
