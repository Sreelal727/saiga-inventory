"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Tag, ChevronRight } from "lucide-react";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#0ea5e9", "#f97316"];

export default function CategoriesPage() {
  const [showForm, setShowForm] = useState(false);
  const [editCat, setEditCat] = useState<{ _id: Id<"inventory_categories">; name: string; color?: string; description?: string; parent_id?: Id<"inventory_categories"> } | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [description, setDescription] = useState("");
  const [parentId, setParentId] = useState<string>("");

  const categories = useQuery(api.categories.list, { includeInactive: false });
  const createCat = useMutation(api.categories.create);
  const updateCat = useMutation(api.categories.update);
  const removeCat = useMutation(api.categories.remove);

  function startEdit(c: typeof editCat) {
    setEditCat(c);
    setName(c?.name ?? "");
    setColor(c?.color ?? COLORS[0]);
    setDescription(c?.description ?? "");
    setParentId(c?.parent_id ?? "");
    setShowForm(true);
  }

  function resetForm() {
    setShowForm(false);
    setEditCat(null);
    setName("");
    setColor(COLORS[0]);
    setDescription("");
    setParentId("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      if (editCat) {
        await updateCat({ id: editCat._id, name, color, description: description || undefined });
        toast.success("Category updated");
      } else {
        await createCat({
          name,
          color,
          description: description || undefined,
          parent_id: parentId ? (parentId as Id<"inventory_categories">) : undefined,
        });
        toast.success("Category created");
      }
      resetForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  async function handleRemove(id: Id<"inventory_categories">) {
    try {
      await removeCat({ id });
      toast.success("Removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to remove category");
    }
  }

  const roots = categories?.filter((c) => !c.parent_id) ?? [];
  const children = (parentId: string) => categories?.filter((c) => c.parent_id === parentId) ?? [];

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{categories?.length ?? 0} categories</p>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Add Category
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-xl border bg-card p-5 space-y-4">
          <h2 className="font-semibold">{editCat ? "Edit Category" : "New Category"}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Name *</label>
              <input
                className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Category name"
                required
              />
            </div>
            {!editCat && (
              <div>
                <label className="text-xs font-medium text-muted-foreground">Parent (sub-category)</label>
                <select
                  className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                >
                  <option value="">Top-level category</option>
                  {categories?.filter((c) => !c.parent_id).map((c) => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Description</label>
              <input
                className="mt-1 h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Color</label>
              <div className="mt-2 flex gap-2 flex-wrap">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`h-7 w-7 rounded-full transition-transform ${color === c ? "ring-2 ring-offset-2 ring-ring scale-110" : ""}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setColor(c)}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              {editCat ? "Save" : "Create"}
            </button>
            <button type="button" onClick={resetForm} className="rounded-lg border px-4 py-1.5 text-sm hover:bg-accent">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Category tree */}
      <div className="rounded-xl border bg-card divide-y">
        {roots.length === 0 && (
          <div className="py-10 text-center text-muted-foreground text-sm">
            <Tag className="mx-auto h-8 w-8 opacity-30 mb-2" />
            No categories yet
          </div>
        )}
        {roots.map((root) => (
          <div key={root._id}>
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: root.color ?? "#6366f1" }} />
              <div className="flex-1">
                <p className="font-medium text-sm">{root.name}</p>
                {root.description && <p className="text-xs text-muted-foreground">{root.description}</p>}
              </div>
              <button onClick={() => startEdit(root)} className="rounded p-1.5 text-muted-foreground hover:bg-accent">
                <Edit className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => handleRemove(root._id)}
                className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            {children(root._id).map((child) => (
              <div key={child._id} className="flex items-center gap-3 px-4 py-2.5 bg-muted/20 border-t">
                <ChevronRight className="h-3 w-3 text-muted-foreground ml-2 shrink-0" />
                <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: child.color ?? root.color ?? "#6366f1" }} />
                <div className="flex-1">
                  <p className="text-sm">{child.name}</p>
                </div>
                <button onClick={() => startEdit(child)} className="rounded p-1.5 text-muted-foreground hover:bg-accent">
                  <Edit className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => handleRemove(child._id)}
                  className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
