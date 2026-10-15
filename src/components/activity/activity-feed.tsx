"use client";
import { Badge, Card, Header, Loading } from "@/components/ui/primitives";
import { useData } from "@/hooks/use-data";
import { time } from "@/lib/format";
import { Activity, ArrowRight, RefreshCw } from "lucide-react";
import Link from "next/link";
export default function ActivityScreen() {
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
