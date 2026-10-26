import { AlertTriangle, Check, Minus, Wrench } from "lucide-react";
import type { Health } from "@/lib/services";
import { STATUS_VAR } from "@/lib/present";

const GLYPH = {
  operational: Check,
  degraded: AlertTriangle,
  down: Minus,
  maintenance: Wrench,
} satisfies Record<Health, unknown>;

const SIZE = {
  sm: { box: "h-4 w-4", glyph: "h-2.5 w-2.5", stroke: 4 },
  lg: { box: "h-16 w-16 sm:h-20 sm:w-20", glyph: "h-8 w-8 sm:h-10 sm:w-10", stroke: 3.5 },
};

// A solid status-colour disc with a white glyph: the large headline mark and
// the small per-row marker.
export function StatusBadge({
  status,
  size,
}: {
  status: Health;
  size: keyof typeof SIZE;
}) {
  const Glyph = GLYPH[status];
  const s = SIZE[size];
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full ${s.box}`}
      style={{
        background: STATUS_VAR[status].fg,
        boxShadow:
          size === "lg"
            ? `0 8px 24px color-mix(in srgb, ${STATUS_VAR[status].fg} 30%, transparent)`
            : undefined,
      }}
      aria-hidden
    >
      <Glyph className={`${s.glyph} text-white`} strokeWidth={s.stroke} />
    </span>
  );
}
