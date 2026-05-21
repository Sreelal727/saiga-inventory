"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  Tag,
  ArrowLeftRight,
  Layers,
  QrCode,
  FileText,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/inventory", label: "Inventory", icon: Package },
  { href: "/categories", label: "Categories", icon: Tag },
  { href: "/movements", label: "Stock Movements", icon: ArrowLeftRight },
  { href: "/batches", label: "Batches", icon: Layers },
  { href: "/scanner", label: "QR Scanner", icon: QrCode },
  { href: "/reports", label: "Reports & CSV", icon: FileText },
  { href: "/alerts", label: "Alerts", icon: AlertTriangle },
];

export function Sidebar() {
  const path = usePathname();
  return (
    <aside className="flex h-screen w-60 flex-col bg-[var(--color-sidebar)] text-[var(--color-sidebar-foreground)] border-r border-[var(--color-sidebar-border)]">
      <div className="flex h-16 items-center gap-3 px-5 border-b border-[var(--color-sidebar-border)]">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Package className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold">Saiga Inventory</p>
          <p className="text-xs text-[var(--color-sidebar-foreground)]/60">v1.0</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-0.5">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = path === href || (href !== "/dashboard" && path.startsWith(href));
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                    active
                      ? "bg-[var(--color-sidebar-accent)] text-white font-medium"
                      : "text-[var(--color-sidebar-foreground)]/70 hover:bg-[var(--color-sidebar-accent)] hover:text-white",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1">{label}</span>
                  {active && <ChevronRight className="h-3 w-3" />}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="px-4 py-3 border-t border-[var(--color-sidebar-border)]">
        <p className="text-xs text-[var(--color-sidebar-foreground)]/40">
          Demo Module • Saiga ERP
        </p>
      </div>
    </aside>
  );
}
