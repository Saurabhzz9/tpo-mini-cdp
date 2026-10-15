"use client";
import styles from "./assistant.module.css";
import { css } from "@/lib/css";
import { useWorkspaceSettings } from "@/components/layout/workspace-layout";
import { Badge, Card, Header } from "@/components/ui/primitives";
import { api } from "@/lib/client-api";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Info,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
export default function AssistantScreen() {
  const { aiConfigured: configured } = useWorkspaceSettings();
  const [question, setQuestion] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [result, setResult] = useState<{
      answer: string;
      data: Record<string, unknown>;
      privacy: string;
      provider: string;
    }>();
  async function ask(q = question) {
    setQuestion(q);
    setBusy(true);
    setError("");
    try {
      setResult(await api("assistant", { question: q }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Header
        eyebrow="A THOUGHTFUL PARTNER FOR GROWTH"
        title="Curiosity, meet clarity."
        description="Ask about your audience in plain English. Your readers' identities stay out of the conversation."
      />
      <div className={css(styles, "assistant-layout")}>
        <Card className={css(styles, "assistant-main")}>
          <div className={css(styles, "assistant-welcome")}>
            <span className={css(styles, "assistant-orb")}>
              <Sparkles size={28} />
            </span>
            <Badge tone={configured ? "green" : "amber"}>
              {configured
                ? "Azure AI Foundry connected"
                : "Azure AI not configured"}
            </Badge>
            <h2>What would you like to understand?</h2>
            <p>
              From audience health to your next meaningful segment,
              <br />
              let's put your data to work.
            </p>
          </div>
          <div className={css(styles, "suggestion-grid")}>
            {[
              "How many Instagram signups are inactive?",
              "Which acquisition sources perform best?",
              "Build a list of our most engaged readers",
              "Which pages do new subscribers visit first?",
            ].map((q) => (
              <button key={q} disabled={busy} onClick={() => ask(q)}>
                {q}
                <ArrowUpRight size={16} />
              </button>
            ))}
          </div>
          <form
            className={css(styles, "assistant-input")}
            onSubmit={(e) => {
              e.preventDefault();
              ask();
            }}
          >
            <label className={css(styles, "sr-only")} htmlFor="question">
              Ask Growth assistant
            </label>
            <input
              id="question"
              value={question}
              maxLength={1000}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a question about your audience…"
            />
            <button
              aria-label="Send question"
              className={css(styles, "button primary")}
              disabled={busy || question.length < 3}
            >
              {busy ? (
                <RefreshCw size={18} className={css(styles, "spin")} />
              ) : (
                <Send size={18} />
              )}
            </button>
          </form>
          {error && (
            <div className={css(styles, "notice error")} role="alert">
              {error}
            </div>
          )}
          {result && (
            <div className={css(styles, "assistant-answer")}>
              <div>
                <Sparkles size={17} />
                <strong>Growth assistant</strong>
                <Badge tone="green">{result.provider}</Badge>
              </div>
              <p>{result.answer}</p>
              {typeof result.data.segmentReference === "string" && (
                <Link className={css(styles, "button")} href="/segments">
                  View saved segment
                  <ArrowRight size={15} />
                </Link>
              )}
              <details>
                <summary>
                  Inspect the exact aggregate data sent to the model
                </summary>
                <pre>{JSON.stringify(result.data, null, 2)}</pre>
              </details>
              <small>
                <ShieldCheck size={13} />
                {result.privacy}
              </small>
            </div>
          )}
        </Card>
        <div>
          <Card className={css(styles, "assistant-privacy")}>
            <ShieldCheck size={24} />
            <h3>
              Useful answers.
              <br />
              Private readers.
            </h3>
            <p>
              The model receives only approved analytics requests and aggregate
              results.
            </p>
            <ul>
              <li>
                <Check size={15} />
                No emails or names
              </li>
              <li>
                <Check size={15} />
                No user, visitor, or device IDs
              </li>
              <li>
                <Check size={15} />
                No raw messages or source rows
              </li>
              <li>
                <Check size={15} />
                Groups under 5 suppressed
              </li>
              <li>
                <Check size={15} />
                No arbitrary SQL or record access
              </li>
            </ul>
          </Card>
          <div className={css(styles, "assistant-note")}>
            <Info size={16} />
            <p>
              Historical metrics use 28 September 2026. Last-open snapshots
              cannot tell us exactly when someone “went cold.” The assistant
              will explain these limits.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
