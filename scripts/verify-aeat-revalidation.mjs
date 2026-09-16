import fs from 'node:fs';
const path='docs/compliance/aeat-verifactu-validation.json';
if(!fs.existsSync(path))throw new Error(`Falta ${path}`);
const data=JSON.parse(fs.readFileSync(path,'utf8')),reviewed=new Date(`${data.reviewedAt}T00:00:00Z`),ageDays=(Date.now()-reviewed.getTime())/86400000,max=Number(data.maxAgeDays??90);
if(Number.isNaN(reviewed.getTime()))throw new Error('reviewedAt no válido');
if(ageDays<0||ageDays>max)throw new Error(`Revalidación AEAT caducada: ${Math.floor(ageDays)} días (máximo ${max}). Revisa las especificaciones oficiales y actualiza ${path}.`);
if(!Array.isArray(data.sources)||data.sources.length<2||data.sources.some(x=>!/^https:\/\/(?:www\.)?(?:sede\.)?agenciatributaria\.(?:gob\.es|es)\//.test(String(x))))throw new Error('La revalidación debe apuntar a fuentes oficiales de AEAT.');
if(data.productionCertificateTestRequired!==true)throw new Error('Debe mantenerse explícita la prueba con certificado real antes de producción fiscal.');
console.log(`AEAT specification review current: ${data.reviewedAt} (${Math.floor(ageDays)} days old)`);
