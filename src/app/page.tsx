import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { probeAll, SERVICES } from "@/lib/services";
import { readHistory, type UptimeDay } from "@/lib/history";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LiveStatus } from "@/components/LiveStatus";
import { StatusDot } from "@/components/StatusDot";
import { IncidentList } from "@/components/IncidentList";
import { INCIDENTS } from "@/lib/incidents";
import {
  readAutoIncidents,
  mergeIncidents,
  applyIncidents,
  incidentDays,
} from "@/lib/autoIncidents";
import { SubscribeForm } from "@/components/SubscribeForm";
import { emailNotificationsEnabled } from "@/lib/subscribers";
import { SITE } from "../../status.config";

// The page probes every service at request time so the first paint is already
// live, then <LiveStatus> keeps it fresh client-side.
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Outcome notes for the ?sub= redirects from /api/subscribe links.
const SUB_NOTE: Record<string, string> = {
  confirmed: "Subscription confirmed — we'll email you when something breaks (and when it's fixed).",
  unsubscribed: "You've been unsubscribed. No more emails from us.",
  invalid: "That link is invalid or has expired.",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const subParam = typeof sp.sub === "string" ? sp.sub : undefined;
  const subNote = subParam ? SUB_NOTE[subParam] : undefined;
  const canSubscribe = emailNotificationsEnabled();
  const probed = await probeAll();

  // Uptime history per service (empty arrays until KV is configured).
  const historyEntries = await Promise.all(
    SERVICES.map(async (s) => [s.id, await readHistory(s.id)] as const),
  );
  const history: Record<string, UptimeDay[]> = Object.fromEntries(historyEntries);

  // Auto-detected incidents (from the cron state machine) merged with any
  // hand-curated ones, newest activity first.
  const incidents = mergeIncidents(await readAutoIncidents(), INCIDENTS);

  // Fold any ongoing incident into the banner + affected rows, so a known
  // issue the probes can't see (e.g. an upstream degradation) still shows.
  const { services, overall } = applyIncidents(probed, incidents);

  const generatedAt = new Date().toISOString();
  const year = new Date().getFullYear();

  const homepageLabel = SITE.homepage
    ?.replace(/^https?:\/\//, "")
    .replace(/\/$/, "");

  return (
    <>
      <header className="site-header sticky top-0 z-40 border-b">
        <div className="mx-auto flex h-14 w-full max-w-4xl items-center justify-between gap-3 px-4 sm:h-16 sm:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-2.5" aria-label={`${SITE.name} status`}>
            {SITE.logo ? (
              <>
                {/* eslint-disable @next/next/no-img-element */}
                <img
                  src={SITE.logo}
                  alt={SITE.name}
                  height={22}
                  className="logo-light h-[19px] w-auto sm:h-[22px]"
                />
                <img
                  src={SITE.logoDark ?? SITE.logo}
                  alt={SITE.name}
                  height={22}
                  className="logo-dark h-[19px] w-auto sm:h-[22px]"
                />
              </>
            ) : (
              <>
                <StatusDot status={overall} size={12} />
                <span className="text-[15px] font-semibold tracking-[-0.01em] text-[var(--text)]">
                  {SITE.name}
                </span>
              </>
            )}
            <span className="ml-1 h-5 w-px bg-[var(--border-strong)]" aria-hidden />
            <span className="ml-1 text-[15px] font-medium text-[var(--text-soft)] sm:text-[16px]">
              Status
            </span>
          </Link>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {SITE.homepage && (
              <a
                href={SITE.homepage}
                className="hidden items-center gap-1 rounded-md px-2.5 py-2 text-[13.5px] font-medium text-[var(--text-soft)] transition-colors hover:text-[var(--text)] md:flex"
              >
                Visit {homepageLabel}
                <ArrowUpRight size={14} />
              </a>
            )}
            <ThemeToggle />
            {canSubscribe && <SubscribeForm />}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl px-4 pb-12 pt-6 sm:px-6 sm:pt-10">
        {subNote && (
          <p className="fade-up card mb-4 rounded-lg px-4 py-3 text-[13px] text-[var(--text-soft)]">
            {subNote}
          </p>
        )}

        <LiveStatus
          initial={{ overall, services, generatedAt }}
          history={history}
          incidentDays={incidentDays(incidents)}
        />

        <IncidentList incidents={incidents} />
      </main>

      <footer className="mt-4 border-t">
        <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-3 px-4 pb-16 pt-6 text-[12.5px] sm:pb-8 text-[var(--text-faint)] sm:flex-row sm:justify-between sm:px-6">
          <span>© {year} {SITE.name}. All rights reserved.</span>
          <nav className="flex items-center gap-5">
            {SITE.homepage && (
              <a href={SITE.homepage} className="transition-colors hover:text-[var(--text)]">
                {homepageLabel}
              </a>
            )}
            <a href="#incidents-title" className="transition-colors hover:text-[var(--text)]">
              Incident history
            </a>
            {SITE.showPoweredBy && (
              <a
                href="https://github.com/clusy-io/status-page"
                className="transition-colors hover:text-[var(--text)]"
              >
                Powered by status-page
              </a>
            )}
          </nav>
        </div>
      </footer>
    </>
  );
}
