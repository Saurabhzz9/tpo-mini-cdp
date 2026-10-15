"use client";
import { useState, useEffect } from "react";
import {
  ArrowRight,
  ShieldCheck,
  Coffee,
  Layers3,
  Waypoints,
} from "lucide-react";
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
    <div className="login-layout">
      <section className="login-story">
        <div className="wordmark">
          <Coffee size={34} />
          <span>
            the pour over<span className="wordmark-dot">.</span>
          </span>
        </div>
        <div>
          <span className="eyebrow">READER INTELLIGENCE</span>
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
          <div className="login-chips">
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
      <section className="login-form">
        <div className="login-form-inner">
          <span className="eyebrow">THE GROWTH WORKSPACE</span>
          <h2>A fresh perspective.</h2>
          <p className="muted">
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
              <div className="notice error" role="alert">
                {error}
              </div>
            )}
            <button className="button primary full" disabled={busy || !ready}>
              {busy ? "Signing in…" : "Enter workspace"}
              <ArrowRight size={17} />
            </button>
          </form>
          <div className="login-security">
            <ShieldCheck size={17} /> Private workspace · Access by invitation
          </div>
          <p className="login-help">
            Local setup? Your generated credentials are in{" "}
            <code>.local-access.txt</code>.
          </p>
        </div>
      </section>
    </div>
  );
}
