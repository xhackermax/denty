DENTY · ZIP DE PRUEBA PARA VERCEL

Este paquete fuerza NEXT_PUBLIC_DEMO_MODE=true desde vercel.json.
No necesita DENTY_API_URL para abrir /app y recorrer la demo.

Comprobaciones tras desplegar:
1. /api/health debe responder JSON con ok=true.
2. /app debe abrir sin el error "Denty API no está disponible para validar la sesión".
3. La interfaz debe mostrar el banner de modo demostración.

IMPORTANTE:
- Este ZIP NO incorpora el backend clínico real ni una base de datos clínica.
- No introduzcas datos reales de pacientes.
- Para producción, NEXT_PUBLIC_DEMO_MODE debe ser false y DENTY_API_URL debe apuntar al backend real.
