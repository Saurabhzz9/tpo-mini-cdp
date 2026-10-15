"use client";
import styles from "./overview.module.css";
import { css } from "@/lib/css";
import {
  Badge,
  Card,
  Header,
  Loading,
  Metric,
} from "@/components/ui/primitives";
import { useData } from "@/hooks/use-data";
import { fmt } from "@/lib/format";
import type { Overview } from "@/types/workspace";
import {
  ArrowRight,
  ArrowUpRight,
  Globe,
  Mail,
  Plus,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Users,
  Waypoints,
} from "lucide-react";
import Link from "next/link";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
export default function OverviewScreen() {
  const { data: d, error, refresh } = useData<Overview>("overview", 15000);
  if (!d) return <Loading error={error} />;
  const s = d.summary,
    total = s.subscribers;
  return (
    <>
      <Header
        eyebrow="A LITTLE CLARITY GOES A LONG WAY"
        title="Your audience, connected."
        description="A fresh look at the people behind your newsletter."
        actions={
          <>
            <button className={css(styles, "button")} onClick={refresh}>
              <RefreshCw size={15} />
              Refresh
            </button>
            <Link href="/segments" className={css(styles, "button primary")}>
              <Plus size={16} />
              Build a segment
            </Link>
          </>
        }
      />
      <div className={css(styles, "overview-banner")}>
        <span className={css(styles, "banner-icon")}>
          <Waypoints size={23} />
        </span>
        <div>
          <strong>One audience. The whole picture.</strong>
          <p>
            Your newsletter, website, and app data are connected in one place.
          </p>
        </div>
        <Link href="/quality">
          Explore your data
          <ArrowRight size={16} />
        </Link>
      </div>
      <div className={css(styles, "metrics-grid")}>
        <Metric
          label="Unique subscribers"
          value={total}
          detail={`${fmt(s.duplicateRows)} duplicate rows unified`}
          icon={Users}
        />
        <Metric
          label="Active subscriptions"
          value={s.active}
          detail={`${((s.active / Math.max(total, 1)) * 100).toFixed(1)}% of the newsletter audience`}
          icon={Mail}
        />
        <Metric
          label="Website-connected"
          value={s.webEngaged}
          detail={`${fmt(s.linkedWebEvents)} resolved website visits`}
          icon={Globe}
        />
        <Metric
          label="App-connected"
          value={s.appLinked}
          detail={`${fmt(s.standalone)} standalone app profiles retained`}
          icon={Smartphone}
          tone="accent"
        />
      </div>
      <div className={css(styles, "dashboard-grid")}>
        <Card className={css(styles, "chart-card")}>
          <div className={css(styles, "card-heading")}>
            <div>
              <h2>A month of reader activity</h2>
              <p>Observed website visits · 30 days to the analysis date</p>
            </div>
            <Badge>
              <span className={css(styles, "legend-dot")} />
              Website visits
            </Badge>
          </div>
          <div className={css(styles, "chart")}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={d.daily}
                margin={{ top: 15, right: 10, left: -23, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="visitFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f2817d" stopOpacity={0.2} />
                    <stop
                      offset="100%"
                      stopColor="#f2817d"
                      stopOpacity={0.01}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  vertical={false}
                  stroke="#efebe9"
                  strokeDasharray="3 3"
                />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v) =>
                    new Date(v).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      timeZone: "UTC",
                    })
                  }
                  minTickGap={45}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#746b67", fontSize: 11 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#746b67", fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={{
                    border: "1px solid #e9e5e3",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Area
                  isAnimationActive={false}
                  type="monotone"
                  dataKey="visits"
                  stroke="#d86763"
                  strokeWidth={2.5}
                  fill="url(#visitFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className={css(styles, "chart-foot")}>
            <span>
              <span className={css(styles, "legend-dot")} />
              {fmt(s.webEvents)} total imported website events
            </span>
            <Link href="/insights">
              Explore insights
              <ArrowUpRight size={14} />
            </Link>
          </div>
        </Card>
        <Card className={css(styles, "acquisition-card")}>
          <div className={css(styles, "card-heading")}>
            <div>
              <h2>Where readers find us</h2>
              <p>Newsletter acquisition sources</p>
            </div>
            <ArrowUpRight size={17} />
          </div>
          <div className={css(styles, "source-bars")}>
            {d.acquisition.map((a, i) => (
              <div className={css(styles, "source-row")} key={a.source}>
                <div>
                  <span
                    className={css(
                      styles,
                      `source-dot source-${a.source.toLowerCase()}`,
                    )}
                  />
                  <span>{a.source}</span>
                  <b>{fmt(a.count)}</b>
                  <small>
                    {((a.count / Math.max(total, 1)) * 100).toFixed(0)}%
                  </small>
                </div>
                <div className={css(styles, "source-bar-track")}>
                  <i
                    style={{
                      width: `${(a.count / Math.max(...d.acquisition.map((x) => x.count), 1)) * 100}%`,
                      background: [
                        "#e07874",
                        "#d2a17c",
                        "#829b8d",
                        "#96a9b7",
                        "#b7a4b5",
                        "#c5b797",
                        "#b9b7b2",
                      ][i],
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <div className={css(styles, "bottom-grid")}>
        <Card>
          <div className={css(styles, "card-heading")}>
            <div>
              <h2>A healthier audience starts here</h2>
              <p>Newsletter engagement at a glance</p>
            </div>
            <Mail size={18} />
          </div>
          <div className={css(styles, "health-strip")}>
            <i
              style={{
                flex: Math.max(0, total - s.inactive),
                background: "#668c76",
              }}
            />
            <i
              style={{
                flex: Math.max(0, s.inactive - s.neverOpened),
                background: "#c29b68",
              }}
            />
            <i style={{ flex: s.neverOpened, background: "#dcd6d2" }} />
          </div>
          <div className={css(styles, "health-stats")}>
            <div>
              <span>
                <i style={{ background: "#668c76" }} />
                Opened in 30 days
              </span>
              <strong>{fmt(total - s.inactive)}</strong>
            </div>
            <div>
              <span>
                <i style={{ background: "#c29b68" }} />
                30+ days since open
              </span>
              <strong>{fmt(s.inactive - s.neverOpened)}</strong>
            </div>
            <div>
              <span>
                <i style={{ background: "#dcd6d2" }} />
                Never opened
              </span>
              <strong>{fmt(s.neverOpened)}</strong>
            </div>
          </div>
          <Link className={css(styles, "text-link")} href="/segments">
            Turn understanding into a segment
            <ArrowRight size={15} />
          </Link>
        </Card>
        <Card className={css(styles, "quality-summary")}>
          <div className={css(styles, "card-heading")}>
            <div>
              <h2>Good data. Clear decisions.</h2>
              <p>Nothing swept under the rug.</p>
            </div>
            <span className={css(styles, "quality-symbol")}>
              <ShieldCheck size={22} />
            </span>
          </div>
          <div className={css(styles, "quality-mini")}>
            <div>
              <strong>{s.duplicateGroups}</strong>
              <span>Duplicate identities</span>
            </div>
            <div>
              <strong>{s.standalone}</strong>
              <span>Unmatched app users</span>
            </div>
            <div>
              <strong>{fmt(s.rawRows)}</strong>
              <span>Source rows preserved</span>
            </div>
          </div>
          <Link className={css(styles, "text-link")} href="/quality">
            Open data quality center
            <ArrowRight size={15} />
          </Link>
        </Card>
      </div>
      <div className={css(styles, "insight-nudge")}>
        <Sparkles size={20} />
        <div>
          <strong>A question about your audience?</strong>
          <span>
            Ask your Growth assistant. Only aggregate data reaches the model.
          </span>
        </div>
        <Link href="/assistant" className={css(styles, "button")}>
          Let's find out
          <ArrowUpRight size={15} />
        </Link>
      </div>
    </>
  );
}
