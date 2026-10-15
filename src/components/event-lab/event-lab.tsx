"use client";
import styles from "./event-lab.module.css";
import { css } from "@/lib/css";
import ActivityScreen from "@/components/activity/activity-feed";
import { Card, Header } from "@/components/ui/primitives";
import { api } from "@/lib/client-api";
import {
  Activity,
  FlaskConical,
  RefreshCw,
  Send,
  Waypoints,
} from "lucide-react";
import { useState } from "react";
export default function LabScreen() {
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
      <div className={css(styles, "notice")}>
        <FlaskConical size={19} />
        <div>
          <strong>Isolated test activity.</strong> Event Lab requires test_
          identifiers. These events are visible in the stream and excluded from
          audience analytics. Test-only identities can be inspected in the
          activity stream.
        </div>
      </div>
      <div className={css(styles, "bottom-grid")}>
        <Card>
          <div className={css(styles, "card-heading")}>
            <div>
              <h2>Compose a delivery</h2>
              <p>HMAC-SHA256 signed on the server</p>
            </div>
            <FlaskConical size={19} />
          </div>
          <div className={css(styles, "form-stack")}>
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
            <label className={css(styles, "checkbox-label")}>
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
            <div className={css(styles, "button-row")}>
              <button
                className={css(styles, "button primary")}
                disabled={busy}
                onClick={() => send()}
              >
                <Send size={15} />
                Send signed event
              </button>
              <button
                className={css(styles, "button")}
                disabled={busy || !last}
                onClick={() => send(true)}
              >
                <RefreshCw size={15} />
                Redeliver same event
              </button>
            </div>
            {error && (
              <div className={css(styles, "notice error")} role="alert">
                {error}
              </div>
            )}
          </div>
        </Card>
        <div>
          <Card>
            <div className={css(styles, "card-heading")}>
              <div>
                <h2>Processing response</h2>
                <p>The actual webhook HTTP status and result</p>
              </div>
              <Activity size={18} />
            </div>
            {result ? (
              <pre className={css(styles, "response-block")}>
                {JSON.stringify(result, null, 2)}
              </pre>
            ) : (
              <div className={css(styles, "empty")}>
                Send your first delivery to inspect the result.
              </div>
            )}
          </Card>
          <Card>
            <div className={css(styles, "card-heading")}>
              <div>
                <h2>Try the identity journey</h2>
                <p>A useful sequence for your live demo</p>
              </div>
              <Waypoints size={18} />
            </div>
            <ol className={css(styles, "demo-steps")}>
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
