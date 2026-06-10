"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "🏠" },
  { href: "/leagues",   label: "Ligues",    icon: "🏆" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-surface border-t border-border z-50 md:hidden">
      <div className="flex">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex-1 flex flex-col items-center py-3 text-xs font-medium transition-colors",
              pathname.startsWith(item.href)
                ? "text-primary"
                : "text-muted hover:text-dark"
            )}
          >
            <span className="text-xl mb-0.5">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
