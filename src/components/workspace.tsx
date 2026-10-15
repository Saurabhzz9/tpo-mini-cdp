"use client";
import Link from "next/link";
import { useState, useEffect, useCallback, type ReactNode } from "react";
import {
  Coffee,
  LayoutDashboard,
  Users,
  Layers3,
  Activity,
  ChartNoAxesCombined,
  ShieldCheck,
  Sparkles,
  FlaskConical,
  Settings,
  ArrowUpRight,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Plus,
  Search,
  Download,
  RefreshCw,
  Check,
  LogOut,
  PanelLeftClose,
  Globe,
  Smartphone,
  Mail,
  ExternalLink,
  Upload,
  Trash2,
  X,
  Send,
  Waypoints,
  Info,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import type { Person } from "@/lib/audience";
import { fields, type Segment } from "@/lib/segments";
type Overview = Awaited<ReturnType<typeof import("@/lib/audience").overview>>;
type Profile = NonNullable<
  Awaited<ReturnType<typeof import("@/lib/audience").profile>>
>;
type Saved = { id: string; name: string; definition: Segment; count: number };
const nav = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "subscribers", label: "Subscribers", icon: Users },
  { id: "segments", label: "Segments", icon: Layers3 },
  { id: "activity", label: "Activity stream", icon: Activity },
  { id: "insights", label: "Growth insights", icon: ChartNoAxesCombined },
  { id: "quality", label: "Data quality", icon: ShieldCheck },
];
const fmt = (n: number) => new Intl.NumberFormat("en-US").format(n);
const date = (s: unknown) =>
  s
    ? new Date(String(s)).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      })
    : "—";
const time = (s: unknown) =>
  s
    ? new Date(String(s)).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "UTC",
      }) + " UTC"
    : "—";
