"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { exportItemsToCsv, exportMovementsToCsv, parseItemsCsv, downloadCsv, type CsvItemRow } from "@/lib/csv";
import { toast } from "sonner";
import { Download, Upload, FileText, Table, AlertTriangle } from "lucide-react";

export default function ReportsPage() {
  const [importing, setImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<CsvItemRow[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const items = useQuery(api.items.list, {});
  const movements = useQuery(api.movements.listAll, {});
  const categories = useQuery(api.categories.list, {});
  const createItem = useMutation(api.items.create);

  function handleExportItems() {
    if (!items) return;
    const catById = new Map(categories?.map((c) => [c._id, c]) ?? []);
    const csv = exportItemsToCsv(
      items.map((i) => ({
        ...i,
        categoryName: i.category_id ? catById.get(i.category_id)?.name : undefined,
      })),
    );
    downloadCsv(csv, `inventory-${new Date().toISOString().split("T")[0]}.csv`);
    toast.success("Inventory exported");
  }

  function handleExportMovements() {
    if (!movements) return;
    const itemById = new Map(items?.map((i) => [i._id, i]) ?? []);
    const csv = exportMovementsToCsv(
      movements.map((m) => ({
        ...m,
        itemName: itemById.get(m.item_id)?.name,
      })),
    );
    downloadCsv(csv, `movements-${new Date().toISOString().split("T")[0]}.csv`);
    toast.success("Movements exported");
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const csv = ev.target?.result as string;
      setImportPreview(parseItemsCsv(csv));
    };
    reader.readAsText(file);
  }

const VALID_ITEM_TYPES = ["trading", "raw_material", "finished_good", "packaging", "consumable"] as const;
type ValidItemType = typeof VALID_ITEM_TYPES[number];

  async function handleImport() {
    if (importPreview.length === 0) return;
    const capped = importPreview.slice(0, 500);
    setImporting(true);
    const catByName = new Map(categories?.map((c) => [c.name.toLowerCase(), c]) ?? []);
    let success = 0;
    const errors: string[] = [];
    for (const row of capped) {
      try {
        const rawType = (row.item_type ?? "").toLowerCase();
        const itemType: ValidItemType = (VALID_ITEM_TYPES as readonly string[]).includes(rawType)
          ? (rawType as ValidItemType)
          : "trading";
        const cat = catByName.get((row.category ?? "").toLowerCase());
        await createItem({
          name: row.name ?? "",
          unit: row.unit ?? "pcs",
          item_type: itemType,
          category_id: cat?._id,
          cost_price: row.cost_price ? Number(row.cost_price) : undefined,
          selling_price: row.selling_price ? Number(row.selling_price) : undefined,
          wholesale_price: row.wholesale_price ? Number(row.wholesale_price) : undefined,
          mrp: row.mrp ? Number(row.mrp) : undefined,
          special_price: row.special_price ? Number(row.special_price) : undefined,
          reorder_level: row.reorder_level ? Number(row.reorder_level) : undefined,
          tracks_batch: row.tracks_batch === "yes",
          tracks_expiry: row.tracks_expiry === "yes",
          barcode: row.barcode || undefined,
          description: row.description || undefined,
          opening_qty: row.qty_on_hand ? Number(row.qty_on_hand) : 0,
        });
        success++;
      } catch (err) {
        errors.push(err instanceof Error ? err.message : `Row "${row.name}" failed`);
      }
    }
    if (errors.length > 0) {
      toast.error(`${errors.length} rows failed: ${errors.slice(0, 2).join("; ")}${errors.length > 2 ? "…" : ""}`);
    }
    if (success > 0) {
      toast.success(`Imported ${success} item${success > 1 ? "s" : ""}`);
    }
    setImportPreview([]);
    if (fileRef.current) fileRef.current.value = "";
    setImporting(false);
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Export section */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Download className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Export Data</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <ExportCard
            title="Inventory Items"
            description={`${items?.length ?? 0} items with all pricing, stock levels and category info`}
            icon={<Table className="h-5 w-5" />}
            onClick={handleExportItems}
          />
          <ExportCard
            title="Stock Movements"
            description={`${movements?.length ?? 0} movement records including receipts, sales and adjustments`}
            icon={<FileText className="h-5 w-5" />}
            onClick={handleExportMovements}
          />
        </div>
      </div>

      {/* Import section */}
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Upload className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Import Items from CSV</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Upload a CSV with columns: name, unit, item_type, category, cost_price, selling_price, wholesale_price, mrp, special_price, qty_on_hand, reorder_level, tracks_batch, tracks_expiry, barcode, description
        </p>

        <div
          className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 cursor-pointer hover:bg-muted/20 transition-colors"
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Click to select CSV file</p>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
        </div>

        {/* Preview */}
        {importPreview.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{importPreview.length} rows ready to import</p>
              <div className="flex gap-2">
                <button onClick={() => { setImportPreview([]); if (fileRef.current) fileRef.current.value = ""; }}
                  className="rounded-lg border px-3 py-1.5 text-sm hover:bg-accent">
                  Clear
                </button>
                <button onClick={handleImport} disabled={importing}
                  className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
                  {importing ? "Importing…" : "Import All"}
                </button>
              </div>
            </div>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-xs">
                <thead className="border-b bg-muted/30">
                  <tr>
                    {Object.keys(importPreview[0]).slice(0, 8).map((k) => (
                      <th key={k} className="px-3 py-2 text-left font-medium text-muted-foreground">{k}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {importPreview.slice(0, 5).map((row, i) => (
                    <tr key={i} className="border-t">
                      {Object.values(row).slice(0, 8).map((v, j) => (
                        <td key={j} className="px-3 py-1.5 truncate max-w-[100px]">{String(v)}</td>
                      ))}
                    </tr>
                  ))}
                  {importPreview.length > 5 && (
                    <tr><td colSpan={8} className="px-3 py-2 text-center text-muted-foreground">…and {importPreview.length - 5} more rows</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Template download */}
      <div className="rounded-xl border bg-muted/30 p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
          <div className="text-sm text-muted-foreground">
            <strong className="text-foreground">CSV Format:</strong> Download the inventory export first to see the expected column format, then modify and re-import.
            The <em>name</em>, <em>unit</em>, and <em>item_type</em> columns are required. Item type must be one of: trading, raw_material, finished_good, packaging, consumable.
          </div>
        </div>
      </div>
    </div>
  );
}

function ExportCard({ title, description, icon, onClick }: {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-start gap-4 rounded-xl border p-4 text-left hover:bg-muted/20 hover:shadow-sm transition-all group"
    >
      <div className="rounded-lg bg-primary/10 p-2.5 text-primary group-hover:bg-primary/20 transition-colors">
        {icon}
      </div>
      <div>
        <p className="font-medium text-sm">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        <p className="mt-2 text-xs text-primary font-medium flex items-center gap-1">
          <Download className="h-3 w-3" /> Download CSV
        </p>
      </div>
    </button>
  );
}
