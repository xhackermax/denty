"use client";

import { Button, SegmentedControl } from "@mantine/core";
import { IconArchive, IconCalendarRepeat, IconPlus, IconSortDescending } from "@tabler/icons-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useState } from "react";

import { getBrowserApi } from "@/shared/api/browser";
import { dentyQueryKeys } from "@/shared/query";
import { ActionErrorAlert } from "../modules/action-error-alert";
import { ArchivedList } from "./archived-list";
import { DayStrip } from "./day-strip";
import { TaskEditorModal, type TaskFormValues } from "./task-editor-modal";
import { TaskNode } from "./task-node";
import {
  buildSchedule,
  mergeVisibleOrder,
  moveId,
  moveIdToIndex,
  planReplan,
  sortByPriority,
  timeInputToDueAt,
  zonedDayKey,
} from "./task-timeline";
import type { TasksApi, TimelineTask } from "./task-types";
import { TimelineGap } from "./timeline-gap";
import styles from "./tasks-timeline.module.css";
import { useTaskActions } from "./use-task-actions";

interface TasksTimelineProps {
  api?: TasksApi;
  now?: () => Date;
}

interface UndoState {
  label: string;
  run: () => void;
}

const UNDO_MS = 8000;
const TICK_MS = 60_000;

function defaultApi(): TasksApi {
  return getBrowserApi().tasks;
}

