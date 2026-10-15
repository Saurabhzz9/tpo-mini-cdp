"use client";
import styles from "./segments.module.css";
import { css } from "@/lib/css";
import { PersonTable } from "@/components/subscribers/person-table";
import { Badge, Card, Header } from "@/components/ui/primitives";
import { useData } from "@/hooks/use-data";
import type { Person } from "@/lib/audience";
import { api } from "@/lib/client-api";
import { fmt } from "@/lib/format";
import { fields } from "@/lib/segment-fields";
import type { Segment } from "@/lib/segments";
import type { Saved } from "@/types/workspace";
import {
  ChartNoAxesCombined,
  Check,
  Clock,
  Download,
  Filter,
  Info,
  Layers3,
  Mail,
  Plus,
  Smartphone,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";
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
export default function SegmentsScreen() {
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
      <div className={css(styles, "preset-row")}>
        <button
          className={css(styles, "preset")}
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
          className={css(styles, "preset")}
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
          className={css(styles, "preset")}
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
          className={css(styles, "preset")}
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
      <Card className={css(styles, "segment-builder")}>
        <div className={css(styles, "card-heading")}>
          <div>
            <h2>{editId ? "Edit saved segment" : "Build your audience"}</h2>
            <p>
              Each reader counted once. Choose newsletter readers or all
              profiles, including standalone app users.
            </p>
          </div>
          <Layers3 size={19} />
        </div>
        <label className={css(styles, "segment-name")}>
          Segment name
          <input
            aria-label="Segment name"
            value={name}
            maxLength={100}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <div className={css(styles, "match-row")}>
          <label>
            Audience scope
            <select
              aria-label="Audience scope"
              value={definition.scope || "newsletter"}
              onChange={(e) =>
                change({
                  ...definition,
                  scope: e.target.value as "newsletter" | "all",
                })
              }
            >
              <option value="newsletter">Newsletter readers</option>
              <option value="all">All profiles, including app-only</option>
            </select>
          </label>
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
        <div className={css(styles, "rules")}>
          {definition.rules.map((r, i) => (
            <div className={css(styles, "rule-row")} key={i}>
              <span className={css(styles, "rule-index")}>
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
                className={css(styles, "icon-button")}
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
          className={css(styles, "text-link add-rule")}
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
        <div className={css(styles, "segment-bottom")}>
          <span>
            <Info size={15} />
            “Days since open” excludes never-opened readers. Use a separate OR
            rule to include them.
          </span>
          <div>
            <button
              className={css(styles, "button")}
              disabled={busy}
              onClick={() => run()}
            >
              <Filter size={15} />
              Preview audience
            </button>
            <button
              className={css(styles, "button primary")}
              disabled={busy || !name.trim()}
              onClick={() => run(true)}
            >
              <Check size={15} />
              {editId ? "Update segment" : "Save segment"}
            </button>
          </div>
        </div>
        {message && (
          <div className={css(styles, "notice")} role="status">
            {message}
          </div>
        )}
      </Card>
      {preview && (
        <Card>
          <div className={css(styles, "card-heading")}>
            <div>
              <h2>{fmt(preview.count)} matching readers</h2>
              <p>Preview shows the first 25 canonical profiles.</p>
            </div>
            <Badge tone="green">Live calculation</Badge>
          </div>
          <PersonTable people={preview.people} />
        </Card>
      )}
      <div className={css(styles, "section-heading")}>
        <h2>Saved segments</h2>
        <span className={css(styles, "muted")}>
          {saved.data?.length || 0} audiences
        </span>
      </div>
      <div className={css(styles, "saved-grid")}>
        {saved.error && (
          <div className="notice error" role="alert">
            {saved.error}
          </div>
        )}
        {saved.data?.map((s) => (
          <Card key={s.id}>
            <div className={css(styles, "saved-icon")}>
              <Layers3 size={19} />
            </div>
            <h3>{s.name}</h3>
            <Badge>
              {s.definition.scope === "all"
                ? "All reader profiles"
                : "Newsletter readers"}
            </Badge>
            <p>
              {s.definition.rules
                .map((r) => `${labels[r.field]} ${r.operator} ${r.value}`)
                .join(s.definition.match === "all" ? " · AND · " : " · OR · ")}
            </p>
            <strong className={css(styles, "saved-count")}>
              {fmt(s.count)}
              <small> matching readers</small>
            </strong>
            <div className={css(styles, "saved-actions")}>
              <button
                className={css(styles, "button")}
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
              <a
                className={css(styles, "button")}
                href={`/api/segments/${s.id}/export`}
              >
                <Download size={14} />
                Export CSV
              </a>
              <button
                className={css(styles, "icon-button")}
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
          <div className={css(styles, "empty")}>
            <Layers3 />
            Your first audience is a few conditions away.
            <p>Save a segment above to revisit or export it.</p>
          </div>
        </Card>
      )}
    </>
  );
}
