export * from "./actions";
export * from "./planner";
export * from "./resolver";
export * from "./policy";
import { planVoiceCommand } from "./planner";
export type VoiceIntent="patient.search"|"appointment.create"|"odontogram.update"|"payment.record"|"lab.receive"|"navigation.open";
export interface VoiceCommand{intent:VoiceIntent;confidence:number;slots:Record<string,string|number|boolean>;requiresConfirmation:boolean}
export function parseLocalCommand(input:string):VoiceCommand{const plan=planVoiceCommand(input);if(plan.actions.some(x=>x.type==="appointment.schedule"||x.type==="appointment.arrive"))return{intent:"appointment.create",confidence:.86,slots:{raw:input},requiresConfirmation:plan.requiresConfirmation};if(plan.actions.some(x=>x.type==="clinical.add_item"))return{intent:"odontogram.update",confidence:.84,slots:{raw:input},requiresConfirmation:plan.requiresConfirmation};if(plan.actions.some(x=>x.type==="payment.record"))return{intent:"payment.record",confidence:.82,slots:{raw:input},requiresConfirmation:true};if(plan.actions.some(x=>x.type==="lab.transition"))return{intent:"lab.receive",confidence:.8,slots:{raw:input},requiresConfirmation:plan.requiresConfirmation};return{intent:"patient.search",confidence:.6,slots:{raw:input},requiresConfirmation:false}}
