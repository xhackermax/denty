export type Cents = number;

const EURO_FORMATTER = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
});

function assertFinite(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new TypeError(`${label} debe ser un número finito`);
  }
}

function roundHalfAwayFromZero(value: number): number {
  return Math.sign(value) * Math.round(Math.abs(value));
}

export function asCents(value: number): Cents {
  assertFinite(value, "El importe");
  if (!Number.isInteger(value)) {
    throw new TypeError("Los céntimos deben ser enteros");
  }
  return value;
}

export function formatEUR(cents: Cents): string {
  return EURO_FORMATTER.format(asCents(cents) / 100);
}

export function parseEUR(input: string): Cents {
  const normalized = input
    .trim()
    .replace(/\s|€/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".");

  if (!/^[+-]?\d+(?:\.\d+)?$/.test(normalized)) {
    throw new TypeError(`Importe EUR no válido: ${input}`);
  }

  const euros = Number(normalized);
  assertFinite(euros, "El importe");
  return asCents(roundHalfAwayFromZero(euros * 100));
}

export function mulQty(unitCents: Cents, quantity: number): Cents {
  asCents(unitCents);
  assertFinite(quantity, "La cantidad");
  return asCents(roundHalfAwayFromZero(unitCents * quantity));
}

export function taxFromBps(baseCents: Cents, taxRateBps: number): Cents {
  asCents(baseCents);
  assertFinite(taxRateBps, "El tipo fiscal");
  if (!Number.isInteger(taxRateBps)) {
    throw new TypeError("El tipo fiscal debe expresarse en puntos básicos enteros");
  }
  return asCents(roundHalfAwayFromZero((baseCents * taxRateBps) / 10_000));
}
