import { SESSION_COOKIE } from "./sessions";
export function parseCookies(header?:string){return Object.fromEntries((header??"").split(";").map(x=>x.trim()).filter(Boolean).map(x=>{const i=x.indexOf("=");return i<0?[x,""]:[x.slice(0,i),decodeURIComponent(x.slice(i+1))]}));}
export function sessionCookie(token:string,production=process.env.NODE_ENV==="production"){return `${SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${12*3600}${production?"; Secure":""}`;}
export function clearSessionCookie(production=process.env.NODE_ENV==="production"){return `${SESSION_COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${production?"; Secure":""}`;}
