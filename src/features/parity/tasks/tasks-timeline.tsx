"use client";
import {
  SortableContext,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { ClinicalDragContext } from "@/shared/drag/clinical-drag-context";

import { Button, SegmentedControl } from "@mantine/core";
import { IconArchive, IconCalendarRepeat, IconPlus, IconSortDescending } from "@tabler/icons-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";

import { getBrowserApi } from "@/shared/api/browser";
import { dentyQueryKeys } from "@/shared/query";
import { ActionErrorAlert } from "../modules/action-error-alert";
import { ArchivedList } from "./archived-list";
import { DayStrip } from "./day-strip";
import { InboxList } from "./inbox-list";
import { TaskEditorModal, type TaskFormValues } from "./task-editor-modal";
import { TaskNode } from "./task-node";
import {
  buildDayMarkers,
  buildSchedule,
  dayPatchFor,
  describeDay,
  getWeekDays,
  inboxTasks,
  mergeVisibleOrder,
  moveId,
  moveIdToIndex,
  planReplan,
  resolveTaskSchedule,
  sortByPriority,
  undoDayPatch,
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

type View = "agenda" | "inbox" | "archive";

const UNDO_MS = 8000;
const TICK_MS = 60_000;

// The browser client only exists on the client, and Next prerenders this page on the
// server, so it is looked up when an operation runs, never while rendering.
const browserTasksApi: TasksApi = {
  list: () => getBrowserApi().tasks.list(),
  create: (input) => getBrowserApi().tasks.create(input),
  update: (id, input) => getBrowserApi().tasks.update(id, input),
  reorder: (orderedIds) => getBrowserApi().tasks.reorder(orderedIds),
  assignees: () => getBrowserApi().tasks.assignees(),
};

export function TasksTimeline({ api, now: nowFn = () => new Date() }: TasksTimelineProps) {
  const qc = useQueryClient();
  const resolvedApi = api ?? browserTasksApi;
  const actions = useTaskActions(resolvedApi);
  const reduceMotion = useReducedMotion();

  const [now, setNow] = useState(nowFn);
  const today = zonedDayKey(now);
  const [selectedDay, setSelectedDay] = useState(() => zonedDayKey(nowFn()));
  const [view, setView] = useState<View>("agenda");
  const [scope, setScope] = useState<"team" | "mine">("team");
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
  const teamQuery = useQuery({
    queryKey: dentyQueryKeys.tasks.team,
    queryFn: async () => (await resolvedApi.assignees?.()) ?? null,
    retry: false,
  });
  const team = teamQuery.data ?? undefined;
  const staffNames = useMemo(
    () => new Map((team?.items ?? []).map((member) => [member.id, member.name])),
    [team],
  );
  const allTasks = useMemo(() => query.data?.items ?? [], [query.data]);
  const myTasksCount = allTasks.filter((t) => !t.archivedAt && t.assigneeStaffId === team?.currentStaffId && Boolean(team?.currentStaffId)).length;
  const scopedTasks = useMemo(() =>
    scope === "mine" && team?.currentStaffId
      ? allTasks.filter((t) => t.assigneeStaffId === team.currentStaffId)
      : allTasks,
    [allTasks, scope, team?.currentStaffId],
  );
  const archived = useMemo(() => scopedTasks.filter((t) => t.archivedAt), [scopedTasks]);
  const schedule = useMemo(
    () => buildSchedule(scopedTasks, { dayKey: selectedDay, now }),
    [scopedTasks, selectedDay, now],
  );

  const inbox = useMemo(() => inboxTasks(scopedTasks), [scopedTasks]);
  const weekDays = useMemo(() => getWeekDays(selectedDay), [selectedDay]);
  const markers = useMemo(
    () => buildDayMarkers(scopedTasks, weekDays, { now }),
    [scopedTasks, weekDays, now],
  );

  const allIds = useMemo(() => allTasks.map((t) => t.id), [allTasks]);
  const viewTasks = useMemo(
    () => (view === "inbox" ? inbox : schedule.entries.map((e) => e.task)),
    [view, inbox, schedule],
  );
  const visibleIds = useMemo(() => viewTasks.map((t) => t.id), [viewTasks]);
  const overdueCount = schedule.entries.filter((e) => e.overdue).length;
  const doneTasks = viewTasks.filter((t) => t.status === "DONE");

  // El deshacer lee la versión vigente del caché: tras la mutación el refetch ya la subió.
  function currentVersion(task: TimelineTask): number {
    const fresh = qc
      .getQueryData<{ items: TimelineTask[] }>(dentyQueryKeys.tasks.all)
      ?.items.find((t) => t.id === task.id);
    return fresh?.version ?? task.version;
  }

  const orderPending = useRef(false);
  function applyOrder(visibleOrder: string[]) {
    if (orderPending.current || actions.reorder.isPending || actions.replan.isPending) return;
    if (visibleOrder.join() === visibleIds.join()) return;
    orderPending.current = true;
    actions.reorder.mutate(mergeVisibleOrder(allIds, visibleOrder), {
      onSettled: () => {
        orderPending.current = false;
      },
    });
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
    const tasks = doneTasks;
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
    const { scheduledOn, dueAt } = resolveTaskSchedule(values.day, values.time);
    if (editing) {
      actions.patch.mutate(
        {
          id: editing.id,
          version: editing.version,
          patch: {
            title: values.title,
            priority: values.priority,
            durationMin: values.durationMin,
            scheduledOn,
            dueAt,
            ...(values.assigneeStaffId ? { assigneeStaffId: values.assigneeStaffId } : {}),
          },
        },
        { onSuccess: () => setEditing(null) },
      );
      return;
    }
    actions.create.mutate(
      {
        title: values.title,
        ...(values.description ? { description: values.description } : {}),
        priority: values.priority,
        durationMin: values.durationMin,
        ...(scheduledOn ? { scheduledOn } : {}),
        ...(dueAt ? { dueAt } : {}),
        ...(values.assigneeStaffId ? { assigneeStaffId: values.assigneeStaffId } : {}),
      },
      { onSuccess: () => setCreating(false) },
    );
  }

  function moveToDay(task: TimelineTask, day: string | null) {
    const patch = dayPatchFor(task, day);
    const revert = undoDayPatch(task, patch);
    actions.patch.mutate(
      { id: task.id, version: task.version, patch },
      {
        onSuccess: () =>
          setUndo({
            label:
              day === null
                ? `«${task.title}» enviada a la Bandeja`
                : `«${task.title}» movida a ${describeDay(day, today)}`,
            run: () =>
              actions.patch.mutate({
                id: task.id,
                version: currentVersion(task),
                patch: revert,
              }),
          }),
      },
    );
  }

  function dropOnDay(day: string) {
    const task = scopedTasks.find((t) => t.id === dragId);
    setDragId(null);
    setOverId(null);
    if (task) moveToDay(task, day);
  }

  function drop(targetId: string) {
    if (dragId && dragId !== targetId && view !== "archive") {
      applyOrder(moveIdToIndex(visibleIds, dragId, visibleIds.indexOf(targetId)));
    }
    setDragId(null);
    setOverId(null);
  }

  function replan() {
    if (orderPending.current || actions.reorder.isPending || actions.replan.isPending) return;
    orderPending.current = true;
    const plan = planReplan(schedule);
    actions.replan.mutate(
      {
        plan,
        allIds: mergeVisibleOrder(allIds, plan.orderedIds),
        tasks: scopedTasks,
      },
      {
        onSettled: () => {
          orderPending.current = false;
        },
      },
    );
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
    <ClinicalDragContext
      keyboardCoordinates={sortableKeyboardCoordinates}
      onDragStart={(event) => setDragId(String(event.active.id))}
      onDragOver={(event) => setOverId(event.over ? String(event.over.id) : null)}
      onDragCancel={() => {
        setDragId(null);
        setOverId(null);
      }}
      onDragEnd={(event) => {
        const id = String(event.active.id),
          target = event.over ? String(event.over.id) : null;
        setDragId(null);
        setOverId(null);
        if (view !== "archive" && target && visibleIds.includes(id) && visibleIds.includes(target))
          applyOrder(moveIdToIndex(visibleIds, id, visibleIds.indexOf(target)));
      }}
    >
      <SortableContext
        items={visibleIds}
        strategy={view === "inbox" ? horizontalListSortingStrategy : verticalListSortingStrategy}
      >
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
            {team?.currentStaffId ? (
              <SegmentedControl
                size="xs"
                aria-label="Responsable de tareas"
                value={scope}
                onChange={(value) => setScope(value as "team" | "mine")}
                data={[
                  { value: "team", label: "Equipo" },
                  { value: "mine", label: `Mis tareas (${myTasksCount})` },
                ]}
              />
            ) : null}
            <SegmentedControl
              size="xs"
              value={view}
              onChange={(value) => setView(value as View)}
              data={[
                { value: "agenda", label: "Agenda" },
                { value: "inbox", label: `Bandeja${inbox.length ? ` (${inbox.length})` : ""}` },
                {
                  value: "archive",
                  label: `Archivo${archived.length ? ` (${archived.length})` : ""}`,
                },
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
              <DayStrip
                selectedDay={selectedDay}
                today={today}
                onSelect={setSelectedDay}
                markers={markers}
                dragActive={dragId !== null}
                onDropTask={dropOnDay}
              />
              <div className={styles.toolbar}>
                <Button
                  size="xs"
                  variant="light"
                  leftSection={<IconSortDescending size={14} />}
                  disabled={viewTasks.length < 2}
                  onClick={() => applyOrder(sortByPriority(viewTasks).map((t) => t.id))}
                >
                  Ordenar por prioridad
                </Button>
                <Button
                  size="xs"
                  variant="light"
                  color="gray"
                  leftSection={<IconArchive size={14} />}
                  disabled={doneTasks.length === 0}
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
              ) : view === "inbox" ? (
                <InboxList
                  tasks={inbox}
                  today={today}
                  selectedDay={selectedDay}
                  onSchedule={moveToDay}
                  onToggleDone={toggleDone}
                  onArchive={archiveOne}
                  onEdit={setEditing}
                  onMove={(taskId, dir) => applyOrder(moveId(visibleIds, taskId, dir))}
                  ordering={actions.reorder.isPending || actions.replan.isPending}
                  onDrop={drop}
                  onDragStart={setDragId}
                  onDragEnd={() => {
                    setDragId(null);
                    setOverId(null);
                  }}
                />
              ) : schedule.rows.length === 0 ? (
                <p className={styles.state}>
                  Nada programado este día. Crea una tarea o trae alguna de la Bandeja.
                </p>
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
                        assigneeName={staffNames.get(row.entry.task.assigneeStaffId ?? "")}
                        today={today}
                        isFirst={index === 0}
                        isLast={index === visibleIds.length - 1}
                        ordering={actions.reorder.isPending || actions.replan.isPending}
                        dragging={dragId === id}
                        dropTarget={overId === id && dragId !== null && dragId !== id}
                        onToggleDone={(e) => toggleDone(e.task)}
                        onArchive={(e) => archiveOne(e.task)}
                        onEdit={(e) => setEditing(e.task)}
                        onMove={(taskId, dir) => applyOrder(moveId(visibleIds, taskId, dir))}
                        onMoveToDay={(e, day) => moveToDay(e.task, day)}
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
                    {view === "agenda" && overdueCount > 0 ? (
                      <motion.div key="replan" className={styles.replan} {...motionProps}>
                        <Button
                          fullWidth
                          radius="xl"
                          color="orange"
                          leftSection={<IconCalendarRepeat size={16} />}
                          loading={actions.replan.isPending}
                          disabled={actions.reorder.isPending}
                          onClick={replan}
                        >
                          Volver a planificar {overdueCount}{" "}
                          {overdueCount === 1 ? "tarea" : "tareas"}
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
            today={today}
            initialDay={view === "inbox" ? null : selectedDay}
            pending={actions.create.isPending || actions.patch.isPending}
            team={team}
            onClose={() => {
              setCreating(false);
              setEditing(null);
            }}
            onSubmit={submit}
          />
        </div>
      </SortableContext>
    </ClinicalDragContext>
  );
}
