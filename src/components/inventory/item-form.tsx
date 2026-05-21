"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useState, useRef } from "react";
import { Upload, X } from "lucide-react";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  category_id: z.string().optional(),
  item_type: z.enum(["trading", "raw_material", "finished_good", "packaging", "consumable"]),
  unit: z.string().min(1, "Unit is required"),
  cost_price: z.coerce.number().nonnegative().optional(),
  selling_price: z.coerce.number().nonnegative().optional(),
  wholesale_price: z.coerce.number().nonnegative().optional(),
  mrp: z.coerce.number().nonnegative().optional(),
  special_price: z.coerce.number().nonnegative().optional(),
  reorder_level: z.coerce.number().nonnegative().optional(),
  reorder_qty: z.coerce.number().nonnegative().optional(),
  max_stock: z.coerce.number().nonnegative().optional(),
  barcode: z.string().optional(),
  tracks_batch: z.boolean(),
  tracks_expiry: z.boolean(),
  shelf_life_days: z.coerce.number().nonnegative().optional(),
  opening_qty: z.coerce.number().nonnegative().optional(),
});

type FormData = z.infer<typeof schema>;

const ITEM_TYPES = [
  { value: "trading", label: "Trading" },
  { value: "raw_material", label: "Raw Material" },
  { value: "finished_good", label: "Finished Good" },
  { value: "packaging", label: "Packaging" },
  { value: "consumable", label: "Consumable" },
];

const UNITS = ["pcs", "kg", "g", "ltr", "ml", "pkt", "box", "bag", "btl", "mtr", "cm", "pair", "set"];

interface Props {
  editId?: Id<"inventory_items">;
  defaultValues?: Partial<FormData & { image_id?: string }>;
}

