"use client";
import { api } from "@/lib/client-api";
import { useCallback, useEffect, useRef, useState } from "react";

/** One feature owns its request; old paths and unmounted screens cannot publish results. */
export function useData<T>(path: string, interval = 0) {
  const [state, setState] = useState<{ path: string; data?: T; error: string }>(
    { path, error: "" },
  );
  const sequence = useRef(0),
    controller = useRef<AbortController | null>(null);
  const pending = useRef(false);
  const refresh = useCallback(async () => {
    const request = ++sequence.current;
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    pending.current = true;
    try {
      const data = await api<T>(path, undefined, undefined, current.signal);
      if (!current.signal.aborted && request === sequence.current)
        setState({ path, data, error: "" });
    } catch (error) {
      if (!current.signal.aborted && request === sequence.current)
        setState((previous) => ({
          path,
          data: previous.path === path ? previous.data : undefined,
          error: error instanceof Error ? error.message : "Request failed",
        }));
    } finally {
      if (request === sequence.current) pending.current = false;
    }
  }, [path]);
  useEffect(() => {
    void refresh();
    const timer = interval
      ? setInterval(() => {
          if (document.visibilityState !== "hidden" && !pending.current)
            void refresh();
        }, interval)
      : undefined;
    return () => {
      clearInterval(timer);
      controller.current?.abort();
      pending.current = false;
    };
  }, [refresh, interval]);
  return {
    data: state.path === path ? state.data : undefined,
    error: state.path === path ? state.error : "",
    refresh,
  };
}
