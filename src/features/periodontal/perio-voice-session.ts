import type { PerioCommand } from "@/domain/periodontal/entry-cursor";
const sessions = new Map<string, (command: PerioCommand) => void>();
export function registerPerioSession(patientId: string, dispatch: (command: PerioCommand) => void) {
  sessions.set(patientId, dispatch);
  return () => {
    if (sessions.get(patientId) === dispatch) sessions.delete(patientId);
  };
}
export function dispatchPerioVoice(patientId: string, command: PerioCommand) {
  const dispatch = sessions.get(patientId);
  if (!dispatch) throw new Error("Abre el periodontograma para introducir datos en su borrador.");
  dispatch(command);
}
