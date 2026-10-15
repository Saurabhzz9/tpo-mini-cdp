"use client";
import { Badge } from "@/components/ui/primitives";
import { api } from "@/lib/client-api";
import { date } from "@/lib/format";
import type { WorkspaceSettings } from "@/types/workspace";
import {
  Activity,
  ChartNoAxesCombined,
  ChevronDown,
  ChevronRight,
  Clock,
  Coffee,
  FlaskConical,
  Layers3,
  LayoutDashboard,
  LogOut,
  PanelLeftClose,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";

import { usePathname } from "next/navigation";
import { createContext, useContext } from "react";
const nav = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "subscribers", label: "Subscribers", icon: Users },
  { id: "segments", label: "Segments", icon: Layers3 },
  { id: "activity", label: "Activity stream", icon: Activity },
  { id: "insights", label: "Growth insights", icon: ChartNoAxesCombined },
  { id: "quality", label: "Data quality", icon: ShieldCheck },
];
const SettingsContext = createContext<WorkspaceSettings | null>(null);
export function useWorkspaceSettings() {
  const settings = useContext(SettingsContext);
  if (!settings) throw Error("Workspace settings unavailable");
  return settings;
}
export default function WorkspaceLayout({
  children,
  settings,
}: {
  children: ReactNode;
  settings: WorkspaceSettings;
}) {
  const pathname = usePathname();
  const view = pathname.startsWith("/subscribers/")
    ? "profile"
    : pathname.split("/")[1];
  const [menu, setMenu] = useState(false);
  const title =
    view === "profile"
      ? "Subscriber profile"
      : [
          ...nav,
          { id: "assistant", label: "Growth assistant" },
          { id: "lab", label: "Event lab" },
          { id: "settings", label: "Workspace settings" },
        ].find((x) => x.id === view)?.label || "Overview";
  return (
    <SettingsContext.Provider value={settings}>
      <div className="app-shell">
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <aside className={`sidebar ${menu ? "open" : ""}`}>
          <Link href="/overview" className="brand">
            <Coffee size={29} />
            <span>
              the pour over<span className="brand-dot">.</span>
              <small>READER INTELLIGENCE</small>
            </span>
          </Link>
          <div className="workspace-switch">
            <span className="workspace-icon">T</span>
            <div>
              The Pour Over<small>Growth workspace</small>
            </div>
            <ChevronDown size={14} />
          </div>
          <div className="nav-label">WORKSPACE</div>
          <nav onClick={() => setMenu(false)}>
            {nav.map((n) => (
              <Link
                key={n.id}
                href={`/${n.id}`}
                className={
                  view === n.id ||
                  (view === "profile" && n.id === "subscribers")
                    ? "active"
                    : ""
                }
              >
                <n.icon size={18} />
                {n.label}
                {n.id === "quality" && <span className="nav-dot" />}
              </Link>
            ))}
          </nav>
          <div className="nav-label tools-label">TOOLS</div>
          <nav>
            <Link
              href="/assistant"
              className={view === "assistant" ? "active" : ""}
            >
              <Sparkles size={18} />
              Growth assistant<Badge tone="coral">AI</Badge>
            </Link>
            {settings?.role === "admin" && (
              <Link href="/lab" className={view === "lab" ? "active" : ""}>
                <FlaskConical size={18} />
                Event lab
              </Link>
            )}
          </nav>
          <div className="sidebar-bottom">
            <div className="privacy-card">
              <ShieldCheck size={19} />
              <div>
                Privacy by design<small>Your readers stay your readers.</small>
              </div>
            </div>
            <Link
              className={`settings-link ${view === "settings" ? "active" : ""}`}
              href="/settings"
            >
              <Settings size={17} />
              Settings
            </Link>
            <div className="user-card">
              <span className="avatar">
                {settings?.username?.slice(0, 2).toUpperCase() || "GR"}
              </span>
              <div>
                {settings?.username || "Growth team"}
                <small>
                  {settings?.role === "admin"
                    ? "Administrator"
                    : "Growth analyst"}
                </small>
              </div>
              <button
                className="icon-button"
                aria-label="Sign out"
                onClick={async () => {
                  await api("auth/logout", {});
                  window.location.href = "/login";
                }}
              >
                <LogOut size={17} />
              </button>
            </div>
          </div>
        </aside>
        <div className="app-body">
          <header className="topbar">
            <div className="breadcrumb">
              <button
                className="icon-button menu-button"
                aria-label="Toggle navigation"
                aria-expanded={menu}
                onClick={() => setMenu(!menu)}
              >
                <PanelLeftClose size={20} />
              </button>
              <span>Workspace</span>
              <ChevronRight size={13} />
              <strong>{title}</strong>
            </div>
            <div className="topbar-right">
              <span className="live-status">
                <i /> Live database
              </span>
              <span className="date-pill">
                <Clock size={13} />
                {date(`${settings?.analysisDate || "2026-09-28"}T12:00:00Z`)}
              </span>
              <span className="avatar top-avatar">T</span>
            </div>
          </header>
          <main id="main">{children}</main>
          <footer className="footer">
            <span>
              <Coffee size={13} /> The Pour Over · Made for meaningful growth
            </span>
            <span>
              Historical analysis as of{" "}
              {date(`${settings?.analysisDate || "2026-09-28"}T12:00:00Z`)} ·
              Live events update separately
            </span>
          </footer>
          <div className="assessment-notice">
            © 2026 Saurabh Rai · Saurabhzz9. Assessment use only. Reuse requires
            written permission.
          </div>
        </div>
      </div>
    </SettingsContext.Provider>
  );
}
