"use client";

import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Group,
  Popover,
  SegmentedControl,
  SimpleGrid,
  Text,
  TextInput,
  UnstyledButton,
} from "@mantine/core";
import {
  IconCalendarMonth,
  IconChevronLeft,
  IconChevronRight,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { buildMonthGrid, monthOf, shiftMonth } from "@/domain/agenda";
import {
  addDaysMadrid,
  dateYMDMadrid,
  madridLocalDateTime,
  startOfReportingPeriodMadrid,
  todayMadrid,
  toMadridISO,
  type ReportingPeriod,
} from "@/domain/dates";
import { formatEUR } from "@/domain/money";
import { getBrowserApi } from "@/shared/api/browser";
import { AnimatedProgress, MotionScrollReveal, SpeedingMetric } from "@/shared/motion";
import { dentyQueryKeys } from "@/shared/query";
import { useActiveTenant } from "@/shared/tenancy/active-context";
import styles from "@/shared/ui/parity.module.css";

type AnalysisPeriod = ReportingPeriod | "custom";

const MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
] as const;
const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"] as const;

function presetRange(period: ReportingPeriod, anchor: string) {
  const start = startOfReportingPeriodMadrid(period, madridLocalDateTime(anchor, "12:00"));
  const startDate = dateYMDMadrid(start);
  const startMonth = monthOf(startDate);
  const periodEndExclusive =
    period === "month"
      ? `${shiftMonth(startMonth, 1)}-01`
      : period === "quarter"
        ? `${shiftMonth(startMonth, 3)}-01`
        : `${Number(startDate.slice(0, 4)) + 1}-01-01`;
  const fullEndDate = dateYMDMadrid(
    addDaysMadrid(madridLocalDateTime(periodEndExclusive, "12:00"), -1),
  );
  const endDate = fullEndDate > todayMadrid() ? todayMadrid() : fullEndDate;
  const endExclusive = dateYMDMadrid(
    addDaysMadrid(madridLocalDateTime(endDate, "12:00"), 1),
  );
  return {
    start: toMadridISO(madridLocalDateTime(startDate, "00:00")),
    end: toMadridISO(madridLocalDateTime(endExclusive, "00:00")),
    startDate,
    endDate,
  };
}

function customRange(startDate: string, endDate: string) {
  const normalizedEnd = endDate < startDate ? startDate : endDate;
  const exclusiveEnd = dateYMDMadrid(
    addDaysMadrid(madridLocalDateTime(normalizedEnd, "12:00"), 1),
  );
  return {
    start: toMadridISO(madridLocalDateTime(startDate, "00:00")),
    end: toMadridISO(madridLocalDateTime(exclusiveEnd, "00:00")),
    startDate,
    endDate: normalizedEnd,
  };
}

function periodLabel(period: ReportingPeriod, startDate: string): string {
  const year = Number(startDate.slice(0, 4));
  const month = Number(startDate.slice(5, 7));
  if (period === "year") return String(year);
  if (period === "quarter") return `T${Math.floor((month - 1) / 3) + 1} ${year}`;
  return `${MONTHS[month - 1] ?? "Mes"} ${year}`;
}

function historyLabel(granularity: ReportingPeriod, startDate: string): string {
  return periodLabel(granularity, startDate);
}

function shortDate(date: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Europe/Madrid",
  }).format(madridLocalDateTime(date, "12:00"));
}

function shiftAnchor(period: ReportingPeriod, anchor: string, delta: number): string {
  const range = presetRange(period, anchor);
  if (period === "month") return `${shiftMonth(monthOf(range.startDate), delta)}-01`;
  if (period === "quarter")
    return `${shiftMonth(monthOf(range.startDate), delta * 3)}-01`;
  return `${Number(range.startDate.slice(0, 4)) + delta}-01-01`;
}

