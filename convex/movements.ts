import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const movementType = v.union(
  v.literal("receipt"),
  v.literal("sale"),
  v.literal("adjustment"),
  v.literal("transfer_in"),
  v.literal("transfer_out"),
  v.literal("return"),
  v.literal("wastage"),
  v.literal("opening"),
);

export const listByItem = query({
  args: { item_id: v.id("inventory_items"), limit: v.optional(v.number()) },
  handler: async (ctx, { item_id, limit = 50 }) =>
    ctx.db
      .query("stock_movements")
      .withIndex("by_item_occurred", (q) => q.eq("item_id", item_id))
      .order("desc")
      .take(limit),
});

export const listRecent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 100 }) =>
    ctx.db
      .query("stock_movements")
      .withIndex("by_occurred")
      .order("desc")
      .take(limit),
});

export const listAll = query({
  args: {
    type: v.optional(movementType),
    from: v.optional(v.number()),
    to: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let movements = await ctx.db
      .query("stock_movements")
      .withIndex("by_occurred")
      .order("desc")
      .take(500);

    if (args.type) movements = movements.filter((m) => m.type === args.type);
    if (args.from) movements = movements.filter((m) => m.occurred_at >= args.from!);
    if (args.to) movements = movements.filter((m) => m.occurred_at <= args.to!);
    return movements;
  },
});

export const record = mutation({
  args: {
    item_id: v.id("inventory_items"),
    batch_id: v.optional(v.id("stock_batches")),
    type: movementType,
    qty: v.number(),
    unit_cost: v.optional(v.number()),
    reference: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.qty <= 0) throw new Error("qty must be positive");
    const item = await ctx.db.get(args.item_id);
    if (!item) throw new Error("Item not found");

    const isIn = ["receipt", "return", "transfer_in", "adjustment", "opening"].includes(args.type);
    const direction = isIn ? "in" : "out";

    const qty_before = item.qty_on_hand;
    const qty_after = isIn
      ? qty_before + args.qty
      : Math.max(0, qty_before - args.qty);

    await ctx.db.patch(args.item_id, { qty_on_hand: qty_after });

    if (args.batch_id) {
      const batch = await ctx.db.get(args.batch_id);
      if (batch && !isIn) {
        const remaining = Math.max(0, batch.qty_remaining - args.qty);
        await ctx.db.patch(args.batch_id, {
          qty_remaining: remaining,
          status: remaining === 0 ? "depleted" : "active",
        });
      }
    }

    return ctx.db.insert("stock_movements", {
      item_id: args.item_id,
      batch_id: args.batch_id,
      type: args.type,
      direction,
      qty: args.qty,
      qty_before,
      qty_after,
      unit_cost: args.unit_cost,
      reference: args.reference,
      notes: args.notes,
      occurred_at: Date.now(),
    });
  },
});

export const stockAgeing = query({
  args: {},
  handler: async (ctx) => {
    const batches = await ctx.db
      .query("stock_batches")
      .withIndex("by_received")
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    const now = Date.now();
    const buckets = { "0-30": 0, "31-60": 0, "61-90": 0, "90+": 0 };
    for (const b of batches) {
      if (b.qty_remaining === 0) continue;
      const days = Math.floor((now - b.received_at) / 86400000);
      if (days <= 30) buckets["0-30"] += b.qty_remaining;
      else if (days <= 60) buckets["31-60"] += b.qty_remaining;
      else if (days <= 90) buckets["61-90"] += b.qty_remaining;
      else buckets["90+"] += b.qty_remaining;
    }
    return [
      { label: "0-30 days", qty: buckets["0-30"] },
      { label: "31-60 days", qty: buckets["31-60"] },
      { label: "61-90 days", qty: buckets["61-90"] },
      { label: "90+ days", qty: buckets["90+"] },
    ];
  },
});

export const movementTrend = query({
  args: { days: v.optional(v.number()) },
  handler: async (ctx, { days = 14 }) => {
    const since = Date.now() - days * 86400000;
    const movements = await ctx.db
      .query("stock_movements")
      .withIndex("by_occurred", (q) => q.gte("occurred_at", since))
      .order("asc")
      .collect();

    const byDay: Record<string, { in: number; out: number }> = {};
    for (const m of movements) {
      const day = new Date(m.occurred_at).toISOString().split("T")[0];
      if (!byDay[day]) byDay[day] = { in: 0, out: 0 };
      if (m.direction === "in") byDay[day].in += m.qty;
      else byDay[day].out += m.qty;
    }

    return Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, ...v }));
  },
});
