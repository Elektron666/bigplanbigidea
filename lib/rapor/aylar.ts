// Which months a usage report can show (job 11). Pure.

import { monthRange, recentMonths } from "@/lib/monthly";

export const REPORT_MONTHS = 12;

/** The months a report can be asked for, newest first: the last twelve, none before the log began (2026). */
export function reportMonths(now = new Date()): string[] {
  return recentMonths(REPORT_MONTHS, now).filter((m) => monthRange(m));
}

/** The month asked for, if it is one of reportMonths(); else the last full month (the running one in the log's first month). */
export function pickMonth(raw: unknown, now = new Date()): string {
  const months = reportMonths(now);
  return typeof raw === "string" && months.includes(raw) ? raw : (months[1] ?? months[0]);
}
