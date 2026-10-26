"use client";

import { useEffect, useState } from "react";

// "Oct 26, 2026 at 12:34pm CAT"
function formatLong(iso: string, timeZone?: string) {
  const d = new Date(iso);
  const tz = timeZone ? { timeZone } : {};
  const date = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...tz,
  });
  const time = d
    .toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
      ...tz,
    })
    .replace(/\s?(AM|PM)/, (m) => m.trim().toLowerCase());
  return `${date} at ${time}`;
}

function format(iso: string, timeZone?: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
    ...(timeZone ? { timeZone } : {}),
  });
}

// Renders an ISO instant in the *viewer's* timezone. Because the page is
// server-rendered (in UTC on Vercel), formatting has to happen after mount to
// pick up the browser's tz. To avoid a hydration mismatch we render a stable
// UTC string on the server and first client paint, then swap to local time.
export function LocalTime({
  iso,
  className,
  long = false,
}: {
  iso: string;
  className?: string;
  /** Full date with year, e.g. "Oct 26, 2026 at 12:34pm CAT". */
  long?: boolean;
}) {
  const fmt = long ? formatLong : format;
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- standard hydration gate: flips exactly once after mount
  useEffect(() => setMounted(true), []);

  return (
    <time className={className} dateTime={iso} suppressHydrationWarning>
      {mounted ? fmt(iso) : fmt(iso, "UTC")}
    </time>
  );
}
