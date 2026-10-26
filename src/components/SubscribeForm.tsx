"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, Check, X } from "lucide-react";

type Phase = "idle" | "sending" | "sent" | "error";

// Header affordance for email subscriptions: a "Subscribe" button that opens a
// small popover with the email form, so the header never has to make room for
// an inline input on narrow screens. Only rendered when the server says email
// notifications are configured (see page.tsx).
export function SubscribeForm() {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [email, setEmail] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => inputRef.current?.focus());
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setPhase("sending");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setPhase(res.ok ? "sent" : "error");
    } catch {
      setPhase("error");
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="btn-primary flex h-9 items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold sm:px-4"
      >
        <Bell size={14} />
        <span className="hidden min-[400px]:inline">Subscribe</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Subscribe to updates"
          className="card fade-up absolute right-0 top-full z-50 mt-3 w-[min(340px,calc(100vw-32px))] rounded-lg p-4 shadow-xl"
          style={{ animationDuration: "0.25s" }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[14px] font-semibold text-[var(--text)]">
                Get status updates
              </p>
              <p className="mt-0.5 text-[12.5px] leading-relaxed text-[var(--text-soft)]">
                We&apos;ll email you when an incident starts and when it&apos;s
                resolved.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="-mr-1 -mt-1 rounded-lg p-1 text-[var(--text-faint)] transition-colors hover:text-[var(--text)]"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>

          {phase === "sent" ? (
            <p className="mt-4 flex items-center gap-2 rounded-md bg-[var(--ok-soft)] px-3 py-2.5 text-[13px] text-[var(--text)]">
              <Check size={15} style={{ color: "var(--ok)" }} />
              Check your inbox to confirm.
            </p>
          ) : (
            <form onSubmit={submit} className="mt-4 flex flex-col gap-2 sm:flex-row">
              <input
                ref={inputRef}
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                disabled={phase === "sending"}
                className="h-10 min-w-0 flex-1 rounded-md border border-[var(--border-strong)] bg-[var(--surface)] px-3 text-[13.5px] text-[var(--text)] placeholder:text-[var(--text-faint)] focus:border-[var(--brand)] focus:outline-none"
              />
              <button
                type="submit"
                disabled={phase === "sending"}
                className="btn-primary h-10 shrink-0 rounded-md px-4 text-[13px] font-semibold disabled:opacity-60"
              >
                {phase === "sending" ? "Sending…" : "Subscribe"}
              </button>
            </form>
          )}
          {phase === "error" && (
            <p className="mt-2 text-[12px]" style={{ color: "var(--down)" }}>
              Something went wrong. Please try again.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
