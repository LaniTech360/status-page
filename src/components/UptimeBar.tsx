"use client";

import { useEffect, useRef, useState } from "react";
import type { UptimeDay } from "@/lib/history";
import type { Health } from "@/lib/services";
import {
  uptimeColor,
  formatUptime,
  HEALTH_RANK,
  STATUS_LABEL,
  STATUS_VAR,
} from "@/lib/present";
import { aggregateUptime } from "@/lib/history";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// How many days the strip shows at each breakpoint, so ticks stay tappable on
// a phone: 30 below `sm`, 60 below `md`, the full 90 above.
const WINDOWS = [
  { days: 30, show: "sm:hidden" },
  { days: 60, show: "hidden sm:inline md:hidden" },
  { days: 90, show: "hidden md:inline" },
] as const;

function tickVisibility(age: number): string {
  if (age >= 60) return "hidden md:block";
  if (age >= 30) return "hidden sm:block";
  return "";
}

// A day bucket is a UTC *calendar day*, not an instant — render it from its
// parts so it never shifts across a timezone boundary.
function labelDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

// Implied health of a recorded day, so we can compare it against the live
// status and never downgrade a worse recorded day (e.g. a real outage) to the
// milder live reading.
function dayHealth(d: UptimeDay | undefined): Health {
  if (!d || d.uptime === null) return "operational";
  if (d.uptime < 0.98) return "down";
  if (d.uptime < 0.999 || d.degraded) return "degraded";
  return "operational";
}

// The state shown for a hovered day, or null when there's no data. A raw
// uptime % only reassures on a healthy (green) day; on a degraded/down day it's
// misleading — a slow day still counts as "available" so the ratio can read
// ~100% while the tick is amber. So the tooltip leads with the state word and
// only adds the percentage alongside it.
function hoverHealth(
  d: UptimeDay,
  isToday: boolean,
  overlay: Health | null,
): Health | null {
  if (d.uptime === null) return overlay;
  let h = dayHealth(d);
  if (isToday && overlay && HEALTH_RANK[overlay] > HEALTH_RANK[h]) h = overlay;
  return h;
}

/** Uptime % over the visible window, swapping with the breakpoint. */
export function UptimePercent({
  days,
  className,
}: {
  days: UptimeDay[];
  className?: string;
}) {
  if (!days.some((d) => d.uptime !== null)) return null;
  return (
    <span className={className}>
      {WINDOWS.map((w) => (
        <span key={w.days} className={w.show}>
          {formatUptime(aggregateUptime(days.slice(-w.days)))}
        </span>
      ))}
    </span>
  );
}

interface HoverState {
  i: number;
  /** Tick centre and strip width in px, measured from the DOM. */
  x: number;
  width: number;
}

