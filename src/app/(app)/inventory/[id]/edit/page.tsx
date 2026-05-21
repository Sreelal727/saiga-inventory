"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";
import { ItemForm } from "@/components/inventory/item-form";

export default function EditItemPage() {
  const { id } = useParams<{ id: string }>();
  const item = useQuery(api.items.get, { id: id as Id<"inventory_items"> });

  if (!item) return <div className="py-16 text-center text-muted-foreground">Loading…</div>;

  return (
    <div>
      <h1 className="text-xl font-semibold mb-6">Edit: {item.name}</h1>
      <ItemForm
        editId={item._id}
        defaultValues={{
          name: item.name,
          description: item.description,
          category_id: item.category_id,
          item_type: item.item_type,
          unit: item.unit,
          cost_price: item.cost_price,
          selling_price: item.selling_price,
          wholesale_price: item.wholesale_price,
          mrp: item.mrp,
          special_price: item.special_price,
          reorder_level: item.reorder_level,
          reorder_qty: item.reorder_qty,
          max_stock: item.max_stock,
          barcode: item.barcode,
          tracks_batch: item.tracks_batch,
          tracks_expiry: item.tracks_expiry,
          shelf_life_days: item.shelf_life_days,
        }}
      />
    </div>
  );
}
