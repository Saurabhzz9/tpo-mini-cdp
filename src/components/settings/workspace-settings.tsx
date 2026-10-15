"use client";
import styles from "./settings.module.css";
import { css } from "@/lib/css";
import { useWorkspaceSettings } from "@/components/layout/workspace-layout";
import { Badge, Card, Header } from "@/components/ui/primitives";
import { useData } from "@/hooks/use-data";
import { api } from "@/lib/client-api";
import { fmt, time } from "@/lib/format";
import type { Overview } from "@/types/workspace";
import { Layers3, Settings, Upload } from "lucide-react";
import { useState } from "react";
export default function SettingsScreen() {
  const settings = useWorkspaceSettings();
  const {
      data: batches,
      error,
      refresh,
    } = useData<Overview["batches"]>("import-history"),
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
      <div className={css(styles, "bottom-grid")}>
        <Card>
          <div className={css(styles, "card-heading")}>
            <div>
              <h2>Workspace configuration</h2>
              <p>Current runtime status</p>
            </div>
            <Settings size={18} />
          </div>
          <dl className={css(styles, "details-list")}>
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
          <div className={css(styles, "card-heading")}>
            <div>
              <h2>Import source data</h2>
              <p>Subscribers first, then app users and website events</p>
            </div>
            <Upload size={18} />
          </div>
          {settings?.role === "admin" ? (
            <div className={css(styles, "import-panel")}>
              <label>
                Source type
                <select value={kind} onChange={(e) => setKind(e.target.value)}>
                  <option value="subscribers">Newsletter subscribers</option>
                  <option value="app_users">App users</option>
                  <option value="web_events">Website events</option>
                </select>
              </label>
              <label className={css(styles, "upload-drop")}>
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
              <p className={css(styles, "muted")}>
                Identical files are detected by checksum. Raw values and
                duplicate rows remain preserved.
              </p>
              {message && (
                <div className={css(styles, "notice")} role="status">
                  {message}
                </div>
              )}
            </div>
          ) : (
            <div className={css(styles, "empty")}>
              Only administrators can import source data.
            </div>
          )}
        </Card>
      </div>
      <Card>
        <div className={css(styles, "card-heading")}>
          <div>
            <h2>Import history</h2>
            <p>Immutable source batches, with row counts</p>
          </div>
          <Layers3 size={18} />
        </div>
        <div className={css(styles, "table-wrap")}>
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
              {batches?.map((b, i) => (
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
        {error && (
          <div className="notice error" role="alert">
            {error}
          </div>
        )}
      </Card>
    </>
  );
}
