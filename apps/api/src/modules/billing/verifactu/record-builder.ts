import { createHash } from "node:crypto";

export interface FiscalTaxDetail { taxRateBps:number; baseCents:number; taxCents:number; exemptionCode?:string }
export interface FiscalPreviousRecord { issuerTaxId:string; invoiceNumber:string; issuedAt:string; hash:string }
export interface FiscalInvoiceSnapshot {
  invoiceNumber:string;
  issuedAt:string;
  generatedAt:string;
  issuerTaxId:string;
  issuerName:string;
  customerTaxId?:string;
  customerName:string;
  subtotalCents:number;
  taxCents:number;
  totalCents:number;
  type:string;
  description?:string;
  taxDetails?:FiscalTaxDetail[];
  rectifiedInvoiceNumber?:string;
  previous?:FiscalPreviousRecord;
}

export function aeatInvoiceType(type:string){if(type==="SIMPLIFIED")return"F2";if(type==="RECTIFYING")return"R1";return"F1"}
export function aeatDate(value:string|Date){const d=new Date(value);const dd=String(d.getUTCDate()).padStart(2,"0"),mm=String(d.getUTCMonth()+1).padStart(2,"0");return`${dd}-${mm}-${d.getUTCFullYear()}`}
export function aeatAmount(cents:number){const sign=cents<0?"-":"",v=Math.abs(Math.trunc(cents)),whole=Math.floor(v/100),fraction=String(v%100).padStart(2,"0").replace(/0+$/g,"");return fraction?`${sign}${whole}.${fraction}`:`${sign}${whole}`}
/** Exact field order published by AEAT for a RegistroAlta hash. */
export function aeatAltaHashInput(snapshot:FiscalInvoiceSnapshot){return [
  `IDEmisorFactura=${snapshot.issuerTaxId.trim()}`,
  `NumSerieFactura=${snapshot.invoiceNumber.trim()}`,
  `FechaExpedicionFactura=${aeatDate(snapshot.issuedAt)}`,
  `TipoFactura=${aeatInvoiceType(snapshot.type)}`,
  `CuotaTotal=${aeatAmount(snapshot.taxCents)}`,
  `ImporteTotal=${aeatAmount(snapshot.totalCents)}`,
  `Huella=${snapshot.previous?.hash?.trim()??""}`,
  `FechaHoraHusoGenRegistro=${snapshot.generatedAt.trim()}`
].join("&")}
export function aeatAltaHash(snapshot:FiscalInvoiceSnapshot){return createHash("sha256").update(aeatAltaHashInput(snapshot),"utf8").digest("hex").toUpperCase()}
export function buildFiscalRecord(snapshot:FiscalInvoiceSnapshot){return{canonical:snapshot,recordHash:aeatAltaHash(snapshot),previousHash:snapshot.previous?.hash??null};}
export function buildQrPayload(snapshot:FiscalInvoiceSnapshot){const env=String(process.env.DENTY_AEAT_ENV??"test").toLowerCase();const base=process.env.DENTY_AEAT_QR_BASE_URL??(env==="production"?"https://www2.agenciatributaria.gob.es/wlpl/TIKE-CONT/ValidarQR":"https://prewww2.aeat.es/wlpl/TIKE-CONT/ValidarQR");const u=new URL(base);u.searchParams.set("nif",snapshot.issuerTaxId.trim());u.searchParams.set("numserie",snapshot.invoiceNumber.trim());u.searchParams.set("fecha",aeatDate(snapshot.issuedAt));u.searchParams.set("importe",aeatAmount(snapshot.totalCents));return u.toString();}
