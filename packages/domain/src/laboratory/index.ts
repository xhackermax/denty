export type LabStatus="PLANNED"|"IMPRESSION_TAKEN"|"SCANNED"|"SENT"|"IN_PRODUCTION"|"TRIAL"|"RECEIVED"|"PLACED"|"INCIDENT"|"CANCELLED";
const allowed:Record<LabStatus,LabStatus[]>={PLANNED:["IMPRESSION_TAKEN","SCANNED","SENT","CANCELLED"],IMPRESSION_TAKEN:["SENT","CANCELLED"],SCANNED:["SENT","CANCELLED"],SENT:["IN_PRODUCTION","TRIAL","RECEIVED","INCIDENT"],IN_PRODUCTION:["TRIAL","RECEIVED","INCIDENT"],TRIAL:["SENT","IN_PRODUCTION","RECEIVED","INCIDENT"],RECEIVED:["PLACED","INCIDENT"],PLACED:["INCIDENT"],INCIDENT:["SENT","IN_PRODUCTION","RECEIVED","CANCELLED"],CANCELLED:[]};
export function canTransitionLab(from:LabStatus,to:LabStatus){return allowed[from].includes(to)}
export function transitionLab(from:LabStatus,to:LabStatus){if(!canTransitionLab(from,to))throw new Error(`Invalid lab transition ${from} -> ${to}`);return to}
export function appointmentBeforeEta(appointmentAt:Date,etaAt:Date){return appointmentAt.getTime()<etaAt.getTime()}
