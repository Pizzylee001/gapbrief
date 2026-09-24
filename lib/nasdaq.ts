import type { CandleRow } from "./gaps";

/* Pure parser for the Nasdaq keyless historical endpoint.
   Input rows carry MM/DD/YYYY dates and dollar strings like "$228.87".
   Output is ascending {date, open, close} with malformed rows skipped.
   Empty or missing rows is an empty result, never an error. */

function parseMoney(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value !== "string") {
    return null;
  }
  const cleaned = value.replace(/[$,]/g, "").trim();
  if (cleaned === "" || cleaned.toLowerCase() === "n/a") {
    return null;
  }
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : null;
}

function parseUsDate(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!match) {
    return null;
  }
  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }
  const iso = `${match[3]}-${match[1]}-${match[2]}`;
  const check = new Date(`${iso}T00:00:00Z`);
  if (
    Number.isNaN(check.getTime()) ||
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() + 1 !== month ||
    check.getUTCDate() !== day
  ) {
    return null;
  }
  return iso;
}

export function parseNasdaqRows(json: unknown): CandleRow[] {
  const rawRows = (json as { data?: { tradesTable?: { rows?: unknown } } } | null)
    ?.data?.tradesTable?.rows;
  if (!Array.isArray(rawRows)) {
    return [];
  }
  const rows: CandleRow[] = [];
  for (const entry of rawRows) {
    const row = entry as { date?: unknown; open?: unknown; close?: unknown } | null;
    if (!row || typeof row !== "object") {
      continue;
    }
    const date = parseUsDate(row.date);
    const open = parseMoney(row.open);
    const close = parseMoney(row.close);
    if (!date || open === null || close === null) {
      continue;
    }
    rows.push({ date, open, close });
  }
  rows.sort((a, b) => a.date.localeCompare(b.date));
  return rows;
}
