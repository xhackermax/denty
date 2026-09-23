const DATE = new Intl.DateTimeFormat("es-ES", {
  timeZone: "Europe/Madrid",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const TIME = new Intl.DateTimeFormat("es-ES", {
  timeZone: "Europe/Madrid",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

interface TemporalTextProps {
  value: string | Date;
}

function isoValue(value: string | Date): string {
  return typeof value === "string" ? value : value.toISOString();
}

export function DateText({ value }: TemporalTextProps) {
  return <time dateTime={isoValue(value)}>{DATE.format(new Date(value))}</time>;
}

export function TimeText({ value }: TemporalTextProps) {
  return <time dateTime={isoValue(value)}>{TIME.format(new Date(value))}</time>;
}
