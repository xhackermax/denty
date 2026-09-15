# Denty

## Abrir Denty en Windows

Haz doble clic en `ABRIR-DENTY.bat`. El archivo inicia `server.py` desde la carpeta correcta y abre `http://127.0.0.1:8765` en el navegador. No abras `index.html` directamente: esta versión usa módulos ES y funciones de servidor para TPV/IA.

 Web Preview 1.7 Accesos

Preview estática para desplegar en Vercel Drop y probar desde Android con navegador.

## Cambios principales

## 1.7 Accesos: puerta inicial por tipo de cuenta

Al abrir Denty aparece una pantalla inicial con tres entradas separadas: **Cuenta Administrador**, **Cuenta Usuario** y **Cuenta Paciente**. Esta fase todavía no solicita usuario ni contraseña. La selección de portal se guarda aparte de `db.currentUser` para que la autenticación futura y el fichaje puedan construirse sin mezclar el tipo de portal con la identidad clínica.

Administrador y Usuario pueden continuar a la aplicación actual en modo de preparación. Cuenta Paciente queda aislada de la aplicación clínica hasta que exista su portal específico. En la siguiente fase se añadirán credenciales reales y se vinculará el fichaje con la identidad autenticada.

- Logo real extraído de la APK Denty 7.2.4: `denty-logo.png`.
- Odontograma con leyenda clínica más clara:
  - iconos SVG diferentes para caries, obturación, corona, endodoncia, perno, implante, puente, removible, sano, ausente y extracción indicada;
  - cada tarjeta indica si actúa sobre superficie o sobre diente completo;
  - pulsaciones repetidas cambian el estado de correcto a insatisfactorio/revisión y pendiente/indicado;
  - puntos visuales muestran el estado del ciclo.
- Catálogo base importado desde Denty APK:
  - doctores: Dr. Máximo, Dr. Isaac, Dra. Seneida;
  - sedes: Avenida Navarra 17, Paseo Damas, Cariñena;
  - consentimientos clínicos;
  - tratamientos y tarifas implantológicas/protésicas configurables.
- Migración no destructiva desde la 0.4: añade catálogos que falten sin borrar pacientes ni sobrescribir precios editados.


## 1.6 TPV: cobro real con datáfono

La herramienta de cobros ya diferencia entre **registrar un pago** y **procesar un pago con tarjeta**. Para tarjeta, Denty envía el importe al servidor local, el servidor inicia el checkout en el datáfono y Denty solo considera el importe cobrado después de recibir un estado final `successful`.

Estados locales principales: `pending`, `awaiting_customer`, `paid`, `failed`, `cancelled`, `verification_required`. Los intentos pendientes, rechazados, cancelados o sin verificar no reducen el saldo de un presupuesto.

### Probar todo sin mover dinero

En Windows PowerShell:

```powershell
$env:DENTY_PAYMENT_PROVIDER="mock"
python server.py
```

Después abre **http://127.0.0.1:8765** en el navegador. En Ajustes → Pagos y datáfonos aparecerá `Datáfono virtual Denty`. El primer sondeo queda pendiente y el siguiente confirma el pago, permitiendo probar el flujo completo sin hardware.

### SumUp Solo real

Denty usa la **SumUp Cloud API** desde `server.py`. Las credenciales nunca se guardan en localStorage ni se envían al JavaScript del navegador.

Configura las variables en PowerShell:

```powershell
$env:DENTY_PAYMENT_PROVIDER="sumup"
$env:SUMUP_API_KEY="TU_API_KEY"
$env:SUMUP_MERCHANT_CODE="TU_MERCHANT_CODE"
$env:SUMUP_AFFILIATE_KEY="TU_AFFILIATE_KEY"
$env:SUMUP_APP_ID="com.denty.clinic"
python server.py
```

Abre **http://127.0.0.1:8765**. Ve a Ajustes → Pagos y datáfonos. En el SumUp Solo inicia el emparejamiento, escribe en Denty el código alfanumérico de 8 o 9 caracteres y asigna el lector como predeterminado o a una sede concreta.

