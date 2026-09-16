import { writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
function esc(s:string){return s.replace(/\\/g,"\\\\").replace(/\(/g,"\\(").replace(/\)/g,"\\)")}
function latin1(s:string){return s.normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^\x20-\x7E\n]/g,"?")}
export function renderSimplePdf(title:string,body:string):Buffer{
  const lines=[title,"",...latin1(body).split(/\r?\n/)].flatMap(x=>x.length<=92?[x]:x.match(/.{1,92}(?:\s|$)/g)?.map(y=>y.trimEnd())??[x]);
  const text=lines.slice(0,56).map((line,i)=>`BT /F1 ${i===0?16:10} Tf 50 ${790-i*13} Td (${esc(line)}) Tj ET`).join("\n");
  const objs:string[]=[];objs[1]="<< /Type /Catalog /Pages 2 0 R >>";objs[2]="<< /Type /Pages /Kids [3 0 R] /Count 1 >>";objs[3]="<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>";objs[4]=`<< /Length ${Buffer.byteLength(text)} >>\nstream\n${text}\nendstream`;objs[5]="<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
  let out="%PDF-1.4\n",offsets=[0];for(let i=1;i<=5;i++){offsets[i]=Buffer.byteLength(out);out+=`${i} 0 obj\n${objs[i]}\nendobj\n`;}const xref=Buffer.byteLength(out);out+=`xref\n0 6\n0000000000 65535 f \n`;for(let i=1;i<=5;i++)out+=`${String(offsets[i]).padStart(10,"0")} 00000 n \n`;out+=`trailer << /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;return Buffer.from(out,"binary");
}
export async function writePdf(path:string,title:string,body:string){await mkdir(dirname(path),{recursive:true});await writeFile(path,renderSimplePdf(title,body));return path;}
