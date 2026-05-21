import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  inventory_categories: defineTable({
    name: v.string(),
    slug: v.string(),
    parent_id: v.optional(v.id("inventory_categories")),
    color: v.optional(v.string()),
    description: v.optional(v.string()),
    is_active: v.boolean(),
  })
    .index("by_slug", ["slug"])
    .index("by_parent", ["parent_id"]),

  inventory_items: defineTable({
    sku: v.string(),
    barcode: v.optional(v.string()),
    name: v.string(),
    name_lower: v.string(),
    description: v.optional(v.string()),
    category_id: v.optional(v.id("inventory_categories")),
    item_type: v.union(
      v.literal("trading"),
      v.literal("raw_material"),
      v.literal("finished_good"),
      v.literal("packaging"),
      v.literal("consumable"),
    ),
    unit: v.string(),

    // Pricing tiers
    cost_price: v.optional(v.number()),
    selling_price: v.optional(v.number()),
    wholesale_price: v.optional(v.number()),
    mrp: v.optional(v.number()),
    special_price: v.optional(v.number()),

    // Stock control
    reorder_level: v.optional(v.number()),
    reorder_qty: v.optional(v.number()),
    max_stock: v.optional(v.number()),

    // Batch / expiry flags
    tracks_batch: v.boolean(),
    tracks_expiry: v.boolean(),
    shelf_life_days: v.optional(v.number()),

    // Media
    image_id: v.optional(v.id("_storage")),
    qr_code: v.optional(v.string()),

    // Cached running total (updated by mutations)
    qty_on_hand: v.number(),

    is_active: v.boolean(),
  })
    .index("by_sku", ["sku"])
    .index("by_barcode", ["barcode"])
    .index("by_name_lower", ["name_lower"])
    .index("by_category", ["category_id"])
    .index("by_type", ["item_type"])
    .index("by_active", ["is_active"]),

  stock_batches: defineTable({
    item_id: v.id("inventory_items"),
    batch_no: v.string(),
    qty_received: v.number(),
    qty_remaining: v.number(),
    unit_cost: v.optional(v.number()),
    manufacture_date: v.optional(v.string()),
    expiry_date: v.optional(v.string()),
    received_at: v.number(),
    notes: v.optional(v.string()),
    status: v.union(
      v.literal("active"),
      v.literal("depleted"),
      v.literal("expired"),
      v.literal("written_off"),
    ),
  })
    .index("by_item", ["item_id"])
    .index("by_item_status", ["item_id", "status"])
    .index("by_expiry", ["expiry_date"])
    .index("by_received", ["received_at"]),

  stock_movements: defineTable({
    item_id: v.id("inventory_items"),
    batch_id: v.optional(v.id("stock_batches")),
    type: v.union(
      v.literal("receipt"),
      v.literal("sale"),
      v.literal("adjustment"),
      v.literal("transfer_in"),
      v.literal("transfer_out"),
      v.literal("return"),
      v.literal("wastage"),
      v.literal("opening"),
    ),
    direction: v.union(v.literal("in"), v.literal("out")),
    qty: v.number(),
    qty_before: v.number(),
    qty_after: v.number(),
    unit_cost: v.optional(v.number()),
    reference: v.optional(v.string()),
    notes: v.optional(v.string()),
    occurred_at: v.number(),
  })
    .index("by_item_occurred", ["item_id", "occurred_at"])
    .index("by_occurred", ["occurred_at"])
    .index("by_type", ["type"]),

  counters: defineTable({
    name: v.string(),
    value: v.number(),
  }).index("by_name", ["name"]),
});
