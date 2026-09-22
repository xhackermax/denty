"use client";

import { NumberInput } from "@mantine/core";

import { formatEUR } from "@/domain/money";

export function MoneyText({ cents }: { cents: number }) {
  return <>{formatEUR(cents)}</>;
}

interface MoneyInputProps {
  label?: string;
  value: number | null;
  minCents?: number;
  maxCents?: number;
  onChange: (cents: number | null) => void;
  disabled?: boolean;
}

export function MoneyInput(props: MoneyInputProps) {
  const { label, value, minCents, maxCents, onChange, disabled } = props;

  return (
    <NumberInput
      {...(label === undefined ? {} : { label })}
      value={value === null ? "" : value / 100}
      onChange={(next) => onChange(typeof next === "number" ? Math.round(next * 100) : null)}
      decimalScale={2}
      fixedDecimalScale
      decimalSeparator=","
      thousandSeparator="."
      suffix=" €"
      {...(minCents === undefined ? {} : { min: minCents / 100 })}
      {...(maxCents === undefined ? {} : { max: maxCents / 100 })}
      disabled={disabled ?? false}
    />
  );
}
