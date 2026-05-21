"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Suspense } from "react";

const MOVEMENT_TYPES = [
  { value: "receipt", label: "Receipt (IN)", direction: "in" },
  { value: "sale", label: "Sale (OUT)", direction: "out" },
  { value: "adjustment", label: "Adjustment (IN)", direction: "in" },
  { value: "transfer_in", label: "Transfer In", direction: "in" },
  { value: "transfer_out", label: "Transfer Out", direction: "out" },
  { value: "return", label: "Customer Return (IN)", direction: "in" },
  { value: "wastage", label: "Wastage (OUT)", direction: "out" },
] as const;

function MovementForm() {
  const router = useRouter();
  const params = useSearchParams();
  const preItem = params.get("item") ?? "";

  const [itemId, setItemId] = useState<string>(preItem);
  const [type, setType] = useState<string>("receipt");
  const [qty, setQty] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const items = useQuery(api.items.list, {});
  const recordMovement = useMutation(api.movements.record);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!itemId || !qty) return;
    setSubmitting(true);
    try {
      await recordMovement({
        item_id: itemId as Id<"inventory_items">,
        type: type as typeof MOVEMENT_TYPES[number]["value"],
        qty: Number(qty),
        reference: reference || undefined,
        notes: notes || undefined,
      });
      toast.success("Movement recorded");
      router.push("/movements");
    } catch (err) {
      toast.error(String(err));
    } finally {
      setSubmitting(false);
    }
  }

  const selectedItem = items?.find((i) => i._id === itemId);

  return (
    <div className="max-w-lg">
      <h1 className="text-xl font-semibold mb-6">Record Stock Movement</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="rounded-xl border bg-card p-6 space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Item *</label>
            <select
              className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
              required
            >
              <option value="">Select item…</option>
              {items?.map((i) => (
                <option key={i._id} value={i._id}>{i.name} ({i.sku})</option>
              ))}
            </select>
            {selectedItem && (
              <p className="mt-1 text-xs text-muted-foreground">
                Current stock: <strong>{selectedItem.qty_on_hand} {selectedItem.unit}</strong>
              </p>
            )}
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Movement Type *</label>
            <select
              className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              {MOVEMENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Quantity *</label>
            <input
              type="number"
              min="1"
              className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder="Enter quantity"
              required
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Reference</label>
            <input
              className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Invoice / order no."
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Notes</label>
            <textarea
              className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes…"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={submitting}
            className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
            {submitting ? "Recording…" : "Record Movement"}
          </button>
          <button type="button" onClick={() => router.back()}
            className="rounded-lg border px-5 py-2 text-sm font-medium hover:bg-accent">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export default function NewMovementPage() {
  return (
    <Suspense>
      <MovementForm />
    </Suspense>
  );
}
