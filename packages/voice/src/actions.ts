export type VoiceAction =
  | {type:"patient.resolve";query:string}
  | {type:"appointment.arrive";patientRef:string}
  | {type:"appointment.no_show";patientRef:string}
  | {type:"clinical.add_item";patientRef:string;tooth?:string;treatmentCode:string;label:string}
  | {type:"clinical.add_dependency";patientRef:string;beforeCode:string;afterCode:string;tooth?:string}
  | {type:"appointment.schedule";patientRef:string;treatmentCode?:string;dateText:string;timeText?:string}
  | {type:"budget.sync";patientRef:string}
  | {type:"payment.record";patientRef:string;amountCents?:number;method?:string}
  | {type:"lab.transition";patientRef?:string;workRef?:string;status:string}
  | {type:"navigation.open";destination:string};
export interface VoicePlan{raw:string;actions:VoiceAction[];requiresConfirmation:boolean;ambiguities:string[];readback:string}
export interface ResolvedVoicePlan extends VoicePlan{patientId?:string;resolvedDate?:string;resolvedTime?:string}
