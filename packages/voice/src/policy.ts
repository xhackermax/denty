import type { VoicePlan } from "./actions";
export function voicePolicy(plan:VoicePlan){const risky=plan.actions.some(a=>a.type==="payment.record"||a.type==="appointment.no_show");return{canExecute:plan.ambiguities.length===0,requiresConfirmation:plan.requiresConfirmation||risky,reasons:[...plan.ambiguities,...(risky?["consequential_action"]:[])]}}
export interface LlmVoiceProvider{plan(text:string,context:{locale:string;clinicId:string}):Promise<VoicePlan>}
export interface AsrAdapter{start():Promise<void>;stop():Promise<string>;isAvailable():Promise<boolean>}
