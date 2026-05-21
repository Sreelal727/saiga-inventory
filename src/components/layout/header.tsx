"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

const pageActions: Record<string, { label: string; href: string }> = {
  "/inventory": { label: "Add Item", href: "/inventory/new" },
  "/movements": { label: "Record Movement", href: "/movements/new" },
};

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/inventory": "Inventory",
  "/categories": "Categories",
  "/movements": "Stock Movements",
  "/batches": "Batch Management",
  "/scanner": "QR Scanner",
  "/reports": "Reports & CSV",
  "/alerts": "Alerts",
};

export function Header() {
  const path = usePathname();
  const { theme, setTheme } = useTheme();

  const title = Object.entries(pageTitles).find(([k]) =>
    path === k || (k !== "/dashboard" && path.startsWith(k)),
  )?.[1] ?? "Saiga Inventory";

  const action = pageActions[path];

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur px-6">
      <h1 className="flex-1 text-lg font-semibold">{title}</h1>
      <div className="flex items-center gap-2">
        {action && (
          <Link
            href={action.href}
            className={cn(
              "flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground",
              "hover:bg-primary/90 transition-colors",
            )}
          >
            <Plus className="h-4 w-4" />
            {action.label}
          </Link>
        )}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>
    </header>
  );
}
