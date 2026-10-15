export const fmt = (n: number) => new Intl.NumberFormat("en-US").format(n);
export const date = (s: unknown) =>
  s
    ? new Date(String(s)).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      })
    : "—";
export const time = (s: unknown) =>
  s
    ? new Date(String(s)).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "UTC",
      }) + " UTC"
    : "—";
