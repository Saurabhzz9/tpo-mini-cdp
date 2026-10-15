import { fmt } from "@/lib/format";
import { AlertCircle, RefreshCw, Users } from "lucide-react";
import type { ReactNode } from "react";
export function Loading({ error }: { error?: string }) {
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
export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
export function Header({
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
export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`card ${className}`}>{children}</section>;
}
export function Metric({
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
