DENTY R7 - CORRECCION BUILD VERCEL 18:21

Corregidos los errores TypeScript reportados por Vercel:
- agenda: hour/minute protegidos frente a undefined con noUncheckedIndexedAccess
- endodoncia: restaurado path SVG ENDODONTIC_TOOTH_PATH
- tests de odontograma: patientId obligatorio en periodontograma y pediatrico
- odontograma: props opcionales birthDate omitidas cuando no existen (exactOptionalPropertyTypes)
- ausencias: indices regex validados y ruta API corregida a api.attendance.createAbsence
- documentos: sourceUrl opcional no se envia como undefined
- pagos: terminalName/terminalStatus opcionales no se envian como undefined
- recetas demo: eliminado estado DISPENSED imposible en PrescriptionState demo

Se mantiene ZIP plano para Vercel:
- Root Directory: raiz
- Install: npm ci
- Build: npm run build
- Output Directory: automatico/vacio
- Node: 24.x