export function ItemForm({ editId, defaultValues }: Props) {
  const router = useRouter();
  const categories = useQuery(api.categories.list, {});
  const createItem = useMutation(api.items.create);
  const updateItem = useMutation(api.items.update);
  const generateUploadUrl = useMutation(api.items.generateUploadUrl);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadedImageId, setUploadedImageId] = useState<Id<"_storage"> | undefined>(undefined);
  const fileRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      item_type: "trading",
      tracks_batch: false,
      tracks_expiry: false,
      ...defaultValues,
    },
  });

  const tracksExpiry = watch("tracks_expiry");

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setImagePreview(preview);
    const uploadUrl = await generateUploadUrl({});
    const res = await fetch(uploadUrl, { method: "POST", body: file, headers: { "Content-Type": file.type } });
    const { storageId } = await res.json() as { storageId: Id<"_storage"> };
    setUploadedImageId(storageId);
  }

  async function onSubmit(data: FormData) {
    try {
      if (editId) {
        await updateItem({
          id: editId,
          ...data,
          category_id: data.category_id ? (data.category_id as Id<"inventory_categories">) : undefined,
          image_id: uploadedImageId,
        });
        toast.success("Item updated");
      } else {
        await createItem({
          ...data,
          category_id: data.category_id ? (data.category_id as Id<"inventory_categories">) : undefined,
        });
        toast.success("Item created");
      }
      router.push("/inventory");
    } catch (err) {
      toast.error(String(err));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-3xl">
      {/* Basic Info */}
      <section className="rounded-xl border bg-card p-6 space-y-4">
        <h2 className="font-semibold text-base">Basic Information</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Item Name *" error={errors.name?.message}>
            <input {...register("name")} className={inputCls} placeholder="e.g. Espresso Beans 1kg" />
          </Field>
          <Field label="Unit *" error={errors.unit?.message}>
            <select {...register("unit")} className={inputCls}>
              {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </Field>
          <Field label="Item Type" error={errors.item_type?.message}>
            <select {...register("item_type")} className={inputCls}>
              {ITEM_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </Field>
          <Field label="Category">
            <select {...register("category_id")} className={inputCls}>
              <option value="">No category</option>
              {categories?.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Barcode / SKU override">
            <input {...register("barcode")} className={inputCls} placeholder="Optional barcode" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Description">
              <textarea {...register("description")} className={`${inputCls} min-h-[72px] resize-y`} placeholder="Short description…" />
            </Field>
          </div>
        </div>
      </section>

      {/* Photo */}
      <section className="rounded-xl border bg-card p-6 space-y-4">
        <h2 className="font-semibold text-base">Product Photo</h2>
        <div className="flex items-start gap-4">
          <div
            className="relative flex h-28 w-28 items-center justify-center rounded-xl border-2 border-dashed bg-muted cursor-pointer overflow-hidden"
            onClick={() => fileRef.current?.click()}
          >
            {imagePreview ? (
              <>
                <img src={imagePreview} alt="preview" className="h-full w-full object-cover" />
                <button type="button" onClick={(e) => { e.stopPropagation(); setImagePreview(null); setUploadedImageId(undefined); }}
                  className="absolute top-1 right-1 rounded-full bg-black/60 p-0.5 text-white">
                  <X className="h-3 w-3" />
                </button>
              </>
            ) : (
              <div className="text-center text-muted-foreground">
                <Upload className="mx-auto h-6 w-6" />
                <p className="text-xs mt-1">Upload</p>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          <p className="text-xs text-muted-foreground mt-2">Click to upload a product photo.<br />JPG, PNG, WebP (max 5MB)</p>
        </div>
      </section>

      {/* Pricing */}
      <section className="rounded-xl border bg-card p-6 space-y-4">
        <h2 className="font-semibold text-base">Pricing</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Cost Price">
            <PriceInput {...register("cost_price")} />
          </Field>
          <Field label="Selling Price">
            <PriceInput {...register("selling_price")} />
          </Field>
          <Field label="MRP">
            <PriceInput {...register("mrp")} />
          </Field>
          <Field label="Wholesale Price">
            <PriceInput {...register("wholesale_price")} />
          </Field>
          <Field label="Special / Promo Price">
            <PriceInput {...register("special_price")} />
          </Field>
        </div>
      </section>

      {/* Stock Control */}
      <section className="rounded-xl border bg-card p-6 space-y-4">
        <h2 className="font-semibold text-base">Stock Control</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Reorder Level">
            <input type="number" {...register("reorder_level")} className={inputCls} placeholder="Min stock alert" />
          </Field>
          <Field label="Reorder Qty">
            <input type="number" {...register("reorder_qty")} className={inputCls} placeholder="Qty to reorder" />
          </Field>
          <Field label="Max Stock">
            <input type="number" {...register("max_stock")} className={inputCls} placeholder="Max capacity" />
          </Field>
          {!editId && (
            <Field label="Opening Stock Qty">
              <input type="number" {...register("opening_qty")} className={inputCls} placeholder="Initial quantity" />
            </Field>
          )}
        </div>
        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" {...register("tracks_batch")} className="rounded" />
            Track batches
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" {...register("tracks_expiry")} className="rounded" />
            Track expiry
          </label>
        </div>
        {tracksExpiry && (
          <Field label="Shelf Life (days)">
            <input type="number" {...register("shelf_life_days")} className={`${inputCls} max-w-48`} placeholder="e.g. 90" />
          </Field>
        )}
      </section>

      <div className="flex gap-3">
        <button type="submit" disabled={isSubmitting}
          className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
          {isSubmitting ? "Saving…" : editId ? "Save Changes" : "Create Item"}
        </button>
        <button type="button" onClick={() => router.back()}
          className="rounded-lg border px-5 py-2 text-sm font-medium hover:bg-accent">
          Cancel
        </button>
      </div>
    </form>
  );
}

const inputCls = "h-9 w-full rounded-lg border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring";

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function PriceInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
      <input type="number" step="0.01" className={`${inputCls} pl-6`} {...props} />
    </div>
  );
}