async function api<T>(
  path: string,
  body?: unknown,
  method?: string,
): Promise<T> {
  const res = await fetch(`/api/${path}`, {
    method: method || (body ? "POST" : "GET"),
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const result = await res.json();
  if (res.status === 401 && path !== "auth/login") {
    window.location.href = "/login";
    throw new Error("Session expired");
  }
  if (!res.ok) throw new Error(result.error || "Request failed");
  return result;
}
function useData<T>(path: string, interval = 0) {
  const [data, setData] = useState<T>(),
    [error, setError] = useState("");
  const refresh = useCallback(
    () =>
      api<T>(path)
        .then((d) => {
          setData(d);
          setError("");
        })
        .catch((e) => setError(e.message)),
    [path],
  );
  useEffect(() => {
    refresh();
    if (interval) {
      const timer = setInterval(refresh, interval);
      return () => clearInterval(timer);
    }
  }, [refresh, interval]);
  return { data, error, refresh };
}
function Loading({ error }: { error?: string }) {
  return (
    <div className="loading-state">
      {error ? (
        <>
          <AlertCircle />
          {error}
        </>
      ) : (
        <>
          <RefreshCw className="spin" /> Brewing your audience view…
        </>
      )}
    </div>
  );
}
function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
function Header({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="heading-actions">{actions}</div>
    </div>
  );
}
function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`card ${className}`}>{children}</section>;
}
function Metric({
  label,
  value,
  detail,
  icon: Icon,
  tone = "",
}: {
  label: string;
  value: number;
  detail: string;
  icon: typeof Users;
  tone?: string;
}) {
  return (
    <Card className={`metric ${tone}`}>
      <div className="metric-label">
        {label}
        <Icon size={17} />
      </div>
      <div className="metric-value">{fmt(value)}</div>
      <div className="metric-detail">{detail}</div>
    </Card>
  );
}
function PersonTable({ people }: { people: Person[] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Reader</th>
            <th>Acquisition</th>
            <th>Newsletter</th>
            <th>Last opened</th>
            <th>Channels</th>
            <th>Engagement</th>
          </tr>
        </thead>
        <tbody>
          {people.map((p) => (
            <tr key={p.id}>
              <td>
                <Link className="person-link" href={`/subscribers/${p.id}`}>
                  <span className="avatar small">
                    {p.email?.slice(0, 2).toUpperCase() || "AP"}
                  </span>
                  <span>
                    {p.email || "App-only reader"}
                    {p.duplicate_count > 0 && (
                      <small>
                        {p.duplicate_count + 1} source records · duplicate
                        preserved
                      </small>
                    )}
                  </span>
                </Link>
              </td>
              <td>
                <span
                  className={`source-dot source-${p.source.toLowerCase()}`}
                />
                {p.source}
              </td>
              <td>
                <Badge
                  tone={
                    p.status === "active"
                      ? "green"
                      : p.status === "unsubscribed"
                        ? "neutral"
                        : "blue"
                  }
                >
                  {p.status}
                </Badge>
              </td>
              <td>
                {p.last_open_date ? (
                  date(p.last_open_date)
                ) : (
                  <span className="muted">Never opened</span>
                )}
              </td>
              <td>
                <div className="channels">
                  <Mail size={15} className={p.newsletter ? "on" : ""} />
                  <Globe size={15} className={p.web_visits ? "on" : ""} />
                  <Smartphone
                    size={15}
                    className={p.app_accounts ? "on" : ""}
                  />
                </div>
              </td>
              <td>
                <div className="score">
                  <span className="score-track">
                    <i style={{ width: `${p.score}%` }} />
                  </span>
                  <b>{p.score}</b>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!people.length && (
        <div className="empty">No readers match these filters.</div>
      )}
    </div>
  );
}
export default function Workspace({
  view,
  profileId,
}: {
  view: string;
  profileId?: string;
}) {
  const settings = useData<{
    username: string;
    role: string;
    analysisDate: string;
    database: string;
    aiConfigured: boolean;
    deployment: string | null;
  }>("settings");
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
        <nav>
          {nav.map((n) => (
            <Link
              key={n.id}
              href={`/${n.id}`}
              className={
                view === n.id || (view === "profile" && n.id === "subscribers")
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
          {settings.data?.role === "admin" && (
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
              {settings.data?.username?.slice(0, 2).toUpperCase() || "GR"}
            </span>
            <div>
              {settings.data?.username || "Growth team"}
              <small>
                {settings.data?.role === "admin"
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
              {date(`${settings.data?.analysisDate || "2026-09-28"}T12:00:00Z`)}
            </span>
            <span className="avatar top-avatar">T</span>
          </div>
        </header>
        <main id="main">
          {view === "overview" ? (
            <OverviewScreen />
          ) : view === "subscribers" ? (
            <SubscribersScreen />
          ) : view === "profile" ? (
            <ProfileScreen id={profileId!} />
          ) : view === "segments" ? (
            <SegmentsScreen />
          ) : view === "quality" ? (
            <QualityScreen />
          ) : view === "insights" ? (
            <InsightsScreen />
          ) : view === "activity" ? (
            <ActivityScreen />
          ) : view === "assistant" ? (
            <AssistantScreen configured={settings.data?.aiConfigured} />
          ) : view === "lab" ? (
            <LabScreen />
          ) : (
            <SettingsScreen settings={settings.data} />
          )}
        </main>
        <footer className="footer">
          <span>
            <Coffee size={13} /> The Pour Over · Made for meaningful growth
          </span>
          <span>
            Historical analysis as of{" "}
            {date(`${settings.data?.analysisDate || "2026-09-28"}T12:00:00Z`)} ·
            Live events update separately
          </span>
        </footer>
      </div>
    </div>
  );
}
function OverviewScreen() {
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
            <button className="button" onClick={refresh}>
              <RefreshCw size={15} />
              Refresh
            </button>
            <Link href="/segments" className="button primary">
              <Plus size={16} />
              Build a segment
            </Link>
          </>
        }
      />
      <div className="overview-banner">
        <span className="banner-icon">
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
      <div className="metrics-grid">
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
      <div className="dashboard-grid">
        <Card className="chart-card">
          <div className="card-heading">
            <div>
              <h2>A month of reader activity</h2>
              <p>Observed website visits · 30 days to the analysis date</p>
            </div>
            <Badge>
              <span className="legend-dot" />
              Website visits
            </Badge>
          </div>
          <div className="chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={d.daily}
                margin={{ top: 15, right: 10, left: -23, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="visitFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#bd614d" stopOpacity={0.2} />
                    <stop
                      offset="100%"
                      stopColor="#bd614d"
                      stopOpacity={0.01}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  vertical={false}
                  stroke="#eeeae5"
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
                  tick={{ fill: "#929089", fontSize: 11 }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "#929089", fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={{
                    border: "1px solid #e7e2db",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Area
                  isAnimationActive={false}
                  type="monotone"
                  dataKey="visits"
                  stroke="#ba604d"
                  strokeWidth={2.5}
                  fill="url(#visitFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-foot">
            <span>
              <span className="legend-dot" />
              {fmt(s.webEvents)} total imported website events
            </span>
            <Link href="/insights">
              Explore insights
              <ArrowUpRight size={14} />
            </Link>
          </div>
        </Card>
        <Card className="acquisition-card">
          <div className="card-heading">
            <div>
              <h2>Where readers find us</h2>
              <p>Newsletter acquisition sources</p>
            </div>
            <ArrowUpRight size={17} />
          </div>
          <div className="source-bars">
            {d.acquisition.map((a, i) => (
              <div className="source-row" key={a.source}>
                <div>
                  <span
                    className={`source-dot source-${a.source.toLowerCase()}`}
                  />
                  <span>{a.source}</span>
                  <b>{fmt(a.count)}</b>
                  <small>
                    {((a.count / Math.max(total, 1)) * 100).toFixed(0)}%
                  </small>
                </div>
                <div className="source-bar-track">
                  <i
                    style={{
                      width: `${(a.count / Math.max(...d.acquisition.map((x) => x.count), 1)) * 100}%`,
                      background: [
                        "#b66350",
                        "#d79f70",
                        "#788b70",
                        "#97a7aa",
                        "#b3a1b2",
                        "#c6b895",
                        "#b7bbad",
                      ][i],
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <div className="bottom-grid">
        <Card>
          <div className="card-heading">
            <div>
              <h2>A healthier audience starts here</h2>
              <p>Newsletter engagement at a glance</p>
            </div>
            <Mail size={18} />
          </div>
          <div className="health-strip">
            <i
              style={{
                flex: Math.max(0, total - s.inactive),
                background: "#7a8d73",
              }}
            />
            <i
              style={{
                flex: Math.max(0, s.inactive - s.neverOpened),
                background: "#d6aa75",
              }}
            />
            <i style={{ flex: s.neverOpened, background: "#d8d4cd" }} />
          </div>
          <div className="health-stats">
            <div>
              <span>
                <i style={{ background: "#7a8d73" }} />
                Opened in 30 days
              </span>
              <strong>{fmt(total - s.inactive)}</strong>
            </div>
            <div>
              <span>
                <i style={{ background: "#d6aa75" }} />
                30+ days since open
              </span>
              <strong>{fmt(s.inactive - s.neverOpened)}</strong>
            </div>
            <div>
              <span>
                <i style={{ background: "#d8d4cd" }} />
                Never opened
              </span>
              <strong>{fmt(s.neverOpened)}</strong>
            </div>
          </div>
          <Link className="text-link" href="/segments">
            Turn understanding into a segment
            <ArrowRight size={15} />
          </Link>
        </Card>
        <Card className="quality-summary">
          <div className="card-heading">
            <div>
              <h2>Good data. Clear decisions.</h2>
              <p>Nothing swept under the rug.</p>
            </div>
            <span className="quality-symbol">
              <ShieldCheck size={22} />
            </span>
          </div>
          <div className="quality-mini">
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
          <Link className="text-link" href="/quality">
            Open data quality center
            <ArrowRight size={15} />
          </Link>
        </Card>
      </div>
      <div className="insight-nudge">
        <Sparkles size={20} />
        <div>
          <strong>A question about your audience?</strong>
          <span>
            Ask your Growth assistant. Only aggregate data reaches the model.
          </span>
        </div>
        <Link href="/assistant" className="button">
          Let's find out
          <ArrowUpRight size={15} />
        </Link>
      </div>
    </>
  );
}
function SubscribersScreen() {
  const [q, setQ] = useState(""),
    [search, setSearch] = useState(""),
    [filter, setFilter] = useState(""),
    [page, setPage] = useState(1);
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(q);
      setPage(1);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);
  const { data, error } = useData<{
    people: Person[];
    total: number;
    page: number;
  }>(
    `people?q=${encodeURIComponent(search)}&filter=${filter}&page=${page}`,
    15000,
  );
  return (
    <>
      <Header
        eyebrow="THE PEOPLE BEHIND THE NUMBERS"
        title="Every reader has a story."
        description="Explore connected profiles across your newsletter, website, and app."
      />
      <Card>
        <div className="table-toolbar">
          <div className="search-input">
            <Search size={17} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Search readers"
              placeholder="Search email, source, visitor or app user ID…"
            />
          </div>
          <select
            aria-label="Filter readers"
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All readers</option>
            <option value="duplicates">Duplicate identities</option>
            <option value="app-only">Standalone app users</option>
            <option value="inactive">Inactive or never opened</option>
          </select>
        </div>
        {data ? (
          <>
            <div className="table-context">
              {fmt(data.total)} profiles{" "}
              <span>
                · Canonical identities, with original records preserved
              </span>
            </div>
            <PersonTable people={data.people} />
            <div className="pagination">
              <span>
                Page {page} of {Math.max(1, Math.ceil(data.total / 25))}
              </span>
              <button
                className="button"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft size={15} />
                Previous
              </button>
              <button
                className="button"
                disabled={page * 25 >= data.total}
                onClick={() => setPage(page + 1)}
              >
                Next
                <ChevronRight size={15} />
              </button>
            </div>
          </>
        ) : (
          <Loading error={error} />
        )}
      </Card>
    </>
  );
}
function ProfileScreen({ id }: { id: string }) {
  const { data: d, error } = useData<Profile>(`people/${id}`, 10000);
  if (!d) return <Loading error={error} />;
  const p = d.person;
  const timeline = [
    ...d.web.map((e) => ({
      id: e.id,
      title: e.page,
      channel: "Website visit",
      timestamp: e.timestamp,
      detail: e.utm_source ? `UTM: ${e.utm_source}` : "No UTM attribution",
    })),
    ...d.app.map((e) => ({
      id: String(e.event_id),
      title: String(e.event).replaceAll("_", " "),
      channel: "App activity",
      timestamp: String(e.timestamp),
      detail: JSON.stringify(e.properties),
    })),
  ].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return (
    <>
      <Link href="/subscribers" className="back-link">
        <ChevronLeft size={15} />
        All readers
      </Link>
      <Header
        eyebrow="SUBSCRIBER 360"
        title={p.email || "Standalone app reader"}
        description={`Canonical identity · ${p.id}`}
        actions={
          <Badge tone={p.status === "active" ? "green" : "neutral"}>
            {p.status}
          </Badge>
        }
      />
      <div className="metrics-grid">
        <Metric
          label="Engagement score"
          value={p.score}
          detail={`Newsletter ${p.score_breakdown.newsletter} + web ${p.score_breakdown.website} + app ${p.score_breakdown.app}`}
          icon={ChartNoAxesCombined}
        />
        <Metric
          label="Website visits"
          value={p.web_visits}
          detail={`${p.web_pages.length} distinct pages observed`}
          icon={Globe}
        />
        <Metric
          label="App activity"
          value={p.app_events}
          detail={`${p.story_reads} story reads · ${p.app_accounts} account(s)`}
          icon={Smartphone}
        />
        <Metric
          label="Source records"
          value={d.raw.length}
          detail={
            p.duplicate_count
              ? `${p.duplicate_count} duplicate row(s) preserved`
              : "Original values retained"
          }
          icon={Layers3}
        />
      </div>
      <div className="profile-grid">
        <div>
          <Card>
            <div className="card-heading">
              <div>
                <h2>Reader details</h2>
                <p>Newsletter snapshot, as supplied</p>
              </div>
              <Mail size={18} />
            </div>
            <dl className="details-grid">
              <div>
                <dt>Acquisition source</dt>
                <dd>{p.source}</dd>
              </div>
              <div>
                <dt>Signup date</dt>
                <dd>{date(p.signup_date)}</dd>
              </div>
              <div>
                <dt>Last newsletter open</dt>
                <dd>
                  {p.last_open_date ? date(p.last_open_date) : "Never opened"}
                </dd>
              </div>
              <div>
                <dt>Days since last open</dt>
                <dd>
                  {p.days_inactive === null
                    ? "No observed open"
                    : p.days_inactive + " days"}
                </dd>
              </div>
              <div>
                <dt>First website visit</dt>
                <dd>{date(p.first_web)}</dd>
              </div>
              <div>
                <dt>Latest website visit</dt>
                <dd>{date(p.last_web)}</dd>
              </div>
              <div>
                <dt>Latest app event</dt>
                <dd>{date(p.last_app)}</dd>
              </div>
              <div>
                <dt>Metadata conflicts</dt>
                <dd>{p.conflict ? "Requires review" : "None detected"}</dd>
              </div>
            </dl>
          </Card>
          <Card className="identity-card">
            <div className="card-heading">
              <div>
                <h2>Connected identities</h2>
                <p>Deterministic links, with reasons</p>
              </div>
              <Waypoints size={18} />
            </div>
            <div className="identity-root">
              <Users size={19} />
              <span>
                Canonical profile<small>{p.id}</small>
              </span>
            </div>
            <div className="identity-branches">
              {d.devices.map((device) => (
                <div key={device}>
                  <Smartphone size={16} />
                  <span>
                    {device}
                    <small>
                      Explicit account event or conservative login backfill
                    </small>
                  </span>
                </div>
              ))}
              <div>
                <Mail size={16} />
                <span>
                  {p.email || "No email available"}
                  <small>Trimmed, lowercase valid email</small>
                </span>
              </div>
              {p.app_ids.map((a) => (
                <div key={a}>
                  <Smartphone size={16} />
                  <span>
                    {a}
                    <small>
                      {p.email
                        ? "Exact normalized email match"
                        : "Standalone app identity"}
                    </small>
                  </span>
                </div>
              ))}
              {p.visitor_ids.slice(0, 12).map((v) => (
                <div key={v}>
                  <Globe size={16} />
                  <span>
                    {v}
                    <small>Unambiguous visitor email association</small>
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
        <Card className="timeline-card">
          <div className="card-heading">
            <div>
              <h2>The reader journey</h2>
              <p>Observed events · newest first · up to 200 per channel</p>
            </div>
            <Activity size={18} />
          </div>
          {timeline.length ? (
            <div className="timeline">
              {timeline.map((e) => (
                <div className="timeline-entry" key={e.id}>
                  <span className="timeline-node">
                    {e.channel === "Website visit" ? (
                      <Globe size={14} />
                    ) : (
                      <Smartphone size={14} />
                    )}
                  </span>
                  <div>
                    <small>{time(e.timestamp)}</small>
                    <strong>{e.title}</strong>
                    <p>
                      {e.channel} · {e.detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty">
              No observed website or app activity.
              <p>Newsletter open dates are snapshots, not individual events.</p>
            </div>
          )}
        </Card>
      </div>
      <Card>
        <div className="card-heading">
          <div>
            <h2>Source lineage</h2>
            <p>Original records are preserved, including duplicates.</p>
          </div>
          <Layers3 size={18} />
        </div>
        {d.raw.map((r: Record<string, unknown>) => (
          <details className="raw-record" key={String(r.id)}>
            <summary>
              {String(r.kind)} · row {String(r.row_number)}{" "}
              <Badge>
                {(r.flags as string[]).join(", ") || "Valid source"}
              </Badge>
              <ChevronDown size={15} />
            </summary>
            <pre>{JSON.stringify(r.original, null, 2)}</pre>
          </details>
        ))}
      </Card>
    </>
  );
}
const defaultSegment: Segment = {
  match: "all",
  rules: [
    { field: "source", operator: "eq", value: "Instagram" },
    { field: "days_inactive", operator: "gte", value: 30 },
  ],
};
const labels: Record<string, string> = {
  source: "Acquisition source",
  status: "Newsletter status",
  signup_date: "Signup date",
  days_inactive: "Days since newsletter open",
  never_opened: "Never opened",
  web_visits: "Website visits",
  web_page: "Visited page",
  utm_source: "UTM source",
  app_accounts: "App account count",
  app_event: "App event type",
  story_reads: "Story reads",
  score: "Engagement score",
  last_activity_days: "Days since latest activity",
  data_complete: "Complete newsletter data",
};
function SegmentsScreen() {
  const saved = useData<Saved[]>("segments", 15000),
    [definition, setDefinition] = useState<Segment>(defaultSegment),
    [name, setName] = useState("Inactive Instagram readers"),
    [editId, setEditId] = useState<string>(),
    [preview, setPreview] = useState<{ count: number; people: Person[] }>(),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  function change(d: Segment) {
    setDefinition(d);
    setPreview(undefined);
    setMessage("");
  }
  async function run(save = false) {
    setBusy(true);
    setMessage("");
    try {
      if (save) {
        await api("segments", { id: editId, name, definition });
        setMessage("Segment saved. Membership recalculates from current data.");
        setEditId(undefined);
        saved.refresh();
      }
      setPreview(await api("segments/preview", definition));
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Header
        eyebrow="FROM UNDERSTANDING TO ACTION"
        title="The right readers. A clear next step."
        description="Build dynamic audiences using newsletter, website, and app signals."
      />
      <div className="preset-row">
        <button
          className="preset"
          onClick={() => {
            change(defaultSegment);
            setName("Inactive Instagram readers");
            setEditId(undefined);
          }}
        >
          <Mail size={16} />
          Inactive Instagram readers
        </button>
        <button
          className="preset"
          onClick={() => {
            change({
              match: "all",
              rules: [{ field: "score", operator: "gte", value: 60 }],
            });
            setName("Highly engaged readers");
            setEditId(undefined);
          }}
        >
          <ChartNoAxesCombined size={16} />
          Highly engaged readers
        </button>
        <button
          className="preset"
          onClick={() => {
            change({
              match: "all",
              rules: [{ field: "never_opened", operator: "eq", value: true }],
            });
            setName("Never-opened newsletter");
            setEditId(undefined);
          }}
        >
          <Clock size={16} />
          Never opened
        </button>
        <button
          className="preset"
          onClick={() => {
            change({
              match: "all",
              rules: [
                { field: "app_accounts", operator: "gte", value: 1 },
                { field: "story_reads", operator: "gte", value: 2 },
              ],
            });
            setName("Repeat app readers");
            setEditId(undefined);
          }}
        >
          <Smartphone size={16} />
          Repeat app readers
        </button>
      </div>
      <Card className="segment-builder">
        <div className="card-heading">
          <div>
            <h2>{editId ? "Edit saved segment" : "Build your audience"}</h2>
            <p>
              Unique newsletter subscribers only. Conditions evaluate against
              live data.
            </p>
          </div>
          <Layers3 size={19} />
        </div>
        <label className="segment-name">
          Segment name
          <input
            aria-label="Segment name"
            value={name}
            maxLength={100}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <div className="match-row">
          Find readers who match{" "}
          <select
            aria-label="Match mode"
            value={definition.match}
            onChange={(e) =>
              change({ ...definition, match: e.target.value as "all" | "any" })
            }
          >
            <option value="all">all conditions (AND)</option>
            <option value="any">any condition (OR)</option>
          </select>
        </div>
        <div className="rules">
          {definition.rules.map((r, i) => (
            <div className="rule-row" key={i}>
              <span className="rule-index">
                {i === 0 ? "IF" : definition.match === "all" ? "AND" : "OR"}
              </span>
              <select
                aria-label={`Condition ${i + 1} field`}
                value={r.field}
                onChange={(e) => {
                  const rules = [...definition.rules];
                  rules[i] = {
                    ...r,
                    field: e.target.value as typeof r.field,
                    value: ["never_opened", "data_complete"].includes(
                      e.target.value,
                    )
                      ? true
                      : "",
                  };
                  change({ ...definition, rules });
                }}
              >
                {fields.map((f) => (
                  <option key={f} value={f}>
                    {labels[f]}
                  </option>
                ))}
              </select>
              <select
                aria-label={`Condition ${i + 1} operator`}
                value={r.operator}
                onChange={(e) => {
                  const rules = [...definition.rules];
                  rules[i] = {
                    ...r,
                    operator: e.target.value as typeof r.operator,
                  };
                  change({ ...definition, rules });
                }}
              >
                <option value="eq">is</option>
                <option value="neq">is not</option>
                <option value="gte">at least / on or after</option>
                <option value="lte">at most / on or before</option>
                <option value="contains">contains</option>
              </select>
              <input
                aria-label={`Condition ${i + 1} value`}
                type={
                  [
                    "days_inactive",
                    "web_visits",
                    "app_accounts",
                    "story_reads",
                    "score",
                    "last_activity_days",
                  ].includes(r.field)
                    ? "number"
                    : r.field === "signup_date"
                      ? "date"
                      : "text"
                }
                value={String(r.value)}
                placeholder="Value"
                onChange={(e) => {
                  const rules = [...definition.rules],
                    v = e.target.value;
                  rules[i] = {
                    ...r,
                    value: ["never_opened", "data_complete"].includes(r.field)
                      ? v === "true"
                      : [
                            "days_inactive",
                            "web_visits",
                            "app_accounts",
                            "story_reads",
                            "score",
                            "last_activity_days",
                          ].includes(r.field)
                        ? Number(v)
                        : v,
                  };
                  change({ ...definition, rules });
                }}
              />
              <button
                className="icon-button"
                aria-label={`Remove condition ${i + 1}`}
                disabled={definition.rules.length === 1}
                onClick={() =>
                  change({
                    ...definition,
                    rules: definition.rules.filter((_, j) => i !== j),
                  })
                }
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
        <button
          className="text-link add-rule"
          disabled={definition.rules.length >= 15}
          onClick={() =>
            change({
              ...definition,
              rules: [
                ...definition.rules,
                { field: "status", operator: "eq", value: "active" },
              ],
            })
          }
        >
          <Plus size={16} />
          Add condition
        </button>
        <div className="segment-bottom">
          <span>
            <Info size={15} />
            “Days since open” excludes never-opened readers. Use a separate OR
            rule to include them.
          </span>
          <div>
            <button className="button" disabled={busy} onClick={() => run()}>
              <Filter size={15} />
              Preview audience
            </button>
            <button
              className="button primary"
              disabled={busy || !name.trim()}
              onClick={() => run(true)}
            >
              <Check size={15} />
              {editId ? "Update segment" : "Save segment"}
            </button>
          </div>
        </div>
        {message && (
          <div className="notice" role="status">
            {message}
          </div>
        )}
      </Card>
      {preview && (
        <Card>
          <div className="card-heading">
            <div>
              <h2>{fmt(preview.count)} matching readers</h2>
              <p>Preview shows the first 25 canonical profiles.</p>
            </div>
            <Badge tone="green">Live calculation</Badge>
          </div>
          <PersonTable people={preview.people} />
        </Card>
      )}
      <div className="section-heading">
        <h2>Saved segments</h2>
        <span className="muted">{saved.data?.length || 0} audiences</span>
      </div>
      <div className="saved-grid">
        {saved.data?.map((s) => (
          <Card key={s.id}>
            <div className="saved-icon">
              <Layers3 size={19} />
            </div>
            <h3>{s.name}</h3>
            <p>
              {s.definition.rules
                .map((r) => `${labels[r.field]} ${r.operator} ${r.value}`)
                .join(s.definition.match === "all" ? " · AND · " : " · OR · ")}
            </p>
            <strong className="saved-count">
              {fmt(s.count)}
              <small> matching readers</small>
            </strong>
            <div className="saved-actions">
              <button
                className="button"
                onClick={() => {
                  setDefinition(s.definition);
                  setName(s.name);
                  setEditId(s.id);
                  setPreview(undefined);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                Edit
              </button>
              <a className="button" href={`/api/segments/${s.id}/export`}>
                <Download size={14} />
                Export CSV
              </a>
              <button
                className="icon-button"
                aria-label={`Delete ${s.name}`}
                onClick={async () => {
                  try {
                    await api(`segments/${s.id}`, undefined, "DELETE");
                    saved.refresh();
                  } catch (e) {
                    setMessage((e as Error).message);
                  }
                }}
              >
                <Trash2 size={15} />
              </button>
            </div>
          </Card>
        ))}
      </div>
      {saved.data?.length === 0 && (
        <Card>
          <div className="empty">
            <Layers3 />
            Your first audience is a few conditions away.
            <p>Save a segment above to revisit or export it.</p>
          </div>
        </Card>
      )}
    </>
  );
}
function QualityScreen() {
  const [filter, setFilter] = useState(""),
    [page, setPage] = useState(1),
    { data: d, error } = useData<{
      issues: {
        id: string;
        kind: string;
        row_number: number;
        person_id: string;
        original: unknown;
        flags: string[];
      }[];
      counts: { flag: string; count: number }[];
      visitors: { total: number; anonymous: number; ambiguous: number };
      appIdentity: {
        standalone: number;
        unresolved: number;
        ambiguous: number;
      };
      history: {
        id: string;
        kind: string;
        created_at: string;
        row_count: number;
        flagged: number;
      }[];
    }>(`quality?filter=${filter}&page=${page}`);
  return (
    <>
      <Header
        eyebrow="TRUST BEGINS WITH TRANSPARENCY"
        title="Nothing lost. Everything traceable."
        description="Inspect source records, identity decisions, and the exceptions that need attention."
      />
      {d ? (
        <>
          <div className="quality-metrics">
            {d.counts.map((c) => (
              <button
                key={c.flag}
                className={`card quality-stat ${filter === c.flag ? "selected" : ""}`}
                onClick={() => {
                  setFilter(filter === c.flag ? "" : c.flag);
                  setPage(1);
                }}
              >
                <span>{c.flag.replaceAll("_", " ")}</span>
                <strong>{fmt(c.count)}</strong>
                <small>Source rows · click to filter</small>
              </button>
            ))}
          </div>
          <div className="notice">
            <Info size={18} />
            <div>
              <strong>Duplicates are preserved, not deleted.</strong> Both
              original rows link to one canonical person. Counts above refer to
              source rows. Each duplicate group contributes one canonical reader
              to audience analytics.
            </div>
          </div>
          <Card>
            <div className="card-heading">
              <div>
                <h2>Source records requiring attention</h2>
                <p>
                  {filter ? filter.replaceAll("_", " ") : "All flagged records"}{" "}
                  · rows from the original CSV files
                </p>
              </div>
              <select
                aria-label="Issue filter"
                value={filter}
                onChange={(e) => {
                  setFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All issues</option>
                {d.counts.map((c) => (
                  <option key={c.flag} value={c.flag}>
                    {c.flag.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </div>
            {d.issues.map((r) => (
              <details className="raw-record" key={r.id}>
                <summary>
                  <span className="issue-icon">
                    <AlertCircle size={17} />
                  </span>
                  <strong>
                    {r.kind} · row {r.row_number}
                  </strong>
                  <span className="raw-badges">
                    {r.flags.map((f) => (
                      <Badge
                        tone={f === "duplicate" ? "amber" : "coral"}
                        key={f}
                      >
                        {f.replaceAll("_", " ")}
                      </Badge>
                    ))}
                  </span>
                  <ChevronDown size={15} />
                </summary>
                <div className="raw-details">
                  {r.person_id && (
                    <Link
                      className="text-link"
                      href={`/subscribers/${r.person_id}`}
                    >
                      Open canonical profile
                      <ArrowUpRight size={14} />
                    </Link>
                  )}
                  <pre>{JSON.stringify(r.original, null, 2)}</pre>
                </div>
              </details>
            ))}
            {!d.issues.length && (
              <div className="empty">No more records in this view.</div>
            )}
            <div className="pagination">
              <span>Page {page} · up to 50 rows</span>
              <button
                className="button"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </button>
              <button
                className="button"
                disabled={d.issues.length < 50}
                onClick={() => setPage(page + 1)}
              >
                Next
              </button>
            </div>
          </Card>
          <Card className="quality-history">
            <div className="card-heading">
              <div>
                <h2>Quality across imports</h2>
                <p>
                  Current flagged rows by original source batch · latest 12
                  imports
                </p>
              </div>
              <ChartNoAxesCombined size={18} />
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Source</th>
                    <th>Imported (UTC)</th>
                    <th>Rows preserved</th>
                    <th>Flagged rows</th>
                    <th>Requires attention</th>
                  </tr>
                </thead>
                <tbody>
                  {d.history.map((batch) => (
                    <tr key={batch.id}>
                      <td>{batch.kind}</td>
                      <td>{time(batch.created_at)}</td>
                      <td>{fmt(batch.row_count)}</td>
                      <td>{fmt(batch.flagged)}</td>
                      <td>
                        {batch.row_count
                          ? ((batch.flagged / batch.row_count) * 100).toFixed(1)
                          : "0.0"}
                        %
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <div className="bottom-grid">
            <Card>
              <div className="card-heading">
                <div>
                  <h2>Visitor identity coverage</h2>
                  <p>Anonymous and conflicting identities stay visible.</p>
                </div>
                <Globe size={18} />
              </div>
              <dl className="details-grid">
                <div>
                  <dt>Distinct website visitors</dt>
                  <dd>{fmt(d.visitors.total)}</dd>
                </div>
                <div>
                  <dt>Unresolved visitors</dt>
                  <dd>{fmt(d.visitors.anonymous)}</dd>
                </div>
                <div>
                  <dt>Ambiguous visitors</dt>
                  <dd>{fmt(d.visitors.ambiguous)}</dd>
                </div>
                <div>
                  <dt>Standalone app profiles</dt>
                  <dd>{fmt(d.appIdentity.standalone)}</dd>
                </div>
                <div>
                  <dt>Unresolved anonymous app events</dt>
                  <dd>{fmt(d.appIdentity.unresolved)}</dd>
                </div>
                <div>
                  <dt>Devices with conflicting user claims</dt>
                  <dd>{fmt(d.appIdentity.ambiguous)}</dd>
                </div>
              </dl>
            </Card>
            <Card>
              <div className="card-heading">
                <div>
                  <h2>Safe identity rules</h2>
                  <p>Predictable, conservative, inspectable.</p>
                </div>
                <ShieldCheck size={18} />
              </div>
              <ul className="plain-list">
                <li>Email: trim whitespace and lowercase only.</li>
                <li>
                  Invalid emails are flagged and excluded from canonical
                  newsletter counts.
                </li>
                <li>
                  A visitor with conflicting email claims is never force-linked.
                </li>
                <li>Unknown app users receive standalone profiles.</li>
              </ul>
            </Card>
          </div>
        </>
      ) : (
        <Loading error={error} />
      )}
    </>
  );
}
function InsightsScreen() {
  const { data: d, error } = useData<Overview>("overview", 15000);
  if (!d) return <Loading error={error} />;
  return (
    <>
      <Header
        eyebrow="BETTER QUESTIONS. MEANINGFUL GROWTH."
        title="See what brings readers closer."
        description="Acquisition and engagement signals grounded in the data you actually have."
      />
      <Card>
        <div className="card-heading">
          <div>
            <h2>Acquisition, beyond the signup</h2>
            <p>How each newsletter source connects with your channels</p>
          </div>
          <ChartNoAxesCombined size={18} />
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Source</th>
                <th>Subscribers</th>
                <th>Opened within 30 days</th>
                <th>Inactive / never opened</th>
                <th>Website linked</th>
                <th>App adoption</th>
              </tr>
            </thead>
            <tbody>
              {d.acquisition.map((a) => (
                <tr key={a.source}>
                  <td>
                    <span
                      className={`source-dot source-${a.source.toLowerCase()}`}
                    />
                    <strong>{a.source}</strong>
                  </td>
                  <td>{fmt(a.count)}</td>
                  <td>
                    {fmt(a.engaged)}{" "}
                    <span className="muted">
                      ({((a.engaged / a.count) * 100).toFixed(1)}%)
                    </span>
                  </td>
                  <td>{fmt(a.inactive)}</td>
                  <td>{fmt(a.web)}</td>
                  <td>
                    {fmt(a.app)}{" "}
                    <span className="muted">
                      ({((a.app / a.count) * 100).toFixed(1)}%)
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <div className="bottom-grid">
        <Card>
          <div className="card-heading">
            <div>
              <h2>Pages that bring people in</h2>
              <p>All imported website visits · not unique visitors</p>
            </div>
            <Globe size={18} />
          </div>
          <div className="page-ranking">
            {d.topPages.map((p, i) => (
              <div key={p.page}>
                <span>{String(i + 1).padStart(2, "0")}</span>
                <strong>{p.page}</strong>
                <b>{fmt(p.visits)}</b>
                <div
                  style={{
                    width: `${(p.visits / Math.max(d.topPages[0]?.visits, 1)) * 100}%`,
                  }}
                />
              </div>
            ))}
          </div>
        </Card>
        <div>
          <Card>
            <div className="card-heading">
              <div>
                <h2>Signup cohorts</h2>
                <p>Snapshot engagement · not measured retention</p>
              </div>
              <Users size={18} />
            </div>
            <div className="chart cohort-chart">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={d.cohorts}>
                  <CartesianGrid vertical={false} stroke="#eeeae5" />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip />
                  <Bar
                    isAnimationActive={false}
                    dataKey="count"
                    name="Subscribers"
                    fill="#d9cec2"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    isAnimationActive={false}
                    dataKey="engaged"
                    name="Opened in 30 days"
                    fill="#7d8d74"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card className="journey-card">
            <h2>Observed audience connections</h2>
            <p className="muted">
              These are overlapping relationships, not a causal conversion
              funnel.
            </p>
            {[
              {
                name: "Canonical newsletter readers",
                n: d.summary.subscribers,
              },
              { name: "Website-connected readers", n: d.summary.webEngaged },
              { name: "App-linked readers", n: d.summary.appLinked },
            ].map((x, i) => (
              <div className="journey-stage" key={x.name}>
                <span>{i + 1}</span>
                <div>
                  <strong>{x.name}</strong>
                  <i
                    style={{
                      width: `${(x.n / Math.max(d.summary.subscribers, 1)) * 100}%`,
                    }}
                  />
                </div>
                <b>{fmt(x.n)}</b>
              </div>
            ))}
          </Card>
        </div>
      </div>
      <div className="notice">
        <Info size={18} />
        Engagement scoring is transparent, not predictive: newsletter recency up
        to 40 points; observed website visits up to 30; app events and story
        reads up to 30. No revenue or conversion attribution is inferred.
      </div>
    </>
  );
}
function ActivityScreen() {
  const { data, error, refresh } = useData<Record<string, unknown>[]>(
    "activity",
    5000,
  );
  return (
    <>
      <Header
        eyebrow="YOUR LIVE SIGNAL"
        title="Every event, in its own time."
        description="App deliveries persist immediately. Event time and ingestion time are tracked separately."
        actions={
          <button className="button" onClick={refresh}>
            <RefreshCw size={15} />
            Refresh
          </button>
        }
      />
      <Card>
        <div className="card-heading">
          <div>
            <h2>Latest app deliveries</h2>
            <p>
              Up to 100 deliveries · refreshes every 5 seconds · test events
              labelled
            </p>
          </div>
          <Badge tone="green">
            <span className="status-dot" />
            Live
          </Badge>
        </div>
        {data ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Event ID</th>
                  <th>Resolved identity</th>
                  <th>Device</th>
                  <th>Occurred (UTC)</th>
                  <th>Received (UTC)</th>
                </tr>
              </thead>
              <tbody>
                {data.map((e) => (
                  <tr key={String(e.event_id)}>
                    <td>
                      <Badge tone={e.test ? "amber" : "green"}>
                        {String(e.event).replaceAll("_", " ")}
                        {e.test ? " · test" : ""}
                      </Badge>
                    </td>
                    <td>
                      <code>{String(e.event_id)}</code>
                    </td>
                    <td>
                      <code>{String(e.resolved_user_id || "Anonymous")}</code>
                      {!e.user_id && !!e.resolved_user_id && (
                        <small className="block muted">
                          Backfilled after login
                        </small>
                      )}
                    </td>
                    <td>
                      <code>{String(e.device_id)}</code>
                    </td>
                    <td>{time(e.timestamp)}</td>
                    <td>{time(e.ingested_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.length === 0 && (
              <div className="empty">
                <Activity />
                Your app activity will show up here.
                <p>
                  The CSVs do not include app events. Send a signed webhook or
                  use Event Lab.
                </p>
                <Link className="button" href="/lab">
                  Open Event Lab
                  <ArrowRight size={15} />
                </Link>
              </div>
            )}
          </div>
        ) : (
          <Loading error={error} />
        )}
      </Card>
    </>
  );
}
function AssistantScreen({ configured }: { configured?: boolean }) {
  const [question, setQuestion] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [result, setResult] = useState<{
      answer: string;
      data: Record<string, unknown>;
      privacy: string;
      provider: string;
    }>();
  async function ask(q = question) {
    setQuestion(q);
    setBusy(true);
    setError("");
    try {
      setResult(await api("assistant", { question: q }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Header
        eyebrow="A THOUGHTFUL PARTNER FOR GROWTH"
        title="Curiosity, meet clarity."
        description="Ask about your audience in plain English. Your readers' identities stay out of the conversation."
      />
      <div className="assistant-layout">
        <Card className="assistant-main">
          <div className="assistant-welcome">
            <span className="assistant-orb">
              <Sparkles size={28} />
            </span>
            <Badge tone={configured ? "green" : "amber"}>
              {configured
                ? "Azure AI Foundry connected"
                : "Azure AI not configured"}
            </Badge>
            <h2>What would you like to understand?</h2>
            <p>
              From audience health to your next meaningful segment,
              <br />
              let's put your data to work.
            </p>
          </div>
          <div className="suggestion-grid">
            {[
              "How many Instagram signups are inactive?",
              "Which acquisition sources perform best?",
              "Build a list of our most engaged readers",
              "Which pages do new subscribers visit first?",
            ].map((q) => (
              <button key={q} disabled={busy} onClick={() => ask(q)}>
                {q}
                <ArrowUpRight size={16} />
              </button>
            ))}
          </div>
          <form
            className="assistant-input"
            onSubmit={(e) => {
              e.preventDefault();
              ask();
            }}
          >
            <label className="sr-only" htmlFor="question">
              Ask Growth assistant
            </label>
            <input
              id="question"
              value={question}
              maxLength={1000}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a question about your audience…"
            />
            <button
              aria-label="Send question"
              className="button primary"
              disabled={busy || question.length < 3}
            >
              {busy ? (
                <RefreshCw size={18} className="spin" />
              ) : (
                <Send size={18} />
              )}
            </button>
          </form>
          {error && (
            <div className="notice error" role="alert">
              {error}
            </div>
          )}
          {result && (
            <div className="assistant-answer">
              <div>
                <Sparkles size={17} />
                <strong>Growth assistant</strong>
                <Badge tone="green">{result.provider}</Badge>
              </div>
              <p>{result.answer}</p>
              {typeof result.data.segmentReference === "string" && (
                <Link className="button" href="/segments">
                  View saved segment
                  <ArrowRight size={15} />
                </Link>
              )}
              <details>
                <summary>
                  Inspect the exact aggregate data sent to the model
                </summary>
                <pre>{JSON.stringify(result.data, null, 2)}</pre>
              </details>
              <small>
                <ShieldCheck size={13} />
                {result.privacy}
              </small>
            </div>
          )}
        </Card>
        <div>
          <Card className="assistant-privacy">
            <ShieldCheck size={24} />
            <h3>
              Useful answers.
              <br />
              Private readers.
            </h3>
            <p>
              The model receives only approved analytics requests and aggregate
              results.
            </p>
            <ul>
              <li>
                <Check size={15} />
                No emails or names
              </li>
              <li>
                <Check size={15} />
                No user, visitor, or device IDs
              </li>
              <li>
                <Check size={15} />
                No raw messages or source rows
              </li>
              <li>
                <Check size={15} />
                Groups under 5 suppressed
              </li>
              <li>
                <Check size={15} />
                No arbitrary SQL or record access
              </li>
            </ul>
          </Card>
          <div className="assistant-note">
            <Info size={16} />
            <p>
              Historical metrics use 28 September 2026. Last-open snapshots
              cannot tell us exactly when someone “went cold.” The assistant
              will explain these limits.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
function LabScreen() {
  const [device, setDevice] = useState("test_demo_device"),
    [user, setUser] = useState("test_demo_reader"),
    [kind, setKind] = useState("app_open"),
    [anonymous, setAnonymous] = useState(true),
    [offset, setOffset] = useState(-10),
    [last, setLast] = useState<Record<string, unknown>>(),
    [result, setResult] = useState<unknown>(),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [refreshKey, setRefreshKey] = useState(0);
  async function send(duplicate = false) {
    setBusy(true);
    setError("");
    try {
      const e = duplicate
        ? last
        : {
            event_id: `test_${crypto.randomUUID()}`,
            event: kind,
            user_id: anonymous ? null : user,
            device_id: device,
            timestamp: new Date(Date.now() + offset * 60000).toISOString(),
            properties:
              kind === "read_story" ? { story: "event-lab-story" } : {},
          };
      setLast(e);
      setResult(await api("lab/send", e));
      setRefreshKey((k) => k + 1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Header
        eyebrow="A SMALL LAB FOR BIG CONFIDENCE"
        title="Watch identities connect. Live."
        description="Send actual signed requests through POST /webhooks/app, without exposing signing secrets."
      />
      <div className="notice">
        <FlaskConical size={19} />
        <div>
          <strong>Isolated test activity.</strong> Event Lab requires test_
          identifiers. These events are visible in the stream and excluded from
          audience analytics. Test-only identities can be inspected in the
          activity stream.
        </div>
      </div>
      <div className="bottom-grid">
        <Card>
          <div className="card-heading">
            <div>
              <h2>Compose a delivery</h2>
              <p>HMAC-SHA256 signed on the server</p>
            </div>
            <FlaskConical size={19} />
          </div>
          <div className="form-stack">
            <label>
              Device ID
              <input
                value={device}
                onChange={(e) => setDevice(e.target.value)}
              />
            </label>
            <label>
              App user ID
              <input
                value={user}
                onChange={(e) => setUser(e.target.value)}
                disabled={anonymous}
              />
            </label>
            <label>
              Event type
              <select
                value={kind}
                onChange={(e) => {
                  setKind(e.target.value);
                  if (e.target.value === "login") setAnonymous(false);
                }}
              >
                {["app_open", "read_story", "link_click", "login"].map((k) => (
                  <option key={k}>{k}</option>
                ))}
              </select>
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={anonymous}
                disabled={kind === "login"}
                onChange={(e) => setAnonymous(e.target.checked)}
              />
              Anonymous delivery (user_id = null)
            </label>
            <label>
              Event time offset (minutes from now)
              <input
                type="number"
                value={offset}
                onChange={(e) => setOffset(Number(e.target.value))}
              />
            </label>
            <div className="button-row">
              <button
                className="button primary"
                disabled={busy}
                onClick={() => send()}
              >
                <Send size={15} />
                Send signed event
              </button>
              <button
                className="button"
                disabled={busy || !last}
                onClick={() => send(true)}
              >
                <RefreshCw size={15} />
                Redeliver same event
              </button>
            </div>
            {error && (
              <div className="notice error" role="alert">
                {error}
              </div>
            )}
          </div>
        </Card>
        <div>
          <Card>
            <div className="card-heading">
              <div>
                <h2>Processing response</h2>
                <p>The actual webhook HTTP status and result</p>
              </div>
              <Activity size={18} />
            </div>
            {result ? (
              <pre className="response-block">
                {JSON.stringify(result, null, 2)}
              </pre>
            ) : (
              <div className="empty">
                Send your first delivery to inspect the result.
              </div>
            )}
          </Card>
          <Card>
            <div className="card-heading">
              <div>
                <h2>Try the identity journey</h2>
                <p>A useful sequence for your live demo</p>
              </div>
              <Waypoints size={18} />
            </div>
            <ol className="demo-steps">
              <li>Send an anonymous app_open at −10 minutes.</li>
              <li>Switch to login, use the same device, and set −5 minutes.</li>
              <li>Watch the earlier event resolve to the app user.</li>
              <li>Redeliver the login: it returns duplicate: true.</li>
              <li>
                Send another anonymous event at −15 minutes: it backfills,
                despite arriving later.
              </li>
            </ol>
          </Card>
        </div>
      </div>
      <div key={refreshKey}>
        <ActivityScreen />
      </div>
    </>
  );
}
function SettingsScreen({
  settings,
}: {
  settings?: {
    username: string;
    role: string;
    analysisDate: string;
    database: string;
    aiConfigured: boolean;
    deployment: string | null;
  };
}) {
  const { data: overviewData, refresh } = useData<Overview>("overview"),
    [kind, setKind] = useState("subscribers"),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  async function upload(file: File) {
    setBusy(true);
    setMessage("");
    try {
      if (file.size > 8 * 1024 * 1024)
        throw new Error("CSV must be under 8 MB");
      const r = await api<{ rows: number; repeated: boolean }>("imports", {
        kind,
        filename: file.name,
        content: await file.text(),
      });
      setMessage(
        r.repeated
          ? `Already imported. ${fmt(r.rows)} source rows unchanged.`
          : `Imported ${fmt(r.rows)} rows successfully.`,
      );
      refresh();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Header
        eyebrow="THE WORKSPACE, UNDER THE HOOD"
        title="A considered foundation."
        description="Manage imports and inspect your workspace configuration. Secrets stay on the server."
      />
      <div className="bottom-grid">
        <Card>
          <div className="card-heading">
            <div>
              <h2>Workspace configuration</h2>
              <p>Current runtime status</p>
            </div>
            <Settings size={18} />
          </div>
          <dl className="details-list">
            <div>
              <dt>Signed in as</dt>
              <dd>
                {settings?.username} · {settings?.role}
              </dd>
            </div>
            <div>
              <dt>Analysis reference date</dt>
              <dd>{settings?.analysisDate}</dd>
            </div>
            <div>
              <dt>Data store</dt>
              <dd>{settings?.database}</dd>
            </div>
            <div>
              <dt>AI inference</dt>
              <dd>
                <Badge tone={settings?.aiConfigured ? "green" : "amber"}>
                  {settings?.aiConfigured
                    ? settings.deployment
                    : "Not configured"}
                </Badge>
              </dd>
            </div>
            <div>
              <dt>Webhook endpoint</dt>
              <dd>
                <code>POST /webhooks/app</code>
              </dd>
            </div>
            <div>
              <dt>Session expiration</dt>
              <dd>8 hours · encrypted, HTTP-only cookie</dd>
            </div>
          </dl>
        </Card>
        <Card>
          <div className="card-heading">
            <div>
              <h2>Import source data</h2>
              <p>Subscribers first, then app users and website events</p>
            </div>
            <Upload size={18} />
          </div>
          {settings?.role === "admin" ? (
            <div className="import-panel">
              <label>
                Source type
                <select value={kind} onChange={(e) => setKind(e.target.value)}>
                  <option value="subscribers">Newsletter subscribers</option>
                  <option value="app_users">App users</option>
                  <option value="web_events">Website events</option>
                </select>
              </label>
              <label className="upload-drop">
                <Upload size={26} />
                <strong>{busy ? "Importing…" : "Choose a CSV file"}</strong>
                <span>Original assessment columns · up to 8 MB</span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  disabled={busy}
                  aria-label="Upload CSV"
                  onChange={(e) => {
                    if (e.target.files?.[0]) upload(e.target.files[0]);
                    e.target.value = "";
                  }}
                />
              </label>
              <p className="muted">
                Identical files are detected by checksum. Raw values and
                duplicate rows remain preserved.
              </p>
              {message && (
                <div className="notice" role="status">
                  {message}
                </div>
              )}
            </div>
          ) : (
            <div className="empty">
              Only administrators can import source data.
            </div>
          )}
        </Card>
      </div>
      <Card>
        <div className="card-heading">
          <div>
            <h2>Import history</h2>
            <p>Immutable source batches, with row counts</p>
          </div>
          <Layers3 size={18} />
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Source</th>
                <th>File</th>
                <th>Rows</th>
                <th>Imported (UTC)</th>
              </tr>
            </thead>
            <tbody>
              {overviewData?.batches.map((b, i) => (
                <tr key={i}>
                  <td>
                    <Badge>{b.kind}</Badge>
                  </td>
                  <td>{b.filename}</td>
                  <td>{fmt(b.row_count)}</td>
                  <td>{time(b.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