// A 30/60/90-day uptime strip. Each tick is a day; colour encodes that day's
// uptime, empty days render as placeholders. A single tooltip tracks the
// hovered (or tapped) day and is anchored so it never spills past the strip.
//
// `liveStatus` is the current, incident-adjusted health of the service. The
// blind probes can't observe some issues (e.g. an upstream model degradation),
// so when the live status is worse than what today's samples recorded, it wins
// on the "Today" tick — otherwise an active incident shows a green today.
export function UptimeBar({
  days,
  liveStatus,
  incidents = {},
}: {
  days: UptimeDay[];
  liveStatus?: Health;
  /** Incident titles keyed by day (YYYY-MM-DD). */
  incidents?: Record<string, string[]>;
}) {
  const [hover, setHover] = useState<HoverState | null>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const n = days.length;
  const todayIdx = n - 1;

  // Touch has no hover-out, so close a tapped tooltip on any tap elsewhere.
  useEffect(() => {
    if (!hover) return;
    const onDown = (e: PointerEvent) => {
      if (!stripRef.current?.contains(e.target as Node)) setHover(null);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [hover]);

  // Overlay the live status onto today's tick only when it's strictly worse
  // than what the probe recorded for today.
  const overlayToday: Health | null =
    liveStatus &&
    n > 0 &&
    HEALTH_RANK[liveStatus] > HEALTH_RANK[dayHealth(days[todayIdx])] &&
    liveStatus !== "operational"
      ? liveStatus
      : null;

  function show(i: number, el: HTMLElement) {
    const strip = stripRef.current;
    if (!strip) return;
    setHover({
      i,
      x: el.offsetLeft + el.offsetWidth / 2,
      width: strip.clientWidth,
    });
  }

  const active = hover ? days[hover.i] : null;
  const activeHealth = active
    ? hoverHealth(active, hover!.i === todayIdx, overlayToday)
    : null;
  const activeIncidents = active ? (incidents[active.date] ?? []) : [];

  // Flip alignment near the edges so the tooltip stays inside the strip.
  const TIP_HALF = 112;
  const anchor = !hover
    ? ""
    : hover.x < TIP_HALF
      ? "translateX(-12px)"
      : hover.x > hover.width - TIP_HALF
        ? "translateX(calc(-100% + 12px))"
        : "translateX(-50%)";

  return (
    <div className="mt-3">
      <div
        ref={stripRef}
        className="relative flex h-9 items-stretch gap-[2px] sm:h-10 sm:gap-[3px] md:gap-[2px]"
        onPointerLeave={(e) => {
          if (e.pointerType === "mouse") setHover(null);
        }}
      >
        {days.map((d, i) => {
          const isTodayOverlay = i === todayIdx && overlayToday !== null;
          const hasIncident = (incidents[d.date]?.length ?? 0) > 0;
          return (
            <div
              key={d.date}
              className={`relative flex-1 rounded-[2px] transition-[opacity,transform] duration-150 ${tickVisibility(n - 1 - i)}`}
              style={{
                background: isTodayOverlay
                  ? STATUS_VAR[overlayToday].fg
                  : uptimeColor(d.uptime, d.degraded),
                minWidth: 2,
                opacity: hover && hover.i !== i ? 0.55 : 1,
                transform: hover?.i === i ? "scaleY(1.12)" : undefined,
              }}
              onPointerEnter={(e) => {
                if (e.pointerType === "mouse") show(i, e.currentTarget);
              }}
              onPointerDown={(e) => {
                // Mouse already shows on hover; taps toggle.
                if (e.pointerType === "mouse") return;
                if (hover?.i === i) setHover(null);
                else show(i, e.currentTarget);
              }}
            >
              {hasIncident && (
                <span
                  className="absolute inset-x-0 -bottom-1.5 mx-auto h-[3px] w-[3px] rounded-full"
                  style={{ background: "var(--text-faint)" }}
                  aria-hidden
                />
              )}
            </div>
          );
        })}

        {active && hover && (
          <div
            role="tooltip"
            className="pointer-events-none absolute bottom-full z-20 mb-2.5 w-max max-w-[224px] rounded-md border bg-[var(--surface)] px-3 py-2.5 text-[12px] shadow-lg"
            style={{ left: hover.x, transform: anchor }}
          >
            <div className="font-medium text-[var(--text)]">
              {labelDate(active.date)}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-[var(--text-soft)]">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{
                  background: activeHealth
                    ? STATUS_VAR[activeHealth].fg
                    : "var(--muted)",
                }}
              />
              {activeHealth ? STATUS_LABEL[activeHealth] : "No data recorded"}
              {active.uptime !== null && (
                <span className="ml-auto pl-3 font-mono text-[11px] text-[var(--text-faint)]">
                  {formatUptime(active.uptime)}
                </span>
              )}
            </div>
            {activeIncidents.length > 0 && (
              <ul className="mt-2 space-y-1 border-t pt-2 text-[11.5px] text-[var(--text-soft)]">
                {activeIncidents.map((t) => (
                  <li key={t} className="leading-snug">
                    {t}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
