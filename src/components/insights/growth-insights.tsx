"use client";
import styles from "./insights.module.css";
import { css } from "@/lib/css";
import { Card, Header, Loading } from "@/components/ui/primitives";
import { useData } from "@/hooks/use-data";
import { fmt } from "@/lib/format";
import type { Overview } from "@/types/workspace";
import { ChartNoAxesCombined, Globe, Info, Users } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
export default function InsightsScreen() {
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
        <div className={css(styles, "card-heading")}>
          <div>
            <h2>Acquisition, beyond the signup</h2>
            <p>How each newsletter source connects with your channels</p>
          </div>
          <ChartNoAxesCombined size={18} />
        </div>
        <div className={css(styles, "table-wrap")}>
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
                      className={css(
                        styles,
                        `source-dot source-${a.source.toLowerCase()}`,
                      )}
                    />
                    <strong>{a.source}</strong>
                  </td>
                  <td>{fmt(a.count)}</td>
                  <td>
                    {fmt(a.engaged)}{" "}
                    <span className={css(styles, "muted")}>
                      ({((a.engaged / a.count) * 100).toFixed(1)}%)
                    </span>
                  </td>
                  <td>{fmt(a.inactive)}</td>
                  <td>{fmt(a.web)}</td>
                  <td>
                    {fmt(a.app)}{" "}
                    <span className={css(styles, "muted")}>
                      ({((a.app / a.count) * 100).toFixed(1)}%)
                    </span>
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
              <h2>Pages that bring people in</h2>
              <p>All imported website visits · not unique visitors</p>
            </div>
            <Globe size={18} />
          </div>
          <div className={css(styles, "page-ranking")}>
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
            <div className={css(styles, "card-heading")}>
              <div>
                <h2>Signup cohorts</h2>
                <p>Snapshot engagement · not measured retention</p>
              </div>
              <Users size={18} />
            </div>
            <div className={css(styles, "chart cohort-chart")}>
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
          <Card className={css(styles, "journey-card")}>
            <h2>Observed audience connections</h2>
            <p className={css(styles, "muted")}>
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
              <div className={css(styles, "journey-stage")} key={x.name}>
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
      <div className={css(styles, "notice")}>
        <Info size={18} />
        Engagement scoring is transparent, not predictive: newsletter recency up
        to 40 points; observed website visits up to 30; app events and story
        reads up to 30. No revenue or conversion attribution is inferred.
      </div>
    </>
  );
}
