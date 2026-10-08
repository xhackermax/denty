"use client";

import { useActionState } from "react";

import { confirmAppointmentAction } from "./confirmation-action";
import type { ConfirmationState } from "./confirmation-state";
import styles from "./page.module.css";

const initialState: ConfirmationState = { status: "idle", message: "" };

export function ConfirmationForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(confirmAppointmentAction, initialState);
  return (
    <form action={action} className={styles.form}>
      <input type="hidden" name="token" value={token} />
      <button className={styles.button} type="submit" disabled={pending || state.status === "success"}>
        {pending ? "Confirmando…" : state.status === "success" ? "Cita confirmada" : "Confirmar mi cita"}
      </button>
      {state.status !== "idle" ? (
        <p
          role="status"
          aria-live="polite"
          className={state.status === "success" ? styles.success : styles.error}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
