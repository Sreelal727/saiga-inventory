"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import Link from "next/link";
import { Id } from "../../../../convex/_generated/dataModel";
import {
  Search, Package, Edit, Trash2, QrCode, AlertTriangle, Plus,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { QrModal } from "@/components/inventory/qr-modal";

export default function InventoryPage() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [qrItem, setQrItem] = useState<{ sku: string; name: string } | null>(null);

  const items = useQuery(api.items.list, {
    search: search || undefined,
    category_id: categoryFilter ? (categoryFilter as Id<"inventory_categories">) : undefined,
    low_stock_only: lowStockOnly || undefined,
  });
  const categories = useQuery(api.categories.list, {});
  const removeItem = useMutation(api.items.remove);

  async function handleDelete(id: Id<"inventory_items">, name: string) {
    if (!confirm(`Archive "${name}"?`)) return;
    await removeItem({ id });
    toast.success(`"${name}" archived`);
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            className="h-9 w-full rounded-lg border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            placeholder="Search items…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="h-9 rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="">All categories</option>
          {categories?.map((c) => (
            <option key={c._id} value={c._id}>{c.name}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 rounded-lg border bg-background px-3 text-sm cursor-pointer h-9">
          <input
            type="checkbox"
            checked={lowStockOnly}
            onChange={(e) => setLowStockOnly(e.target.checked)}
          />
          Low stock only
        </label>
        <Link
          href="/inventory/new"
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors h-9"
        >
          <Plus className="h-4 w-4" /> Add Item
        </Link>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/30">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Item</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">SKU</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Category</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">On Hand</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Selling Price</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">Value</th>
              <th className="px-4 py-3 text-center font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items === undefined && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>
            )}
            {items?.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
                  <Package className="mx-auto h-10 w-10 text-muted-foreground/40 mb-2" />
                  <p className="text-muted-foreground">No items found</p>
                  <Link href="/inventory/new" className="mt-2 inline-block text-primary text-sm hover:underline">Add your first item</Link>
                </td>
              </tr>
            )}
            {items?.map((item) => {
              const isLow = item.reorder_level !== undefined && item.qty_on_hand <= item.reorder_level;
              const cat = categories?.find((c) => c._id === item.category_id);
              return (
                <tr key={item._id} className="border-t hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <Package className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <Link href={`/inventory/${item._id}`} className="font-medium hover:text-primary">
                          {item.name}
                        </Link>
                        <p className="text-xs text-muted-foreground">{item.unit}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{item.sku}</td>
                  <td className="px-4 py-3">
                    {cat ? (
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                        style={{ backgroundColor: `${cat.color ?? "#6366f1"}20`, color: cat.color ?? "#6366f1" }}>
                        {cat.name}
                      </span>
                    ) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {isLow && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
                      <span className={isLow ? "text-amber-600 font-semibold" : ""}>
                        {item.qty_on_hand} {item.unit}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {formatCurrency(item.selling_price)}
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    {formatCurrency((item.cost_price ?? 0) * item.qty_on_hand)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => setQrItem({ sku: item.sku, name: item.name })}
                        className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        title="QR Code"
                      >
                        <QrCode className="h-4 w-4" />
                      </button>
                      <Link href={`/inventory/${item._id}/edit`}
                        className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => handleDelete(item._id, item.name)}
                        className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        title="Archive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {qrItem && (
        <QrModal
          sku={qrItem.sku}
          name={qrItem.name}
          onClose={() => setQrItem(null)}
        />
      )}
    </div>
  );
}
