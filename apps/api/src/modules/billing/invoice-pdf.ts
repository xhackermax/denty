import { qrMatrixM } from "./qr";

type InvoicePdfLine={description:string;quantity:number;unitPriceCents:number;subtotalCents:number;taxRateBps:number;taxCents:number;totalCents:number;exemptionCode?:string|null};
type InvoicePdfInput={
  fullNumber:string;
  issuedAt:Date|string;
  type:string;
  currency:string;
  customerName:string;
  customerTaxId?:string|null;
  customerAddress?:string|null;
  subtotalCents:number;
  taxCents:number;
  totalCents:number;
  rectificationReason?:string|null;
  clinic:{name:string;legalName?:string|null;taxId?:string|null;fiscalAddress?:string|null;phone?:string|null;email?:string|null};
  lines:InvoicePdfLine[];
  fiscalRecord:{recordHash:string;qrPayload?:string|null};
};

function esc(s:string){return s.replace(/\\/g,"\\\\").replace(/\(/g,"\\(").replace(/\)/g,"\\)")}
function latin1(s:unknown){return String(s??"").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^\x20-\x7E]/g,"?")}
function text(x:number,y:number,size:number,value:unknown,bold=false){const font=bold?"F2":"F1";return `BT /${font} ${size} Tf ${x.toFixed(2)} ${y.toFixed(2)} Td (${esc(latin1(value))}) Tj ET`;}
function line(x1:number,y1:number,x2:number,y2:number){return `${x1} ${y1} m ${x2} ${y2} l S`;}
function money(cents:number,currency="EUR"){return `${(cents/100).toFixed(2)} ${currency}`;}
function dateEs(value:Date|string){const d=value instanceof Date?value:new Date(value);return Number.isNaN(d.getTime())?String(value):new Intl.DateTimeFormat("es-ES",{day:"2-digit",month:"2-digit",year:"numeric",timeZone:"Europe/Madrid"}).format(d);}
function qrCommands(payload:string,x:number,y:number,moduleSize=2.15){const matrix=qrMatrixM(payload),quiet=4,commands:string[]=[];for(let r=0;r<matrix.length;r++)for(let c=0;c<matrix.length;c++)if(matrix[r][c]){const px=x+(c+quiet)*moduleSize,py=y+(matrix.length-r-1+quiet)*moduleSize;commands.push(`${px.toFixed(2)} ${py.toFixed(2)} ${moduleSize.toFixed(2)} ${moduleSize.toFixed(2)} re f`);}return{commands:commands.join("\n"),size:(matrix.length+quiet*2)*moduleSize};}

