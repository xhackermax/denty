/**
 * Document templates are stored as light markup: "## " headings, "- " list
 * items and blank-line separated paragraphs, with {{placeholders}} filled from
 * the patient, doctor and clinic. The same blocks are rendered on screen (for
 * the patient to read before signing) and in the printed document.
 */

export type TemplateBlock =
  | { kind: "heading"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "paragraph"; text: string };

export type TemplateValues = Readonly<Record<string, string | null | undefined>>;

/** Replaces {{name}} with its value; unknown placeholders become empty. */
export function fillPlaceholders(text: string, values: TemplateValues): string {
  return text.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_, key: string) => values[key] ?? "");
}

export function parseTemplate(body: string, values: TemplateValues = {}): TemplateBlock[] {
  const blocks: TemplateBlock[] = [];
  let paragraph: string[] = [];
  const flush = () => {
    if (paragraph.length) blocks.push({ kind: "paragraph", text: paragraph.join(" ") });
    paragraph = [];
  };
  for (const raw of fillPlaceholders(body, values).split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) {
      flush();
      continue;
    }
    if (line.startsWith("## ")) {
      flush();
      blocks.push({ kind: "heading", text: line.slice(3).trim() });
      continue;
    }
    if (line.startsWith("- ")) {
      flush();
      const last = blocks.at(-1);
      if (last?.kind === "list") last.items.push(line.slice(2).trim());
      else blocks.push({ kind: "list", items: [line.slice(2).trim()] });
      continue;
    }
    paragraph.push(line);
  }
  flush();
  return blocks;
}

const LONG_DATE = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** "2026-09-29" → "29/09/2026" */
export function shortDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

/** "2026-09-29" → "29 de septiembre de 2026" */
export function longDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return value;
  return LONG_DATE.format(
    new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))),
  );
}
