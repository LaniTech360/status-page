"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  MinusCircle,
  RefreshCw,
  Wrench,
} from "lucide-react";
import type { Health, ProbeResult } from "@/lib/services";
import type { UptimeDay } from "@/lib/history";
import { StatusBadge } from "./StatusIcon";
import { LocalTime } from "./LocalTime";
import { UptimeBar, UptimePercent } from "./UptimeBar";
import { HEADLINE, STATUS_LABEL, STATUS_VAR } from "@/lib/present";

interface StatusPayload {
  overall: Health;
  services: ProbeResult[];
  generatedAt: string;
}

const POLL_MS = 45_000;
const DEFAULT_GROUP = "Services";

// Services in config order, bucketed by `group` (first appearance wins the
// group's position).
function groupServices(services: ProbeResult[]) {
  const groups = new Map<string, ProbeResult[]>();
  for (const s of services) {
    const g = s.group ?? DEFAULT_GROUP;
    groups.set(g, [...(groups.get(g) ?? []), s]);
  }
  return [...groups.entries()];
}

export function LiveStatus({
  initial,
  history,
  incidentDays,
}: {
  initial: StatusPayload;
  history: Record<string, UptimeDay[]>;
  incidentDays: Record<string, Record<string, string[]>>;
}) {
  const [data, setData] = useState<StatusPayload>(initial);
  const [refreshing, setRefreshing] = useState(false);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/status", { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as StatusPayload;
      if (mounted.current) setData(json);
    } catch {
      /* keep showing last-known status on a transient failure */
    } finally {
      if (mounted.current) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    const poll = setInterval(refresh, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      mounted.current = false;
      clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  const overall = data.overall;

  return (
    <>
      {/* Hero */}
      <section className="fade-up flex flex-col items-center py-6 text-center sm:py-10">
        <StatusBadge status={overall} size="lg" />
        <h1 className="font-display mt-6 text-balance text-[26px] font-semibold leading-tight tracking-[-0.02em] text-[var(--text)] sm:text-[34px]">
          {HEADLINE[overall]}
        </h1>
        <button
          onClick={refresh}
          className="group mt-2 inline-flex items-center gap-1.5 text-[13.5px] text-[var(--text-soft)] transition-colors hover:text-[var(--text)] sm:text-[14.5px]"
          title="Refresh now"
        >
          <span>
            Last updated <LocalTime iso={data.generatedAt} long />
          </span>
          <RefreshCw
            size={12}
            className={`opacity-60 group-hover:opacity-100 ${refreshing ? "animate-spin" : ""}`}
            style={{ animationDuration: "0.8s" }}
            aria-hidden
          />
        </button>
      </section>

      {/* Systems */}
      <section className="mt-6 space-y-6 sm:mt-8" aria-label="System status">
        {groupServices(data.services).map(([group, rows], gi) => (
          <div
            key={group}
            className="card fade-up overflow-hidden rounded-lg"
            style={{ animationDelay: `${80 + gi * 60}ms` }}
          >
            <div className="flex items-center justify-between gap-3 bg-[var(--surface-subtle)] px-4 py-3.5 sm:px-5">
              <h2 className="text-[15px] font-semibold text-[var(--text)] sm:text-[16px]">
                {group}
              </h2>
              <Legend />
            </div>

            {rows.map((svc, i) => {
              const days = history[svc.id] ?? [];
              return (
                <div
                  key={svc.id}
                  className="px-4 py-4 sm:px-5 sm:py-5"
                  style={{
                    borderTop: i === 0 ? "none" : "1px solid var(--border)",
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <StatusBadge status={svc.status} size="sm" />
                      <span className="truncate text-[14.5px] font-semibold text-[var(--text)] sm:text-[15px]">
                        {svc.name}
                      </span>
                      {svc.status !== "operational" && (
                        <span
                          className="shrink-0 text-[12.5px] font-medium"
                          style={{ color: STATUS_VAR[svc.status].fg }}
                        >
                          {STATUS_LABEL[svc.status]}
                        </span>
                      )}
                    </div>
                    <span className="shrink-0 text-[13px] text-[var(--text-soft)] sm:text-[14px]">
                      {days.some((d) => d.uptime !== null) ? (
                        <>
                          <UptimePercent days={days} /> uptime
                        </>
                      ) : (
                        "No data yet"
                      )}
                    </span>
                  </div>
                  <p className="mt-0.5 pl-6 text-[12.5px] leading-snug text-[var(--text-soft)] sm:text-[13px]">
                    {svc.description}
                  </p>
                  <UptimeBar
                    days={days}
                    liveStatus={svc.status}
                    incidents={incidentDays[svc.id]}
                  />
                </div>
              );
            })}
          </div>
        ))}
      </section>
    </>
  );
}

const LEGEND = [
  { label: "Operational", Icon: CheckCircle2 },
  { label: "Running slow", Icon: AlertTriangle },
  { label: "Down", Icon: MinusCircle },
  { label: "Maintenance", Icon: Wrench },
  { label: "No data", Icon: Circle },
];

// Muted key of the states a row can show, as in the group header on
// status.gohighlevel.com.
function Legend() {
  return (
    <ul className="hidden items-center gap-3 text-[var(--text-faint)] opacity-70 sm:flex">
      {LEGEND.map(({ label, Icon }) => (
        <li key={label} title={label}>
          <Icon size={15} aria-label={label} />
        </li>
      ))}
    </ul>
  );
}