function buildPages(invoice:InvoicePdfInput){
  const rowsPerPage=22,totalPages=Math.max(1,Math.ceil(invoice.lines.length/rowsPerPage)),pages:string[]=[];
  for(let page=0;page<totalPages;page++){
    const out:string[]=["0 G","0 g","0.6 w"];
    out.push(text(45,798,18,invoice.clinic.legalName??invoice.clinic.name,true));
    out.push(text(45,778,9,invoice.clinic.taxId?`NIF/CIF: ${invoice.clinic.taxId}`:""));
    if(invoice.clinic.fiscalAddress)out.push(text(45,764,9,invoice.clinic.fiscalAddress));
    if(invoice.clinic.phone||invoice.clinic.email)out.push(text(45,750,9,[invoice.clinic.phone,invoice.clinic.email].filter(Boolean).join(" · ")));
    out.push(text(365,798,15,invoice.type==="RECTIFYING"?"FACTURA RECTIFICATIVA":"FACTURA",true));
    out.push(text(365,778,11,invoice.fullNumber,true));
    out.push(text(365,762,9,`Fecha: ${dateEs(invoice.issuedAt)}`));
    out.push(text(365,746,8,`Pagina ${page+1}/${totalPages}`));
    out.push(line(45,731,550,731));
    out.push(text(45,712,10,"Cliente",true));
    out.push(text(45,696,10,invoice.customerName));
    if(invoice.customerTaxId)out.push(text(45,681,9,`NIF/NIE: ${invoice.customerTaxId}`));
    if(invoice.customerAddress)out.push(text(45,666,9,invoice.customerAddress));
    if(invoice.rectificationReason)out.push(text(45,648,8,`Motivo rectificacion: ${invoice.rectificationReason}`));
    const headerY=invoice.rectificationReason?620:632;
    out.push(line(45,headerY+13,550,headerY+13));
    out.push(text(45,headerY,8,"Descripcion",true));out.push(text(350,headerY,8,"Cant.",true));out.push(text(395,headerY,8,"Precio",true));out.push(text(468,headerY,8,"Total",true));
    out.push(line(45,headerY-5,550,headerY-5));
    const start=page*rowsPerPage,chunk=invoice.lines.slice(start,start+rowsPerPage);
    chunk.forEach((item,index)=>{const y=headerY-22-index*18;const desc=latin1(item.description).slice(0,52);out.push(text(45,y,8,desc));out.push(text(355,y,8,item.quantity));out.push(text(395,y,8,money(item.unitPriceCents,invoice.currency)));out.push(text(468,y,8,money(item.totalCents,invoice.currency)));});
    if(page===totalPages-1){
      const totalsY=Math.max(126,headerY-35-chunk.length*18);
      out.push(line(340,totalsY+52,550,totalsY+52));
      out.push(text(360,totalsY+36,9,"Base imponible"));out.push(text(468,totalsY+36,9,money(invoice.subtotalCents,invoice.currency)));
      out.push(text(360,totalsY+20,9,"Impuestos"));out.push(text(468,totalsY+20,9,money(invoice.taxCents,invoice.currency)));
      out.push(text(360,totalsY,11,"TOTAL",true));out.push(text(468,totalsY,11,money(invoice.totalCents,invoice.currency),true));
    }
    if(page===0&&invoice.fiscalRecord.qrPayload){
      const qr=qrCommands(invoice.fiscalRecord.qrPayload,45,32,2.05);out.push(qr.commands);
      out.push(text(45,22,7,"QR de verificacion fiscal / VERI*FACTU"));
      out.push(text(175,92,7,"Huella del registro fiscal:"));out.push(text(175,80,6,invoice.fiscalRecord.recordHash));
    }
    pages.push(out.join("\n"));
  }
  return pages;
}

export function renderInvoicePdf(invoice:InvoicePdfInput):Buffer{
  if(!invoice.fullNumber)throw new Error("Invoice number required");
  if(!invoice.fiscalRecord?.qrPayload)throw new Error("Fiscal QR payload required");
  const streams=buildPages(invoice),pageCount=streams.length,fontRegularId=3+pageCount*2,fontBoldId=fontRegularId+1,objectCount=fontBoldId;
  const objs:string[]=new Array(objectCount+1);
  objs[1]="<< /Type /Catalog /Pages 2 0 R >>";
  const pageIds=streams.map((_,i)=>3+i*2),contentIds=streams.map((_,i)=>4+i*2);
  objs[2]=`<< /Type /Pages /Kids [${pageIds.map(id=>`${id} 0 R`).join(" ")}] /Count ${pageCount} >>`;
  streams.forEach((stream,i)=>{
    objs[pageIds[i]]=`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >> /Contents ${contentIds[i]} 0 R >>`;
    objs[contentIds[i]]=`<< /Length ${Buffer.byteLength(stream,"binary")} >>\nstream\n${stream}\nendstream`;
  });
  objs[fontRegularId]="<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
  objs[fontBoldId]="<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>";
  let out="%PDF-1.4\n%\xE2\xE3\xCF\xD3\n",offsets:number[]=[0];
  for(let i=1;i<=objectCount;i++){offsets[i]=Buffer.byteLength(out,"binary");out+=`${i} 0 obj\n${objs[i]}\nendobj\n`;}
  const xref=Buffer.byteLength(out,"binary");out+=`xref\n0 ${objectCount+1}\n0000000000 65535 f \n`;for(let i=1;i<=objectCount;i++)out+=`${String(offsets[i]).padStart(10,"0")} 00000 n \n`;out+=`trailer << /Size ${objectCount+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(out,"binary");
}
