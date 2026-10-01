import type { MouthState } from "@/domain/odontogram/mouth-state";
import { createPerioExam, type PerioExam } from "@/domain/periodontal/exam";
import {
  createPerioSession,
  reconcileSessionMouth,
  type PerioSession,
  type PerioOrder,
} from "@/domain/periodontal/entry-cursor";
import type { PerioDraft, PerioDraftData } from "@/shared/api/schemas/perio-drafts";
import { DraftWriter } from "./draft-writer";
interface DraftApi {
  get: (patientId: string) => Promise<PerioDraft | null>;
  save: (
    patientId: string,
    data: PerioDraftData,
    version: number,
    draftId: string | null,
  ) => Promise<PerioDraft>;
  finish: (patientId: string, version: number, draftId: string) => Promise<{ examId: string }>;
}
/** Owned above the odontogram's version key: remounts share one stream and command history. */
export class PerioDraftOwner {
  session: PerioSession | null = null;
  lastSaved: PerioSession | null = null;
  initialized = false;
  closed = false;
  dirty = false;
  busy = false;
  status = "Cargando borrador…";
  error = "";
  checkpoint: { draftId: string; version: number } | null = null;
  private writer: DraftWriter<PerioDraftData> | null = null;
  private generation: string | null = null;
  private api: DraftApi | null = null;
  private patientId = "";
  private load: Promise<PerioDraft | null> | null = null;
  private listeners = new Set<() => void>();
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private emit() {
    for (const listener of this.listeners) listener();
  }
  private makeWriter(version: number) {
    return new DraftWriter<PerioDraftData>(async (data, v) => {
      const saved = await this.api!.save(this.patientId, data, v, this.generation);
      this.generation = saved.id;
      return saved.version;
    }, version);
  }
  async initialize(api: DraftApi, patientId: string, mouth: MouthState, prior: PerioExam | null) {
    this.api = api;
    this.patientId = patientId;
    if (this.initialized) return this.session!;
    if (!this.load)
      this.load = api.get(patientId).catch((error) => {
        this.load = null;
        throw error;
      });
    try {
      const draft = await this.load;
      if (!this.initialized) {
        this.generation = draft?.id ?? null;
        this.writer = this.makeWriter(draft?.version ?? 0);
        this.session = draft
          ? reconcileSessionMouth({ ...draft.data, past: [] }, mouth)
          : createPerioSession(prior ?? createPerioExam(mouth), mouth);
        this.lastSaved = this.session;
        this.closed = !draft && prior !== null;
        this.dirty = false;
        this.initialized = true;
        this.error = "";
        this.status = draft
          ? "Borrador recuperado"
          : this.closed
            ? "Examen previo · inicia uno nuevo para medir"
            : "Sin cambios";
        this.emit();
      }
      return this.session!;
    } catch (error) {
      this.error = error instanceof Error ? error.message : "No se pudo cargar el borrador.";
      this.emit();
      throw error;
    }
  }
  update(session: PerioSession, dirty = true) {
    this.session = session;
    this.dirty = dirty;
    this.error = "";
    this.emit();
  }
  reconcile(mouth: MouthState) {
    if (!this.session) return;
    const next = reconcileSessionMouth(this.session, mouth);
    const changed = JSON.stringify(next.exam) !== JSON.stringify(this.session.exam);
    this.session = next;
    if (changed && !this.closed) this.dirty = true;
    this.emit();
  }
  async persist(session: PerioSession) {
    if (this.closed) return;
    if (!this.writer) throw new Error("El borrador todavía no está disponible.");
    this.status = "Guardando…";
    this.emit();
    try {
      await this.writer.write({
        order: session.order,
        exam: session.exam,
        cursor: session.cursor,
        lastTriplet: session.lastTriplet,
      });
      this.lastSaved = session;
      if (this.session === session) this.dirty = false;
      this.status = "Borrador guardado";
      this.error = "";
      this.emit();
    } catch (error) {
      this.status = "Sin guardar";
      this.error = error instanceof Error ? error.message : "No se pudo guardar.";
      this.emit();
      throw error;
    }
  }
  async finish(beforeFinalize?: () => Promise<void>) {
    if (this.busy || this.closed) return;
    this.busy = true;
    this.error = "";
    this.emit();
    try {
      if (!this.checkpoint) {
        await beforeFinalize?.();
        await this.persist(this.session!);
        const version = await this.writer!.flush();
        if (!this.generation) throw new Error("El servidor no devolvió la identidad del borrador.");
        this.checkpoint = { draftId: this.generation, version };
        this.dirty = true;
        this.emit();
      }
      const result = await this.api!.finish(
        this.patientId,
        this.checkpoint.version,
        this.checkpoint.draftId,
      );
      this.closed = true;
      this.dirty = false;
      this.checkpoint = null;
      this.status = "Examen guardado";
      return result;
    } catch (error) {
      this.error =
        error instanceof Error ? error.message : "No se pudo finalizar; el borrador se conserva.";
      throw error;
    } finally {
      this.busy = false;
      this.emit();
    }
  }
  startNew(mouth: MouthState, order: PerioOrder) {
    if (this.busy || this.checkpoint)
      throw new Error("Reintenta la finalización pendiente antes de abrir otro examen.");
    this.generation = null;
    this.writer = this.makeWriter(0);
    this.closed = false;
    this.session = createPerioSession(createPerioExam(mouth), mouth, order);
    this.lastSaved = this.session;
    this.dirty = false;
    this.status = "Nuevo examen";
    this.error = "";
    this.emit();
  }
  discard() {
    if (this.lastSaved) {
      this.session = this.lastSaved;
      this.dirty = false;
      this.emit();
    }
  }
  reload() {
    if (this.busy || this.checkpoint) throw new Error("Reintenta la finalización pendiente.");
    this.initialized = false;
    this.session = null;
    this.lastSaved = null;
    this.writer = null;
    this.generation = null;
    this.load = null;
    this.dirty = false;
    this.error = "";
    this.status = "Cargando borrador…";
    this.emit();
  }
}
export function createPerioDraftOwner() {
  return new PerioDraftOwner();
}
