# Saiga Inventory

A standalone inventory management demo module built with **Next.js 16 + Convex + Tailwind CSS v4 + shadcn/ui**.

## Features

| Feature | Description |
|---|---|
| **Inventory Save** | Full CRUD for items with SKU auto-generation |
| **QR Code** | Per-item QR generation + camera scanner for quick lookup |
| **Categories** | Hierarchical categories with colour coding (parent + sub-category) |
| **Item Detail** | Photo upload, description, type, unit |
| **Pricing** | 5 price tiers: cost, selling, wholesale, MRP, special/promo |
| **Low Stock Alerts** | Configurable reorder level per item, alert dashboard |
| **Expiry Alerts** | Batch-level expiry tracking, 7-day and 30-day warning rings |
| **Stock Ageing** | Visual bucketing of inventory by days in stock (0–30, 31–60, 61–90, 90+) |
| **Stock Movement** | Full audit trail: receipt, sale, adjustment, transfer, return, wastage |
| **360° Item View** | Single page showing stock, batches, movements, pricing, QR, ageing |
| **Batch Entry** | Multi-row batch form for bulk receipt entry |
| **CSV Export** | Download inventory + movement logs as CSV |
| **CSV Import** | Upload a CSV to bulk-create inventory items |

## Tech Stack

- **Next.js 16** (App Router, RSC)
- **Convex** (real-time database + serverless functions)
- **Tailwind CSS v4**
- **shadcn/ui** component primitives
- **Recharts** for trend and ageing charts
- **qrcode** for QR generation
- **@yudiel/react-qr-scanner** for camera scanning
- **papaparse** for CSV operations
- **react-hook-form + zod** for form validation

## Getting Started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Set up Convex

```bash
pnpm convex:dev
```

This will prompt you to log in or create a free Convex account, then provision a deployment.
Copy the `NEXT_PUBLIC_CONVEX_URL` value from the output.

### 3. Environment

Create `.env.local`:

```env
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
```

### 4. Seed demo data (optional)

Once Convex is running, seed sample items via the Convex dashboard or CLI:

```bash
npx convex run seed:run
```

### 5. Run dev server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
saiga-inventory/
├── convex/
│   ├── schema.ts          # Database schema
│   ├── categories.ts      # Category CRUD
│   ├── items.ts           # Item CRUD + dashboard stats
│   ├── batches.ts         # Batch management
│   ├── movements.ts       # Stock movements + ageing + trends
│   └── seed.ts            # Demo seed data
└── src/
    ├── app/(app)/
    │   ├── dashboard/     # Overview with charts + alerts
    │   ├── inventory/     # Item list + 360° detail + create/edit
    │   ├── categories/    # Category tree management
    │   ├── movements/     # Movement log + record form
    │   ├── batches/       # Batch list + bulk entry
    │   ├── scanner/       # QR/barcode camera scanner
    │   ├── reports/       # CSV export + import
    │   └── alerts/        # All alerts in one place
    ├── components/
    │   ├── layout/        # Sidebar, header
    │   ├── inventory/     # ItemForm, QrModal
    │   └── stock/         # Charts (ageing, trend)
    └── lib/
        ├── utils.ts       # Formatting helpers
        └── csv.ts         # CSV export/import logic
```
