"use client";
import styles from "./login.module.css";
import { css } from "@/lib/css";
import {
  ArrowRight,
  Coffee,
  Layers3,
  ShieldCheck,
  Waypoints,
} from "lucide-react";
import { useEffect, useState } from "react";
export default function Login() {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(Object.fromEntries(data)),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      window.location.href = "/overview";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not sign in");
      setBusy(false);
    }
  }
  return (
    <div className={css(styles, "login-layout")}>
      <section className={css(styles, "login-story")}>
        <div className={css(styles, "wordmark")}>
          <Coffee size={34} />
          <span>
            the pour over<span className={css(styles, "wordmark-dot")}>.</span>
          </span>
        </div>
        <div>
          <span className={css(styles, "eyebrow")}>READER INTELLIGENCE</span>
          <h1>
            Know your readers.
            <br />
            <em>Grow with intention.</em>
          </h1>
          <p>
            One thoughtful home for your audience.
            <br />
            Connect the dots between your newsletter,
            <br />
            website, and app.
          </p>
          <div className={css(styles, "login-chips")}>
            <span>
              <Layers3 size={16} /> Unified profiles
            </span>
            <span>
              <Waypoints size={16} /> Connected journeys
            </span>
          </div>
        </div>
        <small>Good news. Better understanding.</small>
      </section>
      <section className={css(styles, "login-form")}>
        <div className={css(styles, "login-form-inner")}>
          <span className={css(styles, "eyebrow")}>THE GROWTH WORKSPACE</span>
          <h2>A fresh perspective.</h2>
          <p className={css(styles, "muted")}>
            Sign in to your Reader Intelligence workspace.
          </p>
          <form method="post" action="/api/auth/login" onSubmit={submit}>
            <label>
              Username
              <input
                name="username"
                autoComplete="username"
                required
                autoFocus
                placeholder="Your username"
              />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="Your password"
              />
            </label>
            {error && (
              <div className={css(styles, "notice error")} role="alert">
                {error}
              </div>
            )}
            <button
              className={css(styles, "button primary full")}
              disabled={busy || !ready}
            >
              {busy ? "Signing in…" : "Enter workspace"}
              <ArrowRight size={17} />
            </button>
          </form>
          <div className={css(styles, "login-security")}>
            <ShieldCheck size={17} /> Private workspace · Access by invitation
          </div>
          <p className={css(styles, "login-help")}>
            Local setup? Your generated credentials are in{" "}
            <code>.local-access.txt</code>.
          </p>
        </div>
      </section>
    </div>
  );
}