Flujo: Cobrar → paciente → presupuesto opcional → importe → Tarjeta → sede → datáfono → **Cobrar en datáfono**. Denty conserva `checkout_id`, `client_transaction_id`, lector, sede, estado y marcas de tiempo, pero nunca PAN/CVV ni datos completos de la tarjeta.

Para usar un datáfono físico, sirve Denty desde `server.py`; un despliegue estático de Vercel por sí solo no contiene las credenciales ni el gateway local de pagos.

## 1.5 Admin: Clínica y Ajustes editables

Esta build convierte Ajustes en un panel de administración real. Clínica, agenda, doctores, horarios, sedes, gabinetes, tratamientos, laboratorios, consentimientos, plantillas, usuarios, permisos, apariencia, servidor, Sync, MCP y política de copias tienen controles persistentes. Los cambios relevantes se reutilizan en agenda, presupuestos, trabajos de laboratorio y nuevos consentimientos.

La migración conserva automáticamente los datos guardados por **Denty Web Preview 1.3.3 / 1.4 Voice**.

## Uso en Vercel

1. Sube el ZIP a Vercel Drop.
2. Abre la URL `.vercel.app` desde Chrome Android.
3. Entra en Pacientes, crea uno y abre Odontograma.
4. Prueba la leyenda: toca varias veces Corona, Implante u Obturación y después toca un diente o superficie.

## Limitaciones

Esta preview guarda datos en el navegador del dispositivo. Para uso clínico real hace falta backend seguro o servidor local con SQLite.


## 1.3.3
Planificación jerárquica, agenda con motivo/detalle y consentimiento con firma digital.

## Voz, NLU local e IA opcional

Esta build añade un **Voice Router** común para ficha, odontograma, periodoncia, agenda, cobros, laboratorio, presupuestos y navegación. Las órdenes frecuentes se interpretan primero con reglas locales en el navegador. Si una frase no encaja, Denty puede pedir una interpretación estructurada al servidor local. La IA interpreta; Denty valida y ejecuta.

Ejemplos:

- `caries distal del 36`
- `hay que hacer endodoncia 22`
- `endodoncia realizada 22`
- `repetir perno 14`
- `agenda endodoncia 22 mañana a las 10:30`
- `cobra 100 euros en tarjeta`
- `recibe trabajo del laboratorio corona 11`

### Servidor local

Ejecuta:

```bash
python server.py
```

El NLU local funciona incluso si no hay servidor de IA. Los endpoints opcionales son `/api/ai/status`, `/api/ai/interpret` y `/api/mcp/interpret`.

### Ollama en el PC de la clínica

Instala e inicia Ollama y descarga un modelo pequeño, por ejemplo `qwen2.5:3b`. Después inicia Denty con estas variables de entorno:

```bash
DENTY_AI_PROVIDER=ollama DENTY_AI_MODEL=qwen2.5:3b python server.py
```

Si Ollama está en otra URL puedes definir `DENTY_AI_URL`. Por defecto se usa el endpoint local habitual de Ollama.

En PowerShell:

```powershell
$env:DENTY_AI_PROVIDER="ollama"
$env:DENTY_AI_MODEL="qwen2.5:3b"
python server.py
```

### Endpoint OpenAI-compatible

Para un servidor local o proveedor que implemente Chat Completions:

```bash
DENTY_AI_PROVIDER=openai_compatible \
DENTY_AI_URL=http://127.0.0.1:1234/v1/chat/completions \
DENTY_AI_MODEL=modelo-local \
DENTY_AI_API_KEY=clave-opcional \
python server.py
```

`DENTY_AI_API_KEY` se lee únicamente en `server.py`; no se envía al navegador ni se guarda en localStorage.

### MCP

El adaptador MCP usa un endpoint HTTP configurado en el servidor:

```bash
DENTY_MCP_URL=http://127.0.0.1:9000/interpret \
DENTY_MCP_TOKEN=token-opcional \
python server.py
```

La respuesta debe contener una orden JSON con una intención permitida. Denty vuelve a validarla antes de ejecutar ninguna mutación clínica.

### Vercel estático

En un despliegue puramente estático de Vercel seguirán funcionando las reglas locales y el reconocimiento de voz que ofrezca el navegador. El escalado a LLM o MCP requiere ejecutar `server.py` o implementar esos endpoints en un backend seguro.
