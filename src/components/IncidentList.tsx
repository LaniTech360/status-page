import { CheckCircle2 } from "lucide-react";
import type { Incident, IncidentImpact, UpdateLevel } from "@/lib/incidents";
import { SERVICES } from "@/lib/services";
import { isOngoing } from "@/lib/autoIncidents";
import { LocalTime } from "./LocalTime";

const LEVEL_LABEL: Record<UpdateLevel, string> = {
  investigating: "Investigating",
  identified: "Identified",
  monitoring: "Monitoring",
  resolved: "Resolved",
};

const LEVEL_COLOR: Record<UpdateLevel, string> = {
  investigating: "var(--down)",
  identified: "var(--degraded)",
  monitoring: "var(--maint)",
  resolved: "var(--ok)",
};

const IMPACT_COLOR: Record<IncidentImpact, string> = {
  minor: "var(--degraded)",
  major: "var(--down)",
  critical: "var(--down)",
  maintenance: "var(--maint)",
};

function serviceName(id: string): string {
  return SERVICES.find((s) => s.id === id)?.name ?? id;
}

export function IncidentList({ incidents }: { incidents: Incident[] }) {
  return (
    <section className="mt-10 sm:mt-12" aria-labelledby="incidents-title">
      <div className="mb-4 flex items-end justify-between gap-4 px-1">
        <h2
          id="incidents-title"
          className="font-display text-[20px] font-semibold tracking-[-0.02em] sm:text-[22px]"
        >
          Incident history
        </h2>
        <span className="text-[12px] text-[var(--text-faint)]">
          Past 90 days
        </span>
      </div>

      {incidents.length === 0 ? (
        <div className="card flex items-center gap-3.5 rounded-lg px-5 py-5 sm:px-6">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--ok-soft)]">
            <CheckCircle2 size={18} style={{ color: "var(--ok)" }} />
          </span>
          <div>
            <p className="text-[14px] font-medium text-[var(--text)]">
              No incidents reported
            </p>
            <p className="mt-0.5 text-[13px] text-[var(--text-soft)]">
              Everything has been running without issues for the past 90 days.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {incidents.map((inc) => {
            const ongoing = isOngoing(inc);
            return (
              <article
                key={inc.id}
                className="card relative overflow-hidden rounded-lg px-5 py-5 sm:px-6"
              >
                <span
                  className="absolute inset-y-0 left-0 w-1"
                  style={{
                    background: ongoing ? IMPACT_COLOR[inc.impact] : "var(--border-strong)",
                  }}
                  aria-hidden
                />
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="mr-1 text-[15.5px] font-semibold text-[var(--text)]">
                    {inc.title}
                  </h3>
                  {ongoing && (
                    <span
                      className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[11px] font-medium"
                      style={{ color: "var(--down)", background: "var(--down-soft)" }}
                    >
                      <span
                        className="h-1.5 w-1.5 animate-pulse rounded-full"
                        style={{ background: "var(--down)" }}
                      />
                      Ongoing
                    </span>
                  )}
                </div>
                {inc.affected.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {inc.affected.map((a) => (
                      <span
                        key={a}
                        className="rounded-md bg-[var(--surface-subtle)] px-1.5 py-0.5 text-[11px] text-[var(--text-soft)]"
                      >
                        {serviceName(a)}
                      </span>
                    ))}
                  </div>
                )}
                <ol className="relative mt-4 space-y-4 before:absolute before:bottom-2 before:left-[3px] before:top-2 before:w-px before:bg-[var(--border)]">
                  {inc.updates.map((u, i) => (
                    <li key={i} className="relative flex gap-3.5">
                      <span
                        className="relative mt-[6px] h-[7px] w-[7px] shrink-0 rounded-full ring-4 ring-[var(--surface)]"
                        style={{ background: LEVEL_COLOR[u.level] }}
                      />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                          <span
                            className="text-[12.5px] font-semibold"
                            style={{ color: LEVEL_COLOR[u.level] }}
                          >
                            {LEVEL_LABEL[u.level]}
                          </span>
                          <LocalTime
                            iso={u.at}
                            className="font-mono text-[11px] text-[var(--text-faint)]"
                          />
                        </div>
                        <p className="mt-1 text-[13.5px] leading-relaxed text-[var(--text-soft)]">
                          {u.body}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
