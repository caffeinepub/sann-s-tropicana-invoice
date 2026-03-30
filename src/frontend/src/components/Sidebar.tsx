import { cn } from "@/lib/utils";
import { BarChart3, FilePlus, Hotel, LayoutDashboard } from "lucide-react";

export type Page = "dashboard" | "new-invoice" | "gst-reports";

interface SidebarProps {
  activePage: Page;
  onNavigate: (page: Page) => void;
}

const navItems: {
  id: Page;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "new-invoice", label: "New Invoice", icon: FilePlus },
  { id: "gst-reports", label: "GST Reports", icon: BarChart3 },
];

export default function Sidebar({ activePage, onNavigate }: SidebarProps) {
  return (
    <aside
      className="w-[240px] flex-shrink-0 h-screen bg-sidebar flex flex-col"
      data-ocid="sidebar.panel"
    >
      {/* Logo */}
      <div className="px-5 py-6 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <Hotel className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          <div>
            <p className="text-sidebar-foreground font-bold text-sm leading-tight">
              Sann's
            </p>
            <p className="text-sidebar-foreground/70 text-[10px] leading-tight tracking-wide uppercase">
              Tropicana Hotel
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <button
            type="button"
            key={item.id}
            data-ocid={`sidebar.${item.id}.link`}
            onClick={() => onNavigate(item.id)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
              activePage === item.id
                ? "bg-gradient-to-r from-sidebar-primary to-sidebar-primary/80 text-sidebar-primary-foreground shadow-sm"
                : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
            )}
          >
            <item.icon className="w-4 h-4 flex-shrink-0" />
            {item.label}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-sidebar-primary/30 flex items-center justify-center">
            <Hotel className="w-4 h-4 text-sidebar-primary-foreground" />
          </div>
          <div>
            <p className="text-sidebar-foreground text-xs font-medium">
              Invoice System
            </p>
            <p className="text-sidebar-foreground/50 text-[10px]">v1.0.0</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
