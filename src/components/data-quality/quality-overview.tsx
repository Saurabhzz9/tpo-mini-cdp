"use client";
import styles from "./quality.module.css";
import { css } from "@/lib/css";
import { Badge, Card, Header, Loading } from "@/components/ui/primitives";
import { useData } from "@/hooks/use-data";
import { fmt, time } from "@/lib/format";
import {
  AlertCircle,
  ArrowUpRight,
  ChartNoAxesCombined,
  ChevronDown,
  Globe,
  Info,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
export default function QualityScreen() {
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
          <div className={css(styles, "quality-metrics")}>
            {d.counts.map((c) => (
              <button
                key={c.flag}
                className={css(
                  styles,
                  `card quality-stat ${filter === c.flag ? "selected" : ""}`,
                )}
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
          <div className={css(styles, "notice")}>
            <Info size={18} />
            <div>
              <strong>Duplicates are preserved, not deleted.</strong> Both
              original rows link to one canonical person. Counts above refer to
              source rows. Each duplicate group contributes one canonical reader
              to audience analytics.
            </div>
          </div>
          <Card>
            <div className={css(styles, "card-heading")}>
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
              <details className={css(styles, "raw-record")} key={r.id}>
                <summary>
                  <span className={css(styles, "issue-icon")}>
                    <AlertCircle size={17} />
                  </span>
                  <strong>
                    {r.kind} · row {r.row_number}
                  </strong>
                  <span className={css(styles, "raw-badges")}>
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
                <div className={css(styles, "raw-details")}>
                  {r.person_id && (
                    <Link
                      className={css(styles, "text-link")}
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
              <div className={css(styles, "empty")}>
                No more records in this view.
              </div>
            )}
            <div className={css(styles, "pagination")}>
              <span>Page {page} · up to 50 rows</span>
              <button
                className={css(styles, "button")}
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </button>
              <button
                className={css(styles, "button")}
                disabled={d.issues.length < 50}
                onClick={() => setPage(page + 1)}
              >
                Next
              </button>
            </div>
          </Card>
          <Card className={css(styles, "quality-history")}>
            <div className={css(styles, "card-heading")}>
              <div>
                <h2>Quality across imports</h2>
                <p>
                  Current flagged rows by original source batch · latest 12
                  imports
                </p>
              </div>
              <ChartNoAxesCombined size={18} />
            </div>
            <div className={css(styles, "table-wrap")}>
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
          <div className={css(styles, "bottom-grid")}>
            <Card>
              <div className={css(styles, "card-heading")}>
                <div>
                  <h2>Visitor identity coverage</h2>
                  <p>Anonymous and conflicting identities stay visible.</p>
                </div>
                <Globe size={18} />
              </div>
              <dl className={css(styles, "details-grid")}>
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
              <div className={css(styles, "card-heading")}>
                <div>
                  <h2>Safe identity rules</h2>
                  <p>Predictable, conservative, inspectable.</p>
                </div>
                <ShieldCheck size={18} />
              </div>
              <ul className={css(styles, "plain-list")}>
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
