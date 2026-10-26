// ──────────────────────────────────────────────────────────────────────────
// status.config.ts — the one file you edit.
//
// Everything customer-facing lives here: your branding and the list of
// services to monitor. Probes run server-side only, so probe targets are
// never exposed to visitors.
// ──────────────────────────────────────────────────────────────────────────

import type { UpdateLevel } from "@/lib/incidents";
import { httpProbe, reachableProbe, type ServiceDef } from "@/lib/probes";

export const SITE = {
  /** Product or company name, shown in the header and the © footer. */
  name: "LaniTech360",
  /** Browser tab + Open Graph title. */
  title: "LaniTech360 Status",
  description: "Live status and uptime for everything at LaniTech360.",
  /** Canonical URL of this status page (used for Open Graph metadata). */
  url: "https://status.lanitech360.com",
  /** Where the header link points. Set to null to hide the link. */
  homepage: "https://lanitech360.com" as string | null,
  /**
   * Optional logo, as a path under /public (e.g. "/logo-mark.png").
   * With null, the header renders a live status dot as the mark.
   */
  logo: "/logo.svg" as string | null,
  /** Logo variant shown in the dark theme. Falls back to `logo` when null. */
  logoDark: "/logo-dark.svg" as string | null,
  /**
   * The calendar timezone for daily uptime buckets. Probes are aggregated
   * per *day*, so pick the timezone your team (or most of your users) lives
   * in — otherwise an evening probe lands in the "wrong" day.
   * Can be overridden with the STATUS_TIMEZONE env var.
   */
  timezone: "UTC",
  /** Small "powered by" credit in the footer. Set false to hide. */
  showPoweredBy: true,
};

// ──────────────────────────────────────────────────────────────────────────
// Notifications — automatic alerts when an incident opens, changes, or
// resolves. Channels activate through env vars (see .env.example):
// RESEND_API_KEY enables email subscriptions (double opt-in, KV required);
// NOTIFY_SLACK_WEBHOOK_URL / NOTIFY_DISCORD_WEBHOOK_URL / NOTIFY_WEBHOOK_URL
// enable webhooks. With nothing configured, nothing is sent and the
// subscribe UI stays hidden.
// ──────────────────────────────────────────────────────────────────────────

export const NOTIFICATIONS = {
  /**
   * Which incident-update levels get announced. "monitoring" is omitted by
   * default so subscribers hear "we found a problem" and "it's fixed"
   * without the intermediate chatter.
   */
  levels: ["investigating", "identified", "resolved"] as UpdateLevel[],
  /**
   * From address for email notifications. The domain must be verified in
   * your Resend account. Use a subdomain (e.g. updates.lanitech360.com) so
   * status mail can't hurt your primary domain's reputation.
   */
  emailFrom: "LaniTech360 Status <status@updates.lanitech360.com>",
};

// ──────────────────────────────────────────────────────────────────────────
// Services — one entry per row on the page. The API routes, cron sampling,
// uptime history, and auto-incident detection all follow this list.
//
// Probe helpers (import from "@/lib/probes"):
//   httpProbe(url)                    any 2xx → operational, other response
//                                     → degraded, timeout/network → down
//   dependencyProbe(url, name)        reads `dependencies.<name>` (or
//                                     `checks.<name>`) from a JSON readiness
//                                     endpoint — for services that aren't
//                                     publicly routable
//   supabaseAuthProbe(base, anonKey?) checks a Supabase project's auth
//                                     health endpoint
//
// Or write your own: any async () => { status, latencyMs } works.
// ──────────────────────────────────────────────────────────────────────────

export const SERVICES: ServiceDef[] = [
  {
    id: "website",
    name: "Website",
    description: "Main LaniTech360 website",
    probe: httpProbe("https://lanitech360.com/"),
  },
  {
    id: "business-suite-web",
    name: "Business Suite",
    description: "Powers the main business suite app",
    probe: httpProbe("https://lanitech360-biz.com/"),
  },
  {
    id: "business-suite-api",
    name: "Business Suite API",
    description: "Powers the backend behind the app",
    // The API rejects anonymous requests, so a 401 still means it's up.
    probe: reachableProbe("https://backend.lanitech360-biz.com/"),
  },
  {
    id: "stripe",
    name: "Card Payments (Stripe)",
    description: "International card payments",
    probe: reachableProbe("https://api.stripe.com/"),
  },
  {
    id: "paynow",
    name: "Paynow",
    description: "Local mobile money and bank payments",
    probe: reachableProbe("https://www.paynow.co.zw/"),
  },
  {
    id: "zimra",
    name: "ZIMRA Fiscalization",
    description: "Fiscal receipt submission to ZIMRA",
    probe: reachableProbe("https://fdmsapi.zimra.co.zw/Public/v1/GetServerCertificate"),
  },

  // A service that isn't publicly routable, read through your API's
  // readiness endpoint:
  //
  // {
  //   id: "worker",
  //   name: "Background Worker",
  //   description: "Processes jobs and scheduled tasks",
  //   probe: dependencyProbe("https://api.lanitech360.com/health/ready", "worker"),
  // },

  // A Supabase project (anon key optional — without it, an answering
  // gateway still counts as reachable):
  //
  // {
  //   id: "database",
  //   name: "Database & Auth",
  //   description: "Keeps your data and sign in working",
  //   probe: supabaseAuthProbe(
  //     "https://yourproject.supabase.co",
  //     process.env.STATUS_SUPABASE_ANON_KEY,
  //   ),
  // },
];
