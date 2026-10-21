/**
 * Turns a standalone printable page (from any of the document builders) into a fragment that
 * can sit next to others inside one bigger document. Each builder ships its own stylesheet with
 * bare `body`, `h1` or `header` rules; nesting them under a scope class keeps one document's
 * look from leaking into the next, so every page prints as it does on its own.
 */
export function embedPrintDocument(html: string, scope: string): string {
  const body = /<body[^>]*>([\s\S]*)<\/body>/i.exec(html)?.[1] ?? html;
  const css = Array.from(html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi))
    .map((match) => match[1] ?? "")
    .join("\n")
    // Page size and margins belong to the master document: @page is invalid when nested.
    .replace(/@page\s*\{[^}]*\}/g, "")
    // The fragment's root stands in for the original <body>.
    .replace(/(^|[\s,{};])body(?=[\s,{>.:#[])/g, "$1&");
  // The master document already sets the page margins; the embedded body must not add more.
  const style = css.trim() ? `<style>.${scope} { ${css} }\n.${scope} { margin: 0; }</style>` : "";
  return `<section class="${scope}">${style}${body.trim()}</section>`;
}
