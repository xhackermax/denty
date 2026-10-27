"use client";

import {
  Alert,
  Button,
  Checkbox,
  Group,
  Modal,
  NumberInput,
  Select,
  Stack,
  Switch,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import { useState } from "react";

import { dateYMDMadrid, madridLocalDateTime } from "@/domain/dates";
import {
  REFERRAL_QUALIFICATION_LABELS,
  REFERRAL_QUALIFICATIONS,
  REWARD_KIND_LABELS,
  REWARD_KINDS,
  type ReferralQualification,
  type RewardKind,
} from "@/domain/referrals";
import {
  referralProgramInputSchema,
  type ReferralProgram,
  type ReferralProgramInput,
  type RewardTermsInput,
} from "@/shared/api";
import { MoneyInput } from "@/shared/ui";

import { useReferralSitesQuery, useSaveReferralProgramMutation } from "./referrals-data";

interface ReferralProgramFormProps {
  program: ReferralProgram | null;
  onClose: () => void;
}

type Reward = Required<Pick<RewardTermsInput, "kind">> & {
  valueCents: number | null;
  percentBps: number | null;
  description: string;
};

const emptyReward = (): Reward => ({
  kind: "NONE",
  valueCents: null,
  percentBps: null,
  description: "",
});

function fromProgram(reward: ReferralProgram["referrerReward"]): Reward {
  return { ...reward, description: reward.description ?? "" };
}

const toDate = (value: string | null) => (value ? dateYMDMadrid(value) : "");
const fromDate = (value: string, time: string) =>
  value ? madridLocalDateTime(value, time).toISOString() : null;

/**
 * Create or edit a referral program. Nothing comes pre-filled: amounts are a
 * commercial decision, and editing never changes rewards already generated.
 */
export function ReferralProgramForm({ program, onClose }: ReferralProgramFormProps) {
  const [name, setName] = useState(program?.name ?? "");
  const [siteId, setSiteId] = useState<string | null>(program?.siteId ?? null);
  const [qualification, setQualification] = useState<ReferralQualification>(
    program?.qualification ?? "APROBACION_MANUAL",
  );
  const [referrer, setReferrer] = useState<Reward>(
    program ? fromProgram(program.referrerReward) : emptyReward(),
  );
  const [referred, setReferred] = useState<Reward>(
    program ? fromProgram(program.referredReward) : emptyReward(),
  );
  const [maxReferrals, setMaxReferrals] = useState<number | null>(
    program?.maxReferralsPerReferrer ?? null,
  );
  const [validityDays, setValidityDays] = useState<number | null>(program?.validityDays ?? null);
  const [startsOn, setStartsOn] = useState(toDate(program?.startsAt ?? null));
  const [endsOn, setEndsOn] = useState(toDate(program?.endsAt ?? null));
  const [terms, setTerms] = useState(program?.terms ?? "");
  const [active, setActive] = useState(program?.active ?? false);
  const [reviewed, setReviewed] = useState(program?.active ?? false);
  const [submitted, setSubmitted] = useState(false);
  const save = useSaveReferralProgramMutation();
  const sites = useReferralSitesQuery();

  const input: ReferralProgramInput = {
    name,
    siteId,
    qualification,
    referrerReward: { ...referrer, description: referrer.description || null },
    referredReward: { ...referred, description: referred.description || null },
    maxReferralsPerReferrer: maxReferrals,
    validityDays,
    startsAt: fromDate(startsOn, "00:00"),
    endsAt: fromDate(endsOn, "23:59"),
    terms,
    active,
  };
  const parsed = referralProgramInputSchema.safeParse(input);
  const issues: Record<string, string> = {};
  if (submitted && !parsed.success) {
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "");
      issues[key] ??= issue.message;
    }
  }
  const needsReview = active && !reviewed;

  const submit = () => {
    setSubmitted(true);
    if (!parsed.success || needsReview || save.isPending) return;
    save.mutate(
      program
        ? { programId: program.id, program: input, expectedVersion: program.version }
        : { programId: null, program: input },
      { onSuccess: onClose },
    );
  };

  return (
    <Modal
      opened
      onClose={onClose}
      title={program ? "Editar programa de referidos" : "Nuevo programa de referidos"}
      size="lg"
    >
      <Stack gap="sm">
        {program && program.referralCount > 0 ? (
          <Alert color="blue">
            Los cambios solo se aplican a beneficios futuros. Los ya generados conservan sus
            condiciones.
          </Alert>
        ) : null}
        <TextInput
          label="Nombre del programa"
          required
          maxLength={100}
          value={name}
          error={issues.name}
          onChange={(event) => setName(event.currentTarget.value)}
        />
        <Group grow align="flex-start">
          <Select
            label="Sede"
            placeholder="Todas"
            clearable
            data={(sites.data ?? []).map((site) => ({ value: site.id, label: site.name }))}
            value={siteId}
            onChange={setSiteId}
          />
          <Select
            label="Cuándo se gana el beneficio"
            allowDeselect={false}
            data={REFERRAL_QUALIFICATIONS.map((value) => ({
              value,
              label: REFERRAL_QUALIFICATION_LABELS[value],
            }))}
            value={qualification}
            onChange={(value) => value && setQualification(value as ReferralQualification)}
          />
        </Group>
        <RewardFields
          title="Beneficio de quien recomienda"
          reward={referrer}
          onChange={setReferrer}
          error={issues.referrerReward}
        />
        <RewardFields
          title="Beneficio del paciente nuevo"
          reward={referred}
          onChange={setReferred}
          error={issues.referredReward}
        />
        <Group grow align="flex-start">
          <NumberInput
            label="Límite de referidos con beneficio"
            description="Vacío: sin límite."
            min={1}
            value={maxReferrals ?? ""}
            onChange={(value) => setMaxReferrals(typeof value === "number" ? value : null)}
          />
          <NumberInput
            label="Validez del beneficio (días)"
            description="Vacío: no caduca."
            min={1}
            max={3650}
            value={validityDays ?? ""}
            onChange={(value) => setValidityDays(typeof value === "number" ? value : null)}
          />
        </Group>
        <Group grow align="flex-start">
          <TextInput
            type="date"
            label="Inicio"
            value={startsOn}
            onChange={(event) => setStartsOn(event.currentTarget.value)}
          />
          <TextInput
            type="date"
            label="Fin"
            value={endsOn}
            error={issues.endsAt}
            onChange={(event) => setEndsOn(event.currentTarget.value)}
          />
        </Group>
        <Textarea
          label="Condiciones y exclusiones"
          required
          autosize
          minRows={3}
          maxLength={5000}
          value={terms}
          error={issues.terms}
          onChange={(event) => setTerms(event.currentTarget.value)}
        />
        <Switch
          label="Programa activo"
          description="Mientras esté inactivo no se genera ningún beneficio."
          checked={active}
          onChange={(event) => setActive(event.currentTarget.checked)}
        />
        {active ? (
          <Alert color="yellow" title="Antes de activar">
            <Text size="sm">
              Revisa la normativa comercial, sanitaria, fiscal y de protección de datos que aplica a
              este programa. Los beneficios nunca descuentan facturas emitidas de forma automática.
            </Text>
            <Checkbox
              mt="xs"
              label="He revisado las condiciones con la clínica"
              checked={reviewed}
              error={submitted && needsReview ? "Confírmalo para activar el programa." : undefined}
              onChange={(event) => setReviewed(event.currentTarget.checked)}
            />
          </Alert>
        ) : null}
        {save.error ? (
          <Alert color="red">
            {save.error instanceof Error ? save.error.message : "No se pudo guardar."}
          </Alert>
        ) : null}
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={submit} loading={save.isPending}>
            {program ? "Guardar cambios" : "Crear programa"}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

function RewardFields({
  title,
  reward,
  onChange,
  error,
}: {
  title: string;
  reward: Reward;
  onChange: (reward: Reward) => void;
  error?: string | undefined;
}) {
  return (
    <Group grow align="flex-start">
      <Select
        label={title}
        allowDeselect={false}
        data={REWARD_KINDS.map((value) => ({ value, label: REWARD_KIND_LABELS[value] }))}
        value={reward.kind}
        onChange={(value) => value && onChange({ ...emptyReward(), kind: value as RewardKind })}
        error={error}
      />
      {reward.kind === "CREDIT" ? (
        <MoneyInput
          label="Importe"
          minCents={1}
          value={reward.valueCents}
          onChange={(valueCents) => onChange({ ...reward, valueCents })}
        />
      ) : reward.kind === "DISCOUNT_PERCENT" ? (
        <NumberInput
          label="Porcentaje"
          suffix=" %"
          min={0.01}
          max={100}
          decimalScale={2}
          decimalSeparator=","
          value={reward.percentBps === null ? "" : reward.percentBps / 100}
          onChange={(value) =>
            onChange({
              ...reward,
              percentBps: typeof value === "number" ? Math.round(value * 100) : null,
            })
          }
        />
      ) : reward.kind === "SERVICE" || reward.kind === "OTHER" ? (
        <TextInput
          label="Detalle"
          maxLength={200}
          value={reward.description}
          onChange={(event) => onChange({ ...reward, description: event.currentTarget.value })}
        />
      ) : (
        <div />
      )}
    </Group>
  );
}
