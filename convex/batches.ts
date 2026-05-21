import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const listByItem = query({
  args: { item_id: v.id("inventory_items") },
  handler: async (ctx, { item_id }) =>
    ctx.db
      .query("stock_batches")
      .withIndex("by_item", (q) => q.eq("item_id", item_id))
      .order("desc")
      .collect(),
});

export const listExpiring = query({
  args: { days: v.optional(v.number()) },
  handler: async (ctx, { days = 30 }) => {
    const cutoff = new Date(Date.now() + days * 86400000)
      .toISOString()
      .split("T")[0];
    const batches = await ctx.db
      .query("stock_batches")
      .withIndex("by_expiry")
      .collect();
    return batches.filter(
      (b) =>
        b.status === "active" &&
        b.expiry_date !== undefined &&
        b.expiry_date <= cutoff,
    );
  },
});

export const listAll = query({
  args: { status: v.optional(v.string()) },
  handler: async (ctx, { status }) => {
    const batches = await ctx.db.query("stock_batches").order("desc").collect();
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
    const results: string[] = [];
    for (const entry of entries) {
      const item = await ctx.db.get(entry.item_id);
      if (!item) continue;

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
      .withIndex("by_expiry")
      .collect();
    let count = 0;
    for (const b of batches) {
      if (b.status === "active" && b.expiry_date && b.expiry_date < today) {
        await ctx.db.patch(b._id, { status: "expired" });
        count++;
      }
    }
    return count;
  },
});
