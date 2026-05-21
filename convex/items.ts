import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import { v } from "convex/values";

const itemType = v.union(
  v.literal("trading"),
  v.literal("raw_material"),
  v.literal("finished_good"),
  v.literal("packaging"),
  v.literal("consumable"),
);

export const list = query({
  args: {
    search: v.optional(v.string()),
    category_id: v.optional(v.id("inventory_categories")),
    low_stock_only: v.optional(v.boolean()),
    expiring_days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let items = await ctx.db
      .query("inventory_items")
      .withIndex("by_active", (q) => q.eq("is_active", true))
      .collect();

    if (args.search) {
      const s = args.search.toLowerCase();
      items = items.filter(
        (i) => i.name_lower.includes(s) || i.sku.toLowerCase().includes(s),
      );
    }
    if (args.category_id) {
      items = items.filter((i) => i.category_id === args.category_id);
    }
    if (args.low_stock_only) {
      items = items.filter(
        (i) =>
          i.reorder_level !== undefined && i.qty_on_hand <= i.reorder_level,
      );
    }
    return items;
  },
});

export const get = query({
  args: { id: v.id("inventory_items") },
  handler: async (ctx, { id }) => ctx.db.get(id),
});

export const getByBarcode = query({
  args: { barcode: v.string() },
  handler: async (ctx, { barcode }) =>
    ctx.db
      .query("inventory_items")
      .withIndex("by_barcode", (q) => q.eq("barcode", barcode))
      .first(),
});

export const getBySku = query({
  args: { sku: v.string() },
  handler: async (ctx, { sku }) =>
    ctx.db
      .query("inventory_items")
      .withIndex("by_sku", (q) => q.eq("sku", sku))
      .first(),
});

async function nextSku(ctx: MutationCtx) {
  const counter = await ctx.db
    .query("counters")
    .withIndex("by_name", (q) => q.eq("name", "sku"))
    .first();
  if (!counter) {
    await ctx.db.insert("counters", { name: "sku", value: 1 });
    return "ITEM-0001";
  }
  const next = counter.value + 1;
  await ctx.db.patch(counter._id, { value: next });
  return `ITEM-${String(next).padStart(4, "0")}`;
}

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    category_id: v.optional(v.id("inventory_categories")),
    item_type: itemType,
    unit: v.string(),
    cost_price: v.optional(v.number()),
    selling_price: v.optional(v.number()),
    wholesale_price: v.optional(v.number()),
    mrp: v.optional(v.number()),
    special_price: v.optional(v.number()),
    reorder_level: v.optional(v.number()),
    reorder_qty: v.optional(v.number()),
    max_stock: v.optional(v.number()),
    tracks_batch: v.boolean(),
    tracks_expiry: v.boolean(),
    shelf_life_days: v.optional(v.number()),
    barcode: v.optional(v.string()),
    opening_qty: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const sku = await nextSku(ctx);
    const { opening_qty, ...rest } = args;
    const id = await ctx.db.insert("inventory_items", {
      ...rest,
      sku,
      name_lower: args.name.toLowerCase(),
      qty_on_hand: opening_qty ?? 0,
      is_active: true,
    });

    if (opening_qty && opening_qty > 0) {
      await ctx.db.insert("stock_movements", {
        item_id: id,
        type: "opening",
        direction: "in",
        qty: opening_qty,
        qty_before: 0,
        qty_after: opening_qty,
        occurred_at: Date.now(),
        notes: "Opening stock",
      });
    }
    return id;
  },
});

export const update = mutation({
  args: {
    id: v.id("inventory_items"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    category_id: v.optional(v.id("inventory_categories")),
    item_type: v.optional(itemType),
    unit: v.optional(v.string()),
    cost_price: v.optional(v.number()),
    selling_price: v.optional(v.number()),
    wholesale_price: v.optional(v.number()),
    mrp: v.optional(v.number()),
    special_price: v.optional(v.number()),
    reorder_level: v.optional(v.number()),
    reorder_qty: v.optional(v.number()),
    max_stock: v.optional(v.number()),
    tracks_batch: v.optional(v.boolean()),
    tracks_expiry: v.optional(v.boolean()),
    shelf_life_days: v.optional(v.number()),
    barcode: v.optional(v.string()),
    image_id: v.optional(v.id("_storage")),
    qr_code: v.optional(v.string()),
    is_active: v.optional(v.boolean()),
  },
  handler: async (ctx, { id, ...patch }) => {
    const updates: Record<string, unknown> = { ...patch };
    if (patch.name) updates.name_lower = patch.name.toLowerCase();
    await ctx.db.patch(id, updates);
  },
});

export const remove = mutation({
  args: { id: v.id("inventory_items") },
  handler: async (ctx, { id }) => {
    await ctx.db.patch(id, { is_active: false });
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => ctx.storage.generateUploadUrl(),
});

export const getImageUrl = query({
  args: { image_id: v.optional(v.id("_storage")) },
  handler: async (ctx, { image_id }) =>
    image_id ? ctx.storage.getUrl(image_id) : null,
});

export const dashboardStats = query({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db
      .query("inventory_items")
      .withIndex("by_active", (q) => q.eq("is_active", true))
      .collect();

    const total = items.length;
    const lowStock = items.filter(
      (i) => i.reorder_level !== undefined && i.qty_on_hand <= i.reorder_level,
    ).length;
    const outOfStock = items.filter((i) => i.qty_on_hand === 0).length;
    const totalValue = items.reduce(
      (sum, i) => sum + i.qty_on_hand * (i.cost_price ?? 0),
      0,
    );

    const todayStr = new Date().toISOString().split("T")[0];
    const in7Days = new Date(Date.now() + 7 * 86400000)
      .toISOString()
      .split("T")[0];
    const expiringBatches = await ctx.db
      .query("stock_batches")
      .withIndex("by_expiry", (q) =>
        q.gte("expiry_date", todayStr).lte("expiry_date", in7Days),
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    return { total, lowStock, outOfStock, totalValue, expiringCount: expiringBatches.length };
  },
});
