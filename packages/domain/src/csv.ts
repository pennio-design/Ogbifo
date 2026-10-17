/**
 * Minimal CSV for spreadsheet exports (RFC 4180): quoted fields, doubled quotes,
 * commas and line breaks inside quotes, CRLF or LF, and the byte-order mark that
 * Excel adds to UTF-8 files. Text is returned exactly as written: tone marks are
 * never normalised here.
 */
export function parseCsv(input: string): string[][] {
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  let sawAny = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]!;
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else quoted = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') {
      quoted = true;
      sawAny = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
      sawAny = true;
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      sawAny = false;
    } else {
      field += ch;
      sawAny = true;
    }
  }
  if (sawAny || field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => !(r.length === 1 && r[0] === ""));
}

export function toCsv(rows: readonly (readonly string[])[]): string {
  const cell = (value: string) => (/[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);
  return rows.map((r) => r.map(cell).join(",")).join("\n") + "\n";
}
