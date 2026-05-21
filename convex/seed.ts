import { mutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";

export const run = mutation({
  args: { force: v.optional(v.boolean()) },
  handler: async (ctx, { force }) => {
    const existing = await ctx.db.query("inventory_items").first();
    if (existing && !force) return { skipped: true };

    const catIds: Record<string, Id<"inventory_categories">> = {};

    const cats = [
      { name: "Beverages", color: "#3b82f6" },
      { name: "Dry Goods", color: "#f59e0b" },
      { name: "Packaging", color: "#10b981" },
      { name: "Cleaning", color: "#ef4444" },
    ];
    for (const c of cats) {
      const id = await ctx.db.insert("inventory_categories", {
        name: c.name,
        slug: c.name.toLowerCase().replace(/\s+/g, "-"),
        color: c.color,
        is_active: true,
      });
      catIds[c.name] = id;
    }

    // Sub-categories
    await ctx.db.insert("inventory_categories", {
      name: "Coffee",
      slug: "coffee",
      parent_id: catIds["Beverages"],
      color: "#92400e",
      is_active: true,
    });
    await ctx.db.insert("inventory_categories", {
      name: "Tea",
      slug: "tea",
      parent_id: catIds["Beverages"],
      color: "#065f46",
      is_active: true,
    });

    await ctx.db.insert("counters", { name: "sku", value: 0 });

    const items = [
      { name: "Espresso Beans 1kg", unit: "kg", cost: 800, sell: 1200, mrp: 1400, reorder: 5, qty: 23, category: "Beverages", tracks_expiry: true, shelf_life: 180 },
      { name: "Green Tea 500g", unit: "pkt", cost: 300, sell: 450, mrp: 500, reorder: 10, qty: 45, category: "Beverages", tracks_expiry: true, shelf_life: 365 },
      { name: "Sugar 50kg", unit: "bag", cost: 2200, sell: 2500, mrp: 2800, reorder: 3, qty: 8, category: "Dry Goods", tracks_expiry: false, shelf_life: undefined },
      { name: "Takeaway Cup 12oz", unit: "pcs", cost: 2, sell: 5, mrp: 6, reorder: 500, qty: 1200, category: "Packaging", tracks_expiry: false, shelf_life: undefined },
      { name: "Sanitiser 5L", unit: "btl", cost: 350, sell: 500, mrp: 600, reorder: 5, qty: 3, category: "Cleaning", tracks_expiry: true, shelf_life: 730 },
      { name: "Coffee Milk 1L", unit: "ltr", cost: 90, sell: 120, mrp: 140, reorder: 20, qty: 60, category: "Beverages", tracks_expiry: true, shelf_life: 7 },
      { name: "Kraft Paper Bags", unit: "pcs", cost: 3, sell: 8, mrp: 10, reorder: 200, qty: 850, category: "Packaging", tracks_expiry: false, shelf_life: undefined },
      { name: "Floor Cleaner 2L", unit: "btl", cost: 180, sell: 260, mrp: 300, reorder: 4, qty: 2, category: "Cleaning", tracks_expiry: false, shelf_life: undefined },
    ];

    let skuCounter = 0;
    for (const item of items) {
      skuCounter++;
      const sku = `ITEM-${String(skuCounter).padStart(4, "0")}`;
      const id = await ctx.db.insert("inventory_items", {
        sku,
        name: item.name,
        name_lower: item.name.toLowerCase(),
        category_id: catIds[item.category],
        item_type: "trading",
        unit: item.unit,
        cost_price: item.cost,
        selling_price: item.sell,
        mrp: item.mrp,
        reorder_level: item.reorder,
        tracks_batch: true,
        tracks_expiry: item.tracks_expiry,
        shelf_life_days: item.shelf_life,
        qty_on_hand: item.qty,
        is_active: true,
      });

      const expiry = item.shelf_life
        ? new Date(Date.now() + item.shelf_life * 86400000).toISOString().split("T")[0]
        : undefined;

      await ctx.db.insert("stock_batches", {
        item_id: id,
        batch_no: `BN-${sku}-01`,
        qty_received: item.qty,
        qty_remaining: item.qty,
        unit_cost: item.cost,
        expiry_date: expiry,
        received_at: Date.now() - Math.random() * 30 * 86400000,
        status: "active",
      });

      await ctx.db.insert("stock_movements", {
        item_id: id,
        type: "opening",
        direction: "in",
        qty: item.qty,
        qty_before: 0,
        qty_after: item.qty,
        unit_cost: item.cost,
        occurred_at: Date.now() - 30 * 86400000,
        notes: "Opening stock (seed)",
      });
    }
    const skuDoc = await ctx.db.query("counters").withIndex("by_name", (q) => q.eq("name", "sku")).first();
    if (!skuDoc) throw new Error("SKU counter not found");
    await ctx.db.patch(skuDoc._id, { value: skuCounter });
    return { seeded: items.length };
  },
});
