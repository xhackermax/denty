import { legacyShellHtml } from '../lib/legacy-shell';

export function LegacyDentyShell() {
  return <div dangerouslySetInnerHTML={{ __html: legacyShellHtml }} />;
}
