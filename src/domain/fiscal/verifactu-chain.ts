export type FiscalInput = { invoiceId:string; issuedAt:string; totalCents:number; taxId:string };
export type FiscalChainEntry = FiscalInput & { previousHash:string|null; hash:string };
const canonical = (x:FiscalInput, previousHash:string|null) => [x.taxId,x.invoiceId,x.issuedAt,String(x.totalCents),previousHash ?? ''].join('|');
const sha256 = async (value:string) => { const bytes=new TextEncoder().encode(value); const digest=await crypto.subtle.digest('SHA-256',bytes); return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join(''); };
export async function buildFiscalChainEntry(input:FiscalInput, previous:FiscalChainEntry|null):Promise<FiscalChainEntry>{
  const previousHash=previous?.hash ?? null;
  return {...input, previousHash, hash:await sha256(canonical(input, previousHash))};
}
export async function verifyFiscalChain(entries:FiscalChainEntry[]):Promise<boolean>{
  let prev:string|null=null;
  for(const e of entries){
    if(e.previousHash!==prev) return false;
    if(e.hash!==await sha256(canonical(e,e.previousHash))) return false;
    prev=e.hash;
  }
  return true;
}
