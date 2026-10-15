"use client";
import styles from "./profile.module.css";
import { css } from "@/lib/css";
import {
  Badge,
  Card,
  Header,
  Loading,
  Metric,
} from "@/components/ui/primitives";
import { useData } from "@/hooks/use-data";
import { date, time } from "@/lib/format";
import type { Profile } from "@/types/workspace";
import {
  Activity,
  ChartNoAxesCombined,
  ChevronDown,
  ChevronLeft,
  Globe,
  Layers3,
  Mail,
  Smartphone,
  Users,
  Waypoints,
} from "lucide-react";
import Link from "next/link";
export default function ProfileScreen({ id }: { id: string }) {
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
      <Link href="/subscribers" className={css(styles, "back-link")}>
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
      <div className={css(styles, "metrics-grid")}>
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
      <div className={css(styles, "profile-grid")}>
        <div>
          <Card>
            <div className={css(styles, "card-heading")}>
              <div>
                <h2>Reader details</h2>
                <p>Newsletter snapshot, as supplied</p>
              </div>
              <Mail size={18} />
            </div>
            <dl className={css(styles, "details-grid")}>
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
          <Card className={css(styles, "identity-card")}>
            <div className={css(styles, "card-heading")}>
              <div>
                <h2>Connected identities</h2>
                <p>Deterministic links, with reasons</p>
              </div>
              <Waypoints size={18} />
            </div>
            <div className={css(styles, "identity-root")}>
              <Users size={19} />
              <span>
                Canonical profile<small>{p.id}</small>
              </span>
            </div>
            <div className={css(styles, "identity-branches")}>
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
        <Card className={css(styles, "timeline-card")}>
          <div className={css(styles, "card-heading")}>
            <div>
              <h2>The reader journey</h2>
              <p>Observed events · newest first · up to 200 per channel</p>
            </div>
            <Activity size={18} />
          </div>
          {timeline.length ? (
            <div className={css(styles, "timeline")}>
              {timeline.map((e) => (
                <div className={css(styles, "timeline-entry")} key={e.id}>
                  <span className={css(styles, "timeline-node")}>
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
            <div className={css(styles, "empty")}>
              No observed website or app activity.
              <p>Newsletter open dates are snapshots, not individual events.</p>
            </div>
          )}
        </Card>
      </div>
      <Card>
        <div className={css(styles, "card-heading")}>
          <div>
            <h2>Source lineage</h2>
            <p>Original records are preserved, including duplicates.</p>
          </div>
          <Layers3 size={18} />
        </div>
        {d.raw.map((r: Record<string, unknown>) => (
          <details className={css(styles, "raw-record")} key={String(r.id)}>
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