function AnalysisRangeCalendar({
  start,
  end,
  onChange,
}: {
  start: string;
  end: string;
  onChange: (start: string, end: string) => void;
}) {
  const today = todayMadrid();
  const [month, setMonth] = useState(monthOf(end || start));
  const [picking, setPicking] = useState<"start" | "end">("start");
  const [year = 0, monthIndex = 1] = month.split("-").map(Number);
  const days = buildMonthGrid(month, today, { minWeeks: 6 }).flat();

  const choose = (date: string) => {
    if (date > today) return;
    if (picking === "start") {
      onChange(date, end < date ? date : end);
      setPicking("end");
      return;
    }
    if (date < start) onChange(date, start);
    else onChange(start, date);
    setPicking("start");
  };

  return (
    <div className={styles.analysisCalendar}>
      <Group justify="space-between" gap="xs">
        <ActionIcon
          variant="subtle"
          size="sm"
          aria-label="Mes anterior"
          onClick={() => setMonth(shiftMonth(month, -1))}
        >
          <IconChevronLeft size={14} />
        </ActionIcon>
        <Text size="sm" fw={750}>
          {MONTHS[monthIndex - 1] ?? "Mes"} {year}
        </Text>
        <ActionIcon
          variant="subtle"
          size="sm"
          aria-label="Mes siguiente"
          disabled={shiftMonth(month, 1) > monthOf(today)}
          onClick={() => setMonth(shiftMonth(month, 1))}
        >
          <IconChevronRight size={14} />
        </ActionIcon>
      </Group>

      <div className={styles.analysisCalendarGrid} role="grid" aria-label="Seleccionar rango">
        {WEEKDAYS.map((day) => (
          <span key={day} className={styles.analysisCalendarWeekday}>
            {day}
          </span>
        ))}
        {days.map(({ date, inMonth, isToday }) => {
          const inRange = date >= start && date <= end;
          return (
            <UnstyledButton
              key={date}
              className={styles.analysisCalendarDay}
              data-outside={!inMonth}
              data-today={isToday}
              data-range={inRange}
              data-edge={date === start || date === end}
              disabled={date > today}
              aria-label={date}
              onClick={() => choose(date)}
            >
              {Number(date.slice(8))}
            </UnstyledButton>
          );
        })}
      </div>

      <Group grow align="end" mt="sm">
        <TextInput
          type="date"
          label="Desde"
          max={today}
          value={start}
          onChange={(event) => {
            const value = event.currentTarget.value;
            if (value) onChange(value, end < value ? value : end);
          }}
        />
        <TextInput
          type="date"
          label="Hasta"
          min={start}
          max={today}
          value={end}
          onChange={(event) => {
            const value = event.currentTarget.value;
            if (value) onChange(start, value < start ? start : value);
          }}
        />
      </Group>
      <Text size="xs" c="dimmed" mt={8}>
        {picking === "start"
          ? "Toca el primer día del rango."
          : "Ahora toca el último día del rango."}
      </Text>
    </div>
  );
}

