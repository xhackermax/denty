export type TradeoffSpecialtyId =
  | "conservadora"
  | "endodoncia"
  | "periodoncia"
  | "protesis"
  | "implantologia"
  | "cirugia"
  | "ortodoncia"
  | "oclusion"
  | "estetica"
  | "odontopediatria"
  | "prevencion"
  | "traumatologia";

export interface TradeoffSpecialty {
  id: TradeoffSpecialtyId;
  name: string;
  /** Clinical cautions for the whole specialty, shown to the dentist, never to the patient. */
  notes: readonly string[];
}

export type TradeoffKind = "advantage" | "disadvantage";

/** One selectable phrase. The id outlives wording fixes so saved selections stay traceable. */
export interface TreatmentArgument {
  id: string;
  kind: TradeoffKind;
  text: string;
}

export interface TradeoffEntry {
  id: string;
  /** "matrix": short phrases per procedure; "bank": full sentences per compared alternative. */
  source: "matrix" | "bank";
  specialty: TradeoffSpecialtyId;
  name: string;
  advantages: readonly TreatmentArgument[];
  disadvantages: readonly TreatmentArgument[];
}
