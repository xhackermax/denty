"use client";

import styles from "./global-error.module.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es">
      <body className={styles.body}>
        <main className={styles.panel}>
          <h1 className={styles.title}>Denty no pudo iniciar</h1>
          <p>{error.message || "No se pudo cargar Denty."}</p>
          <button type="button" onClick={reset} className={styles.button}>
            Reintentar
          </button>
        </main>
      </body>
    </html>
  );
}
