import type { OrthodonticVisualSymbol } from "./odontogram-layer-projection";
import styles from "./odontogram.module.css";

const ORTHO_LABELS: Record<OrthodonticVisualSymbol, string> = {
  bracket: "Bracket y arco",
  band: "Banda ortodóntica",
  attachment: "Atache",
  extract: "Extracción ortodóntica",
  space: "Espacio ortodóntico",
  miniscrew: "Microtornillo de anclaje ortodóntico",
  maintainer: "Mantenedor de espacio",
  aligner: "Alineador",
  retainer: "Retenedor",
  expander: "Disyuntor",
  lingual_arch: "Arco lingual",
};

/**
 * Overlay on the existing anatomical tooth SVG (64 × 90).
 * Miniscrews are shown next to the root, not as an osseointegrated prosthetic implant.
 */
export function OrthodonticToothSymbols({ symbols }: { symbols: readonly OrthodonticVisualSymbol[] }) {
  if (!symbols.length) return null;
  return (
    <g aria-label="Marcas ortodónticas">
      {symbols.map((symbol) => (
        <g
          key={symbol}
          data-orthodontic-symbol={symbol}
          role="img"
          aria-label={ORTHO_LABELS[symbol]}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {symbol === "bracket" ? (
            <>
              <path d="M8 34 H56" className={styles.orthoStroke} />
              <rect x="25" y="27" width="14" height="14" rx="2" className={styles.orthoMetal} />
              <path d="M32 28 V40 M26 34 H38" className={styles.orthoStroke} />
            </>
          ) : null}
          {symbol === "band" ? (
            <path d="M18 23 Q32 18 46 23 L46 43 Q32 48 18 43 Z M19 34 H45" className={styles.orthoBand} />
          ) : null}
          {symbol === "attachment" ? (
            <rect x="26" y="29" width="12" height="10" rx="3" className={styles.orthoAttachment} />
          ) : null}
          {symbol === "extract" ? (
            <path d="M19 22 L45 48 M45 22 L19 48" className={styles.orthoDanger} />
          ) : null}
          {symbol === "space" ? (
            <path d="M20 34 H44 M20 27 V41 M44 27 V41" className={styles.orthoDashed} />
          ) : null}
          {symbol === "miniscrew" ? (
            <>
              <circle cx="53" cy="56" r="5" className={styles.orthoMetal} />
              <path d="M50 56 H56 M53 53 V59 M53 61 L48 80 M51 66 L57 67 M50 71 L56 72 M49 76 L54 77" className={styles.orthoScrew} />
            </>
          ) : null}
          {symbol === "maintainer" ? (
            <path d="M18 30 H46 M19 24 V41 M45 24 V41 M23 35 Q32 45 41 35" className={styles.orthoBand} />
          ) : null}
          {symbol === "aligner" ? (
            <path d="M13 20 Q17 7 32 9 Q47 7 51 20 L49 45 Q32 56 15 45 Z" className={styles.orthoAligner} />
          ) : null}
          {symbol === "retainer" ? (
            <>
              <path d="M14 40 Q32 51 50 40" className={styles.orthoStroke} />
              <circle cx="17" cy="39" r="2.5" className={styles.orthoMetal} />
              <circle cx="47" cy="39" r="2.5" className={styles.orthoMetal} />
            </>
          ) : null}
          {symbol === "expander" ? (
            <path d="M15 28 H49 M15 42 H49 M24 28 V42 M40 28 V42 M29 31 H35 V39 H29 Z" className={styles.orthoBand} />
          ) : null}
          {symbol === "lingual_arch" ? (
            <path d="M13 36 Q32 56 51 36 M14 31 V42 M50 31 V42" className={styles.orthoStroke} />
          ) : null}
        </g>
      ))}
    </g>
  );
}
