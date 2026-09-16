import Script from "next/script";
import {LegacyDentyShell} from "./LegacyDentyShell";
export function LegacyDentyRuntime(){return <><LegacyDentyShell/><Script src="/denty-app.bundle.js" strategy="afterInteractive"/><Script src="/scripts/cinematic-motion.js" strategy="afterInteractive"/></>}
