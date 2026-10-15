"use client";
import { Badge } from "@/components/ui/primitives";
import type { Person } from "@/lib/audience";
import { date } from "@/lib/format";
import { Globe, Mail, Smartphone } from "lucide-react";
import Link from "next/link";

export function PersonTable({ people }: { people: Person[] }) {
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
