import Papa from "papaparse";

export interface CsvItemRow {
  sku: string;
  name: string;
  category: string;
  unit: string;
  item_type: string;
  cost_price: string;
  selling_price: string;
  wholesale_price: string;
  mrp: string;
  special_price: string;
  qty_on_hand: string;
  reorder_level: string;
  tracks_batch: string;
  tracks_expiry: string;
  barcode: string;
  description: string;
}

export function exportItemsToCsv(
  items: Array<{
    sku: string;
    name: string;
    unit: string;
    item_type: string;
    cost_price?: number;
    selling_price?: number;
    wholesale_price?: number;
    mrp?: number;
    special_price?: number;
    qty_on_hand: number;
    reorder_level?: number;
    tracks_batch: boolean;
    tracks_expiry: boolean;
    barcode?: string;
    description?: string;
    categoryName?: string;
  }>,
): string {
  const rows = items.map((i) => ({
    sku: i.sku,
    name: i.name,
    category: i.categoryName ?? "",
    unit: i.unit,
    item_type: i.item_type,
    cost_price: i.cost_price ?? "",
    selling_price: i.selling_price ?? "",
    wholesale_price: i.wholesale_price ?? "",
    mrp: i.mrp ?? "",
    special_price: i.special_price ?? "",
    qty_on_hand: i.qty_on_hand,
    reorder_level: i.reorder_level ?? "",
    tracks_batch: i.tracks_batch ? "yes" : "no",
    tracks_expiry: i.tracks_expiry ? "yes" : "no",
    barcode: i.barcode ?? "",
    description: i.description ?? "",
  }));
  return Papa.unparse(rows);
}

export function exportMovementsToCsv(
  movements: Array<{
    occurred_at: number;
    type: string;
    direction: string;
    qty: number;
    qty_before: number;
    qty_after: number;
    unit_cost?: number;
    reference?: string;
    notes?: string;
    itemName?: string;
  }>,
): string {
  const rows = movements.map((m) => ({
    date: new Date(m.occurred_at).toISOString().split("T")[0],
    item: m.itemName ?? "",
    type: m.type,
    direction: m.direction,
    qty: m.qty,
    qty_before: m.qty_before,
    qty_after: m.qty_after,
    unit_cost: m.unit_cost ?? "",
    reference: m.reference ?? "",
    notes: m.notes ?? "",
  }));
  return Papa.unparse(rows);
}

export function parseItemsCsv(csv: string): CsvItemRow[] {
  const result = Papa.parse<CsvItemRow>(csv, {
    header: true,
    skipEmptyLines: true,
  });
  return result.data;
}

export function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
