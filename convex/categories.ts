import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

function validateColor(color: string | undefined) {
  if (color && !/^#[0-9a-fA-F]{3,8}$/.test(color)) {
    throw new Error("color must be a valid hex value (e.g. #3b82f6)");
  }
}

export const list = query({
  args: { includeInactive: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const cats = await ctx.db.query("inventory_categories").collect();
    return args.includeInactive ? cats : cats.filter((c) => c.is_active);
  },
});

export const get = query({
  args: { id: v.id("inventory_categories") },
  handler: async (ctx, { id }) => ctx.db.get(id),
});

export const create = mutation({
  args: {
    name: v.string(),
    parent_id: v.optional(v.id("inventory_categories")),
    color: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    validateColor(args.color);
    const slug = args.name.toLowerCase().replace(/\s+/g, "-");
    return ctx.db.insert("inventory_categories", {
      name: args.name,
      slug,
      parent_id: args.parent_id,
      color: args.color,
      description: args.description,
      is_active: true,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("inventory_categories"),
    name: v.optional(v.string()),
    color: v.optional(v.string()),
    description: v.optional(v.string()),
    is_active: v.optional(v.boolean()),
  },
  handler: async (ctx, { id, ...patch }) => {
    validateColor(patch.color);
    const updates: Record<string, unknown> = { ...patch };
    if (patch.name) updates.slug = patch.name.toLowerCase().replace(/\s+/g, "-");
    await ctx.db.patch(id, updates);
  },
});

export const remove = mutation({
  args: { id: v.id("inventory_categories") },
  handler: async (ctx, { id }) => {
    await ctx.db.patch(id, { is_active: false });
  },
});
