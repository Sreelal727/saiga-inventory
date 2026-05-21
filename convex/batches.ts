import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { MS_PER_DAY } from "./constants";

const batchStatus = v.union(
  v.literal("active"),
  v.literal("depleted"),
  v.literal("expired"),
  v.literal("written_off"),
);

export const listByItem = query({
  args: { item_id: v.id("inventory_items") },
  handler: async (ctx, { item_id }) =>
    ctx.db
      .query("stock_batches")
      .withIndex("by_item", (q) => q.eq("item_id", item_id))
      .order("desc")
      .take(200),
});

export const listExpiring = query({
  args: { days: v.optional(v.number()) },
  handler: async (ctx, { days = 30 }) => {
    const todayStr = new Date().toISOString().split("T")[0];
    const cutoff = new Date(Date.now() + days * MS_PER_DAY)
      .toISOString()
      .split("T")[0];
    return ctx.db
      .query("stock_batches")
      .withIndex("by_expiry", (q) =>
        q.gte("expiry_date", todayStr).lte("expiry_date", cutoff),
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();
  },
});

export const listAll = query({
  args: { status: v.optional(batchStatus) },
  handler: async (ctx, { status }) => {
    const batches = await ctx.db
      .query("stock_batches")
      .order("desc")
      .take(500);
    return status ? batches.filter((b) => b.status === status) : batches;
  },
});

export const create = mutation({
  args: {
    item_id: v.id("inventory_items"),
    batch_no: v.string(),
    qty_received: v.number(),
    unit_cost: v.optional(v.number()),
    manufacture_date: v.optional(v.string()),
    expiry_date: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.qty_received <= 0) throw new Error("qty_received must be positive");
    const item = await ctx.db.get(args.item_id);
    if (!item) throw new Error("Item not found");

    const batchId = await ctx.db.insert("stock_batches", {
      ...args,
      qty_remaining: args.qty_received,
      received_at: Date.now(),
      status: "active",
    });

    const newQty = item.qty_on_hand + args.qty_received;
    await ctx.db.patch(args.item_id, { qty_on_hand: newQty });
    await ctx.db.insert("stock_movements", {
      item_id: args.item_id,
      batch_id: batchId,
      type: "receipt",
      direction: "in",
      qty: args.qty_received,
      qty_before: item.qty_on_hand,
      qty_after: newQty,
      unit_cost: args.unit_cost,
      reference: args.batch_no,
      occurred_at: Date.now(),
      notes: args.notes,
    });

    return batchId;
  },
});

export const bulkCreate = mutation({
  args: {
    entries: v.array(
      v.object({
        item_id: v.id("inventory_items"),
        batch_no: v.string(),
        qty_received: v.number(),
        unit_cost: v.optional(v.number()),
        manufacture_date: v.optional(v.string()),
        expiry_date: v.optional(v.string()),
        notes: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, { entries }) => {
    if (entries.length > 500) throw new Error("Maximum 500 entries per bulk import");
    const results: string[] = [];
    for (const entry of entries) {
      if (entry.qty_received <= 0) {
        throw new Error(`qty_received must be positive for batch ${entry.batch_no}`);
      }
      const item = await ctx.db.get(entry.item_id);
      if (!item) throw new Error(`Item ${entry.item_id} not found`);

      const batchId = await ctx.db.insert("stock_batches", {
        ...entry,
        qty_remaining: entry.qty_received,
        received_at: Date.now(),
        status: "active",
      });

      const newQty = item.qty_on_hand + entry.qty_received;
      await ctx.db.patch(entry.item_id, { qty_on_hand: newQty });
      await ctx.db.insert("stock_movements", {
        item_id: entry.item_id,
        batch_id: batchId,
        type: "receipt",
        direction: "in",
        qty: entry.qty_received,
        qty_before: item.qty_on_hand,
        qty_after: newQty,
        unit_cost: entry.unit_cost,
        reference: entry.batch_no,
        occurred_at: Date.now(),
      });
      results.push(batchId);
    }
    return results;
  },
});

export const markExpired = mutation({
  args: {},
  handler: async (ctx) => {
    const today = new Date().toISOString().split("T")[0];
    const batches = await ctx.db
      .query("stock_batches")
      .withIndex("by_expiry", (q) =>
        q.gte("expiry_date", "2000-01-01").lt("expiry_date", today),
      )
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();
    let count = 0;
    for (const b of batches) {
      await ctx.db.patch(b._id, { status: "expired" });
      count++;
    }
    return count;
  },
});
