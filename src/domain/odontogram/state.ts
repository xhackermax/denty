import type { DentalEntity } from "./index.ts";
import {
  evaluateClinicalAction,
  evaluateClinicalBatch,
  type ClinicalRuleContext,
  type ClinicalRuleEvaluation,
} from "./clinical-rules/index.ts";

export interface OdontogramEntityState {
  readonly entitiesById: Readonly<Record<string, DentalEntity>>;
  readonly revision: number;
}

export type OdontogramCommand =
  | { readonly type: "UPSERT_ENTITY"; readonly entity: DentalEntity }
  | { readonly type: "UPSERT_ENTITIES"; readonly entities: readonly DentalEntity[] }
  | { readonly type: "SET_ENTITY_STATUS"; readonly entityId: string; readonly status: string }
  | { readonly type: "DEACTIVATE_ENTITY"; readonly entityId: string }
  | { readonly type: "REMOVE_ENTITY"; readonly entityId: string };

export interface BoundedHistory<T> {
  readonly past: readonly T[];
  readonly present: T;
  readonly future: readonly T[];
  readonly limit: number;
}

function withEntity(state: OdontogramEntityState, entity: DentalEntity): OdontogramEntityState {
  return {
    entitiesById: { ...state.entitiesById, [entity.id]: entity },
    revision: state.revision + 1,
  };
}

export function createOdontogramEntityState(
  entities: readonly DentalEntity[] = [],
): OdontogramEntityState {
  let state: OdontogramEntityState = { entitiesById: {}, revision: 0 };
  for (const entity of entities) state = withEntity(state, entity);
  return { ...state, revision: 0 };
}

export function applyOdontogramCommand(
  state: OdontogramEntityState,
  command: OdontogramCommand,
): OdontogramEntityState {
  if (command.type === "UPSERT_ENTITY") return withEntity(state, command.entity);
  if (command.type === "UPSERT_ENTITIES") return command.entities.reduce(withEntity, state);

  const current = state.entitiesById[command.entityId];
  if (!current) throw new RangeError(`Entidad odontológica inexistente: ${command.entityId}`);

  if (command.type === "SET_ENTITY_STATUS") {
    return withEntity(state, { ...current, status: command.status });
  }
  if (command.type === "DEACTIVATE_ENTITY") {
    return withEntity(state, { ...current, active: false });
  }

  const entitiesById = { ...state.entitiesById };
  delete entitiesById[command.entityId];
  return { entitiesById, revision: state.revision + 1 };
}

export function createBoundedHistory<T>(present: T, limit = 30): BoundedHistory<T> {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new RangeError("El límite del historial debe ser un entero mayor que cero");
  }
  return { past: [], present, future: [], limit };
}

export function commitHistory<T>(history: BoundedHistory<T>, next: T): BoundedHistory<T> {
  if (Object.is(history.present, next)) return history;
  const past = [...history.past, history.present].slice(-history.limit);
  return { ...history, past, present: next, future: [] };
}

export function undoHistory<T>(history: BoundedHistory<T>): BoundedHistory<T> {
  const previous = history.past.at(-1);
  if (previous === undefined) return history;
  return {
    ...history,
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future],
  };
}

export function redoHistory<T>(history: BoundedHistory<T>): BoundedHistory<T> {
  const next = history.future[0];
  if (next === undefined) return history;
  const past = [...history.past, history.present].slice(-history.limit);
  return {
    ...history,
    past,
    present: next,
    future: history.future.slice(1),
  };
}

export function executeOdontogramCommand(
  history: BoundedHistory<OdontogramEntityState>,
  command: OdontogramCommand,
): BoundedHistory<OdontogramEntityState> {
  return commitHistory(history, applyOdontogramCommand(history.present, command));
}

export interface ValidatedOdontogramResult {
  readonly history: BoundedHistory<OdontogramEntityState>;
  readonly evaluation: ClinicalRuleEvaluation;
}

const allowEvaluation: ClinicalRuleEvaluation = {
  outcome: "ALLOW",
  ruleIds: [],
  messages: [],
  decisions: [],
};

function entityProposedByCommand(
  state: OdontogramEntityState,
  command: OdontogramCommand,
): DentalEntity | null {
  if (command.type === "UPSERT_ENTITY") return command.entity;
  if (command.type === "SET_ENTITY_STATUS") {
    const current = state.entitiesById[command.entityId];
    if (!current) throw new RangeError(`Entidad odontológica inexistente: ${command.entityId}`);
    return { ...current, status: command.status };
  }
  return null;
}

export function executeValidatedOdontogramCommand(
  history: BoundedHistory<OdontogramEntityState>,
  command: Exclude<OdontogramCommand, { readonly type: "UPSERT_ENTITIES" }>,
  context: ClinicalRuleContext = {},
): ValidatedOdontogramResult {
  const proposed = entityProposedByCommand(history.present, command);
  const evaluation = proposed
    ? evaluateClinicalAction(
        { type: "UPSERT_ENTITY", entity: proposed },
        Object.values(history.present.entitiesById),
        context,
      )
    : allowEvaluation;
  if (evaluation.outcome === "BLOCK" || evaluation.outcome === "REQUIRE_CONTEXT") {
    return { history, evaluation };
  }
  return { history: executeOdontogramCommand(history, command), evaluation };
}

export function executeValidatedOdontogramBatch(
  history: BoundedHistory<OdontogramEntityState>,
  entities: readonly DentalEntity[],
  context: ClinicalRuleContext = {},
): ValidatedOdontogramResult {
  const evaluation = evaluateClinicalBatch(
    entities.map((entity) => ({ type: "UPSERT_ENTITY" as const, entity })),
    Object.values(history.present.entitiesById),
    context,
  );
  if (evaluation.outcome === "BLOCK" || evaluation.outcome === "REQUIRE_CONTEXT") {
    return { history, evaluation };
  }
  return {
    history: executeOdontogramCommand(history, { type: "UPSERT_ENTITIES", entities }),
    evaluation,
  };
}
