import * as crypto from "node:crypto";
import { promisify } from "node:util";

const scrypt=promisify(crypto.scrypt);
const LEGACY_PREFIX="scrypt-v1";
const ARGON_PREFIX="argon2id-v1";
const ARGON_MEMORY=65_536;
const ARGON_PASSES=3;
const ARGON_PARALLELISM=1;
const ARGON_TAG_LENGTH=32;

type Argon2Callback=(error:Error|null,derivedKey:Buffer)=>void;
type Argon2Function=(algorithm:"argon2id",parameters:{message:string|Buffer;nonce:Buffer;parallelism:number;tagLength:number;memory:number;passes:number},callback:Argon2Callback)=>void;
function argon2Function(){const fn=(crypto as unknown as {argon2?:Argon2Function}).argon2;if(typeof fn!=="function")throw new Error("Denty requires Node.js 24.8 or newer for Argon2id credential hashing");return fn}
async function deriveArgon2id(secret:string,nonce:Buffer,options={memory:ARGON_MEMORY,passes:ARGON_PASSES,parallelism:ARGON_PARALLELISM,tagLength:ARGON_TAG_LENGTH}){const fn=argon2Function();return new Promise<Buffer>((resolve,reject)=>fn("argon2id",{message:secret,nonce,parallelism:options.parallelism,tagLength:options.tagLength,memory:options.memory,passes:options.passes},(error,key)=>error?reject(error):resolve(key)))}

export async function argonHash(secret:string):Promise<string>{const nonce=crypto.randomBytes(16),derived=await deriveArgon2id(secret,nonce);return `${ARGON_PREFIX}$${ARGON_MEMORY}$${ARGON_PASSES}$${ARGON_PARALLELISM}$${nonce.toString("base64url")}$${derived.toString("base64url")}`}
async function verifyArgon(hash:string,secret:string){try{const [prefix,memoryRaw,passesRaw,parallelRaw,nonceRaw,keyRaw]=hash.split("$");if(prefix!==ARGON_PREFIX||!nonceRaw||!keyRaw)return false;const memory=Number(memoryRaw),passes=Number(passesRaw),parallelism=Number(parallelRaw),expected=Buffer.from(keyRaw,"base64url"),nonce=Buffer.from(nonceRaw,"base64url");if(!Number.isInteger(memory)||!Number.isInteger(passes)||!Number.isInteger(parallelism)||nonce.length<16||expected.length<16)return false;const actual=await deriveArgon2id(secret,nonce,{memory,passes,parallelism,tagLength:expected.length});return expected.length===actual.length&&crypto.timingSafeEqual(expected,actual)}catch{return false}}
export async function verifyLegacyScrypt(hash:string,secret:string):Promise<boolean>{try{const [prefix,saltB64,keyB64]=hash.split("$");if(prefix!==LEGACY_PREFIX||!saltB64||!keyB64)return false;const expected=Buffer.from(keyB64,"base64url"),actual=await scrypt(secret,Buffer.from(saltB64,"base64url"),expected.length) as Buffer;return expected.length===actual.length&&crypto.timingSafeEqual(expected,actual)}catch{return false}}

export async function hashPassword(secret:string):Promise<string>{if(secret.length<10)throw new Error("Password must contain at least 10 characters");return argonHash(secret)}
export async function verifyPassword(hash:string,secret:string):Promise<boolean>{if(hash.startsWith(`${ARGON_PREFIX}$`))return verifyArgon(hash,secret);if(hash.startsWith(`${LEGACY_PREFIX}$`))return verifyLegacyScrypt(hash,secret);return false}
export function needsCredentialRehash(hash:string){if(!hash.startsWith(`${ARGON_PREFIX}$`))return true;const [prefix,memoryRaw,passesRaw,parallelRaw,nonceRaw,keyRaw]=hash.split("$");return prefix!==ARGON_PREFIX||Number(memoryRaw)!==ARGON_MEMORY||Number(passesRaw)!==ARGON_PASSES||Number(parallelRaw)!==ARGON_PARALLELISM||Buffer.from(nonceRaw??"","base64url").length<16||Buffer.from(keyRaw??"","base64url").length!==ARGON_TAG_LENGTH}
export async function hashPin(pin:string):Promise<string>{if(!/^\d{6,}$/.test(pin))throw new Error("PIN must contain at least 6 digits");return hashPassword(`pin:${pin}:denty`)}
export async function verifyPin(hash:string,pin:string):Promise<boolean>{return verifyPassword(hash,`pin:${pin}:denty`)}
