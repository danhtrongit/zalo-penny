export interface CsvColumn<T> {
  key: keyof T | string;
  label: string;
  /** Optional value accessor; defaults to row[key]. */
  value?: (row: T) => unknown;
}

function escapeCell(value: unknown): string {
  if (value == null) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Serialize rows to a CSV string with a header row. */
export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const header = columns.map((c) => escapeCell(c.label)).join(",");
  const body = rows
    .map((row) =>
      columns
        .map((c) => escapeCell(c.value ? c.value(row) : (row as Record<string, unknown>)[c.key as string]))
        .join(",")
    )
    .join("\n");
  return body ? `${header}\n${body}` : header;
}

/** Trigger a browser download of CSV content (with UTF-8 BOM for Excel). */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
