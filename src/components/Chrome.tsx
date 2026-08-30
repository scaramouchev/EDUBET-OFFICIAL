import { Link, useRouterState } from "@tanstack/react-router";
import { Bell, Command, Home, Plus, Trophy, User, Zap, ChevronDown } from "lucide-react";
import { CAMPUSES, type CampusId } from "@/lib/campus";

export function TopBar({ campus }: { campus: CampusId }) {
  const c = CAMPUSES.find((x) => x.id === campus)!;
  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-5">
        <Link to="/campus" className="flex items-center gap-2.5">
          <span
            className="h-4 w-4 rounded-full"
            style={{ background: c.colors[0], boxShadow: `0 0 12px ${c.colors[0]}` }}
          />
          <span className="text-sm font-medium">{c.short}</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </Link>
        <div className="flex items-center gap-4 text-muted-foreground">
          <span className="label flex items-center gap-1 rounded-md border border-hairline px-2 py-1">
            <Command className="h-3 w-3" /> K
          </span>
          <Bell className="h-4 w-4" />
          <User className="h-4 w-4" />
        </div>
      </div>
    </header>
  );
}

const NAV = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/pulse", label: "Pulse", icon: Zap },
  { to: "/create", label: "+", icon: Plus },
  { to: "/rank", label: "Rank", icon: Trophy },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2">
      <div className="flex items-center gap-1 rounded-full border border-hairline bg-popover/80 px-2 py-1.5 backdrop-blur-xl">
        {NAV.map(({ to, label, icon: Icon }) => {
          const active = pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className={`flex w-16 flex-col items-center gap-1 rounded-full px-2 py-1.5 transition-colors ${
                active ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="label !text-[0.55rem] text-inherit">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function CampusToast({ campus }: { campus: CampusId }) {
  const c = CAMPUSES.find((x) => x.id === campus)!;
  return (
    <div className="pointer-events-none fixed left-1/2 top-4 z-50 -translate-x-1/2">
      <div className="flex items-center gap-2 rounded-xl border border-hairline bg-popover/90 px-4 py-3 backdrop-blur-xl">
        <span
          className="flex h-4 w-4 items-center justify-center rounded-full text-[9px] text-background"
          style={{ background: c.colors[1] }}
        >
          ✓
        </span>
        <span className="label text-foreground">
          Campus · {c.short}
        </span>
      </div>
    </div>
  );
}
