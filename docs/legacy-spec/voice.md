# Especificación legacy · Voz/NLU

Fuente: parser legacy. Se conserva como especificación de paridad, no como arquitectura. La migración debe llevar reglas puras al dominio y mantener el patrón preview → token → confirmación → execute.

## Funciones extraídas del legacy

### `parseDentalCommand`

```js
function parseDentalCommand(text, ctx={}
```

### `odontogramEntityCommand`

```js
function odontogramEntityCommand(text){
  return bridgeEntityCommand(text)||implantEntityCommand(text)||removableEntityCommand(text)||orthodonticsEntityCommand(text)||pediatricEntityCommand(text);
}
```

### `odontogramCommand`

```js
function odontogramCommand(text){
  const n=ntext(text), tooth=extractTooth(text), surface=extractSurface(text);
  if(!tooth) return null;
  if(/caries/.test(n)) return result('odontogram.set',{tooth,surface:surface||'O',status:'caries'},.98);
  if(/\b(sano|saludable)\b/.test(n)) return result('odontogram.set',{tooth,status:'healthy'},.96);
  if(/\b(ausente|falta|perdido)\b/.test(n)) return result('odontogram.set',{tooth,status:'missing'},.96);
  if(/extracci|exodon/.test(n)) return result('odontogram.set',{tooth,status:'extraction'},.96);
  if(/endo|conducto/.test(n)) return result('odontogram.set',{tooth,status:treatmentStatus(text,'endo')},.96);
  if(/perno|munon/.test(n)) return result('odontogram.set',{tooth,status:treatmentStatus(text,'post')},.95);
  if(/implante/.test(n)) return result('odontogram.set',{tooth,status:treatmentStatus(text,'implant')},.94);
  if(/corona/.test(n)) return result('odontogram.set',{tooth,status:treatmentStatus(text,'crown')},.95);
  if(/puente|protesis fija/.test(n)) return result('odontogram.set',{tooth,status:treatmentStatus(text,'prosthesis')},.93);
  if(/removible/.test(n)) return result('odontogram.set',{tooth,status:treatmentStatus(text,'removable')},.93);
  if(/obtur|empaste|reconstru/.test(n)) return result('odontogram.set',{tooth,surface:surface||'',status:treatmentStatus(text,'filling')},.94);
  return null;
}
```

### `periodontalCommand`

```js
function periodontalCommand(text){
  const n=ntext(text), tooth=extractTooth(text); if(!tooth) return null;
  const mob=(n.match(/movilidad\s*(\d|i{1,3})/)||[])[1];
  const depth=(n.match(/(?:bolsa|sondaje|profundidad)\s*(\d{1,2})/)||[])[1];
  if(!mob&&!depth) return null;
  return result('periodontal.update',{tooth,mobility:mob?String(mob).toUpperCase():null,depth_mm:depth?Number(depth):null,surface:extractSurface(text)||'D'},.94);
}
```

### `parseVoiceCommand`

```js
function parseVoiceCommand(text, context={}
```
