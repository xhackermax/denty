import type {FastifyInstance} from "fastify";
import {getActor} from "../../plugins/actor";
import {getCorrelationId} from "../../plugins/correlation";
import {executeVoicePlan,previewVoice} from "./service";
import {transcribeAudio} from "./providers";
import {issueVoicePlanToken} from "./plan-token";
export async function registerVoiceRoutes(server:FastifyInstance){
 server.get("/api/voice/capabilities",async request=>{await getActor(request);return{asrConfigured:Boolean(process.env.DENTY_ASR_ENDPOINT),llmConfigured:Boolean(process.env.DENTY_LLM_VOICE_ENDPOINT),localNlu:true}});
 server.post("/api/voice/transcribe",async request=>{await getActor(request);const b=request.body as any;return transcribeAudio({base64:String(b.base64??""),mimeType:b.mimeType,language:b.language})});
 server.post("/api/voice/preview",async request=>{const actor=await getActor(request),b=request.body as any,preview=await previewVoice(actor,String(b.text??""));return{...preview,planToken:issueVoicePlanToken(actor,preview.plan)}});
 server.post("/api/voice/execute",async request=>{const actor=await getActor(request),b=request.body as any;return executeVoicePlan(actor,String(b.planToken??""),Boolean(b.confirmed),getCorrelationId(request))});
}