export function TasksTimeline({ api, now: nowFn = () => new Date() }: TasksTimelineProps) {
  const qc = useQueryClient();
  const resolvedApi = useMemo(() => api ?? defaultApi(), [api]);
  const actions = useTaskActions(resolvedApi);
  const reduceMotion = useReducedMotion();

  const [now, setNow] = useState(nowFn);
  const today = zonedDayKey(now);
  const [selectedDay, setSelectedDay] = useState(() => zonedDayKey(nowFn()));
  const [view, setView] = useState<"active" | "archive">("active");
  const [editing, setEditing] = useState<TimelineTask | null>(null);
  const [creating, setCreating] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [undo, setUndo] = useState<UndoState | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(nowFn()), TICK_MS);
    return () => clearInterval(timer);
  }, [nowFn]);

  useEffect(() => {
    if (!undo) return;
    const timer = setTimeout(() => setUndo(null), UNDO_MS);
    return () => clearTimeout(timer);
  }, [undo]);

  const query = useQuery({
    queryKey: dentyQueryKeys.tasks.all,
    queryFn: () => resolvedApi.list(),
  });
  const allTasks = useMemo(() => query.data?.items ?? [], [query.data]);
  const archived = useMemo(() => allTasks.filter((t) => t.archivedAt), [allTasks]);
  const schedule = useMemo(
    () => buildSchedule(allTasks, { dayKey: selectedDay, now }),
    [allTasks, selectedDay, now],
  );

  const allIds = useMemo(() => allTasks.map((t) => t.id), [allTasks]);
  const visibleIds = useMemo(() => schedule.entries.map((e) => e.task.id), [schedule]);
  const overdueCount = schedule.entries.filter((e) => e.overdue).length;
  const doneEntries = schedule.entries.filter((e) => e.task.status === "DONE");

  // El deshacer lee la versión vigente del caché: tras la mutación el refetch ya la subió.
  function currentVersion(task: TimelineTask): number {
    const fresh = qc
      .getQueryData<{ items: TimelineTask[] }>(dentyQueryKeys.tasks.all)
      ?.items.find((t) => t.id === task.id);
    return fresh?.version ?? task.version;
  }

  function applyOrder(visibleOrder: string[]) {
    if (visibleOrder.join() === visibleIds.join()) return;
    actions.reorder.mutate(mergeVisibleOrder(allIds, visibleOrder));
  }

  function toggleDone(task: TimelineTask) {
    const done = task.status === "DONE";
    actions.patch.mutate(
      { id: task.id, version: task.version, patch: { status: done ? "OPEN" : "DONE" } },
      {
        onSuccess: () => {
          if (done) return;
          setUndo({
            label: `«${task.title}» marcada como hecha`,
            run: () =>
              actions.patch.mutate({
                id: task.id,
                version: currentVersion(task),
                patch: { status: "OPEN" },
              }),
          });
        },
      },
    );
  }

  function archiveOne(task: TimelineTask) {
    actions.patch.mutate(
      { id: task.id, version: task.version, patch: { archived: true } },
      {
        onSuccess: () =>
          setUndo({
            label: `«${task.title}» archivada`,
            run: () =>
              actions.patch.mutate({
                id: task.id,
                version: currentVersion(task),
                patch: { archived: false },
              }),
          }),
      },
    );
  }

  function archiveDone() {
    const tasks = doneEntries.map((e) => e.task);
    if (tasks.length === 0) return;
    actions.patchMany.mutate(
      tasks.map((t) => ({ id: t.id, version: t.version, patch: { archived: true } })),
      {
        onSuccess: () =>
          setUndo({
            label: `${tasks.length} ${tasks.length === 1 ? "tarea archivada" : "tareas archivadas"}`,
            run: () =>
              actions.patchMany.mutate(
                tasks.map((t) => ({
                  id: t.id,
                  version: currentVersion(t),
                  patch: { archived: false },
                })),
              ),
          }),
      },
    );
  }

  function restore(task: TimelineTask) {
    actions.patch.mutate({ id: task.id, version: task.version, patch: { archived: false } });
  }

  function submit(values: TaskFormValues) {
    const dueAt = timeInputToDueAt(selectedDay, values.time);
    if (editing) {
      actions.patch.mutate(
        {
          id: editing.id,
          version: editing.version,
          patch: {
            title: values.title,
            priority: values.priority,
            durationMin: values.durationMin,
            // Editar sin hora devuelve la tarea a la secuencia calculada.
            dueAt: values.time ? (dueAt ?? editing.dueAt ?? null) : null,
          },
        },
        { onSuccess: () => setEditing(null) },
      );
      return;
    }
    actions.create.mutate(
      {
        title: values.title,
        priority: values.priority,
        durationMin: values.durationMin,
        ...(dueAt ? { dueAt } : {}),
      },
      { onSuccess: () => setCreating(false) },
    );
  }

  function drop(targetId: string) {
    if (dragId && dragId !== targetId) {
      applyOrder(moveIdToIndex(visibleIds, dragId, visibleIds.indexOf(targetId)));
    }
    setDragId(null);
    setOverId(null);
  }

  function replan() {
    const plan = planReplan(schedule);
    actions.replan.mutate({
      plan,
      allIds: mergeVisibleOrder(allIds, plan.orderedIds),
      tasks: allTasks,
    });
  }

  const motionProps = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: 12 },
        transition: { duration: 0.18 },
      };

  return (
    <div className={styles.root}>
      <ActionErrorAlert
        errors={[
          query.error,
          actions.create.error,
          actions.patch.error,
          actions.patchMany.error,
          actions.reorder.error,
          actions.replan.error,
        ]}
      />
      <div className={styles.header}>
        <h2 className={styles.title}>Tareas</h2>
        <SegmentedControl
          size="xs"
          value={view}
          onChange={(value) => setView(value as typeof view)}
          data={[
            { value: "active", label: "Activas" },
            { value: "archive", label: `Archivo${archived.length ? ` (${archived.length})` : ""}` },
          ]}
        />
      </div>

      {view === "archive" ? (
        query.isLoading ? (
          <p className={styles.state} role="status">
            Cargando tareas…
          </p>
        ) : (
          <ArchivedList tasks={archived} onRestore={restore} />
        )
      ) : (
        <>
          <DayStrip selectedDay={selectedDay} today={today} onSelect={setSelectedDay} />
          <div className={styles.toolbar}>
            <Button
              size="xs"
              variant="light"
              leftSection={<IconSortDescending size={14} />}
              disabled={schedule.entries.length < 2}
              onClick={() =>
                applyOrder(sortByPriority(schedule.entries.map((e) => e.task)).map((t) => t.id))
              }
            >
              Ordenar por prioridad
            </Button>
            <Button
              size="xs"
              variant="light"
              color="gray"
              leftSection={<IconArchive size={14} />}
              disabled={doneEntries.length === 0}
              loading={actions.patchMany.isPending}
              onClick={archiveDone}
            >
              Archivar hechas
            </Button>
          </div>

          {query.isLoading ? (
            <p className={styles.state} role="status">
              Cargando tareas…
            </p>
          ) : schedule.rows.length === 0 ? (
            <p className={styles.state}>No hay tareas para este día. Crea una con el botón «+».</p>
          ) : (
            <ol className={styles.list} aria-label="Tareas del día">
              {schedule.rows.map((row) => {
                if (row.kind === "gap") return <TimelineGap key={row.key} gap={row.gap} />;
                const id = row.entry.task.id;
                const index = visibleIds.indexOf(id);
                return (
                  <TaskNode
                    key={row.key}
                    entry={row.entry}
                    isFirst={index === 0}
                    isLast={index === visibleIds.length - 1}
                    dragging={dragId === id}
                    dropTarget={overId === id && dragId !== null && dragId !== id}
                    onToggleDone={(e) => toggleDone(e.task)}
                    onArchive={(e) => archiveOne(e.task)}
                    onEdit={(e) => setEditing(e.task)}
                    onMove={(taskId, dir) => applyOrder(moveId(visibleIds, taskId, dir))}
                    onDragStart={setDragId}
                    onDragOver={setOverId}
                    onDrop={drop}
                    onDragEnd={() => {
                      setDragId(null);
                      setOverId(null);
                    }}
                  />
                );
              })}
            </ol>
          )}

          <div className={styles.dock}>
            <AnimatePresence>
              {undo ? (
                <motion.div key="undo" className={styles.undo} role="status" {...motionProps}>
                  <span>{undo.label}</span>
                  <Button
                    size="compact-sm"
                    variant="subtle"
                    onClick={() => {
                      undo.run();
                      setUndo(null);
                    }}
                  >
                    Deshacer
                  </Button>
                </motion.div>
              ) : null}
            </AnimatePresence>
            <div className={styles.dockRow}>
              <AnimatePresence>
                {overdueCount > 0 ? (
                  <motion.div key="replan" className={styles.replan} {...motionProps}>
                    <Button
                      fullWidth
                      radius="xl"
                      color="orange"
                      leftSection={<IconCalendarRepeat size={16} />}
                      loading={actions.replan.isPending}
                      onClick={replan}
                    >
                      Volver a planificar {overdueCount} {overdueCount === 1 ? "tarea" : "tareas"}
                    </Button>
                  </motion.div>
                ) : null}
              </AnimatePresence>
              <Button
                className={styles.fab}
                radius="xl"
                size="md"
                aria-label="Nueva tarea"
                onClick={() => setCreating(true)}
              >
                <IconPlus size={22} />
              </Button>
            </div>
          </div>
        </>
      )}

      <TaskEditorModal
        opened={creating || editing !== null}
        task={editing}
        pending={actions.create.isPending || actions.patch.isPending}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        onSubmit={submit}
      />
    </div>
  );
}