export function AnalysisModule() {
  const today = todayMadrid();
  const [period, setPeriod] = useState<AnalysisPeriod>("month");
  const [anchor, setAnchor] = useState(today);
  const [customStart, setCustomStart] = useState(today);
  const [customEnd, setCustomEnd] = useState(today);
  const [historyGranularity, setHistoryGranularity] = useState<ReportingPeriod>("month");
  const { activeSiteId } = useActiveTenant();

  const range = useMemo(
    () =>
      period === "custom"
        ? customRange(customStart, customEnd)
        : presetRange(period, anchor),
    [anchor, customEnd, customStart, period],
  );

  const query = useMemo(
    () => ({
      start: range.start,
      end: range.end,
      ...(activeSiteId ? { siteId: activeSiteId } : {}),
    }),
    [activeSiteId, range.end, range.start],
  );
  const rangeKey = `${range.startDate}-${range.endDate}`;

  const summary = useQuery({
    queryKey: dentyQueryKeys.analytics.summary(query),
    queryFn: () => getBrowserApi().analytics.summary(query),
  });
  const treatments = useQuery({
    queryKey: dentyQueryKeys.analytics.treatments(query),
    queryFn: () => getBrowserApi().analytics.treatments(query),
  });
  const waitTimes = useQuery({
    queryKey: dentyQueryKeys.analytics.waitTimes(query),
    queryFn: () =>
      getBrowserApi().agenda.waitTimeMetrics({
        from: query.start,
        to: query.end,
        ...(activeSiteId ? { siteId: activeSiteId } : {}),
      }),
  });

  const historyScope = useMemo(
    () => ({
      granularity: historyGranularity,
      limit: 120,
      ...(activeSiteId ? { siteId: activeSiteId } : {}),
    }),
    [activeSiteId, historyGranularity],
  );
  const history = useQuery({
    queryKey: dentyQueryKeys.analytics.periods(historyScope),
    queryFn: () => getBrowserApi().analytics.periods(historyScope),
  });

  const preset = period === "custom" ? null : period;
  const nextAnchor = preset ? shiftAnchor(preset, anchor, 1) : null;
  const canGoNext = Boolean(nextAnchor && nextAnchor <= today);

  const setCustomRange = (start: string, end: string) => {
    setCustomStart(start);
    setCustomEnd(end);
    setPeriod("custom");
  };

  return (
    <div className={styles.grid}>
      <section className={`${styles.section} ${styles.bluePerimeterRunner}`}>
        <div className={styles.analysisPeriodBar}>
          <div>
            <Text fw={800}>Periodo de análisis</Text>
            <Text size="sm" c="dimmed">
              {shortDate(range.startDate)} → {shortDate(range.endDate)}
            </Text>
          </div>
          <Badge variant="light">Servidor</Badge>
        </div>

        <div className={styles.analysisPeriodControls}>
          <SegmentedControl
            value={period}
            onChange={(value) => {
              const next = value as AnalysisPeriod;
              setPeriod(next);
              if (next !== "custom") setAnchor(today);
            }}
            data={[
              { label: "Mes", value: "month" },
              { label: "Trimestre", value: "quarter" },
              { label: "Año", value: "year" },
              { label: "Personalizado", value: "custom" },
            ]}
          />

          <Group gap="xs" wrap="nowrap" className={styles.analysisPeriodNavigation}>
            {preset ? (
              <>
                <ActionIcon
                  variant="light"
                  aria-label="Periodo anterior"
                  onClick={() => setAnchor(shiftAnchor(preset, anchor, -1))}
                >
                  <IconChevronLeft size={16} />
                </ActionIcon>
                <Button variant="subtle" className={styles.analysisPeriodLabel}>
                  {periodLabel(preset, range.startDate)}
                </Button>
                <ActionIcon
                  variant="light"
                  aria-label="Periodo siguiente"
                  disabled={!canGoNext}
                  onClick={() => setAnchor(shiftAnchor(preset, anchor, 1))}
                >
                  <IconChevronRight size={16} />
                </ActionIcon>
              </>
            ) : null}

            <Popover position="bottom-end" shadow="md" width={330} withinPortal>
              <Popover.Target>
                <Button
                  variant={period === "custom" ? "filled" : "light"}
                  leftSection={<IconCalendarMonth size={16} />}
                >
                  Desde / hasta
                </Button>
              </Popover.Target>
              <Popover.Dropdown>
                <AnalysisRangeCalendar
                  start={range.startDate}
                  end={range.endDate}
                  onChange={setCustomRange}
                />
              </Popover.Dropdown>
            </Popover>
          </Group>
        </div>
      </section>

      {(summary.isError || treatments.isError || waitTimes.isError) && (
        <Alert color="red">No se pudo cargar la analítica real.</Alert>
      )}

      <MotionScrollReveal intensity="normal">
        <>
          <SimpleGrid cols={{ base: 2, md: 4 }}>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>Producción</span>
              <strong className={styles.metricValue}>
                <SpeedingMetric
                  key={`${rangeKey}-Producción`}
                  value={(summary.data?.producedCents ?? 0) / 100}
                  kind="currency"
                  aria-label="Producción"
                />
              </strong>
            </div>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>Facturado</span>
              <strong className={styles.metricValue}>
                {formatEUR(summary.data?.invoicedCents ?? 0)}
              </strong>
            </div>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>Cobrado</span>
              <strong className={styles.metricValue}>
                {formatEUR(summary.data?.collectedCents ?? 0)}
              </strong>
            </div>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>Pendiente</span>
              <strong className={styles.metricValue}>
                {formatEUR(summary.data?.pendingCents ?? 0)}
              </strong>
            </div>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>Margen</span>
              <strong className={styles.metricValue}>
                <SpeedingMetric
                  key={`${rangeKey}-Margen`}
                  value={(summary.data?.marginCents ?? 0) / 100}
                  kind="currency"
                  aria-label="Margen"
                />
              </strong>
            </div>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>Ticket medio</span>
              <strong className={styles.metricValue}>
                {formatEUR(summary.data?.averageTicketCents ?? 0)}
              </strong>
            </div>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>Conversión</span>
              <strong className={styles.metricValue}>
                <SpeedingMetric
                  key={`${rangeKey}-Conversión`}
                  value={summary.data?.conversionPercent ?? 0}
                  kind="percent"
                  decimals={1}
                  aria-label="Conversión"
                />
              </strong>
              <AnimatedProgress
                key={`${rangeKey}-Conversión-bar`}
                value={Math.min(100, summary.data?.conversionPercent ?? 0)}
                size="sm"
                mt="xs"
                aria-label="Conversión"
              />
            </div>
            <div className={styles.metric}>
              <span className={styles.metricLabel}>No presentados</span>
              <strong className={styles.metricValue}>
                <SpeedingMetric
                  key={`${rangeKey}-No-presentados`}
                  value={summary.data?.noShowPercent ?? 0}
                  kind="percent"
                  decimals={1}
                  aria-label="No presentados"
                />
              </strong>
              <AnimatedProgress
                key={`${rangeKey}-No-presentados-bar`}
                value={Math.min(100, summary.data?.noShowPercent ?? 0)}
                size="sm"
                mt="xs"
                aria-label="No presentados"
              />
            </div>
          </SimpleGrid>
        </>
      </MotionScrollReveal>

      <SimpleGrid cols={{ base: 2, md: 4 }}>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Espera media</span>
          <strong className={styles.metricValue}>
            {(waitTimes.data?.avgWaitMinutes ?? 0).toFixed(1)} min
          </strong>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Tiempo en sillón</span>
          <strong className={styles.metricValue}>
            {(waitTimes.data?.avgChairMinutes ?? 0).toFixed(1)} min
          </strong>
        </div>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Puntualidad</span>
          <strong className={styles.metricValue}>
            {(waitTimes.data?.onTimeRate ?? 0).toFixed(1)}%
          </strong>
          <AnimatedProgress
            key={`${rangeKey}-puntualidad-bar`}
            value={Math.min(100, waitTimes.data?.onTimeRate ?? 0)}
            size="sm"
            mt="xs"
            aria-label="Puntualidad"
          />
        </div>
        <div className={styles.metric}>
          <span className={styles.metricLabel}>Retraso llegada</span>
          <strong className={styles.metricValue}>
            {(waitTimes.data?.avgArrivalDelayMinutes ?? 0).toFixed(1)} min
          </strong>
        </div>
      </SimpleGrid>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Histórico</h2>
            <p className={styles.sectionDescription}>
              Registro agregado desde el primer dato disponible, respetando la sede activa.
            </p>
          </div>
          <SegmentedControl
            size="xs"
            value={historyGranularity}
            onChange={(value) => setHistoryGranularity(value as ReportingPeriod)}
            data={[
              { label: "Meses", value: "month" },
              { label: "Trimestres", value: "quarter" },
              { label: "Años", value: "year" },
            ]}
          />
        </div>

        {history.isError ? (
          <Alert color="red" mb="sm">
            No se pudo cargar el histórico.
          </Alert>
        ) : null}

        <div className={styles.rowList}>
          {(history.data?.items ?? []).map((item) => (
            <div
              className={styles.row}
              key={`${historyGranularity}-${item.periodStart ?? "unknown"}`}
            >
              <div className={styles.rowMain}>
                <span className={styles.rowTitle}>
                  {item.periodStart
                    ? historyLabel(historyGranularity, item.periodStart)
                    : "Periodo"}
                </span>
                <span className={styles.rowMeta}>
                  Producción {formatEUR(item.producedCents ?? 0)} · Facturado{" "}
                  {formatEUR(item.invoicedCents ?? 0)} · Cobrado{" "}
                  {formatEUR(item.collectedCents ?? 0)}
                </span>
              </div>
              <div className={styles.rowActions}>
                <Badge
                  variant="light"
                  color={(item.marginCents ?? 0) < 0 ? "red" : "green"}
                >
                  Margen {formatEUR(item.marginCents ?? 0)}
                </Badge>
              </div>
            </div>
          ))}
          {!history.isLoading && (history.data?.items.length ?? 0) === 0 ? (
            <Text c="dimmed">Aún no hay datos históricos para mostrar.</Text>
          ) : null}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Tratamientos</h2>
            <p className={styles.sectionDescription}>
              Filtrados por el rango seleccionado y la sede activa.
            </p>
          </div>
        </div>
        <div className={styles.rowList}>
          {(treatments.data?.items ?? []).map((item, index) => (
            <div className={styles.row} key={item.id ?? item.treatmentCode ?? String(index)}>
              <div className={styles.rowMain}>
                <span className={styles.rowTitle}>
                  {item.label ?? item.treatment ?? item.name ?? item.treatmentCode ?? "Tratamiento"}
                </span>
                <span className={styles.rowMeta}>
                  {item.count ?? 0} casos · {formatEUR(item.producedCents ?? 0)}
                </span>
              </div>
              <div className={styles.rowMeter}>
                <Text fw={700} ta="right">
                  {(item.conversionPercent ?? 0).toFixed(1)}%
                </Text>
                <AnimatedProgress
                  key={`${rangeKey}-${item.treatmentCode ?? index}`}
                  value={Math.min(100, item.conversionPercent ?? 0)}
                  size="xs"
                  aria-label="Conversión del tratamiento"
                />
              </div>
            </div>
          ))}
          {!treatments.isLoading && (treatments.data?.items.length ?? 0) === 0 ? (
            <Text c="dimmed">Sin datos para el periodo.</Text>
          ) : null}
        </div>
      </section>
    </div>
  );
}
