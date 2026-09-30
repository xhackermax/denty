# Denty Development Guidelines

## TDD (Test-Driven Development)

**Todos los cambios de código deben seguir TDD:**

1. **Escribir tests primero** - Define el comportamiento esperado en tests antes de implementar
2. **Tests unitarios** - Prueba unidades individuales (funciones, métodos, componentes)
3. **Tests de integración** - Prueba cómo trabajan juntas múltiples partes
4. **Cobertura mínima** - Mantener cobertura de código >80%

### Workflow TDD

```
1. Red:   Escribe un test que falle (el código aún no existe)
2. Green: Escribe el código mínimo para pasar el test
3. Refactor: Mejora el código manteniendo los tests verdes
```

### Tests esperados por tipo de cambio

| Tipo | Tests requeridos |
|------|-------------------|
| Función lógica | Tests unitarios de casos normales + edge cases |
| API endpoint | Tests de request/response, errores, autenticación |
| Hook React | Tests con `@testing-library/react`, efectos, estado |
| Componente UI | Tests de renderizado, interacción, accesibilidad |
| Integración Supabase | Tests con datos simulados, manejo de errores |

---

## SOLID Principles

### S - Single Responsibility Principle
- **Cada función/módulo debe tener UNA razón para cambiar**
- Una clase = un propósito
- Un archivo no debe mezcllar lógica de negocio, UI, y utilidades

**✗ Mal:**
```typescript
// Mezcla autenticación, API, y UI
export function LoginButton() {
  async function handleLogin() {
    // Valida email
    // Llama API
    // Maneja errores
    // Actualiza estado UI
  }
}
```

**✓ Bien:**
```typescript
// Lógica pura
export const validateEmail = (email: string): boolean => { ... }

// Capa API
export const loginUser = (email: string, password: string) => { ... }

// Componente UI
export function LoginButton() {
  const { mutate: login } = useLoginMutation()
}
```

### O - Open/Closed Principle
- **Abierto para extensión, cerrado para modificación**
- Agrega nuevas funcionalidades sin cambiar código existente
- Usa composición, herencia, o inyección de dependencias

**✗ Mal:**
```typescript
// Cada nueva acción de voz requiere modificar la función
function executeVoiceAction(action: string) {
  if (action === "marcar_hallazgo") { ... }
  if (action === "marcar_tratamiento") { ... }
  if (action === "anotar_nota") { ... } // Agregar aquí cada vez
}
```

**✓ Bien:**
```typescript
// Extensible sin modificar código existente
type VoiceActionHandler = (input: unknown) => Promise<void>;
const handlers: Record<string, VoiceActionHandler> = {
  marcar_hallazgo: handleMarcarHallazgo,
  marcar_tratamiento: handleMarcarTratamiento,
  anotar_nota: handleAnotarNota,
  // Nuevas acciones se agregan al mapa sin cambiar la función
};

async function executeVoiceAction(name: string, input: unknown) {
  const handler = handlers[name];
  if (!handler) throw new Error(`Action not found: ${name}`);
  return handler(input);
}
```

### L - Liskov Substitution Principle
- **Las subclases deben ser intercambiables con sus superclases**
- Si prometes una interfaz, cumple el contrato completamente
- No sorprendas a quien usa tu código

**✗ Mal:**
```typescript
interface VoiceAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
}

class RealtimeAdapter implements VoiceAdapter {
  connect() { /* inicializa realtime */ }
  disconnect() { /* ... pero aquí no desconecta, solo reset */ }
}
```

**✓ Bien:**
```typescript
class RealtimeAdapter implements VoiceAdapter {
  connect(): Promise<void> { /* inicializa completamente */ }
  disconnect(): Promise<void> { /* desconecta completamente */ }
  // El contrato se cumple en toda subclase
}
```

### I - Interface Segregation Principle
- **Muchas interfaces pequeñas > pocas interfaces grandes**
- Los clientes no deben depender de métodos que no usan
- Define interfaces específicas para cada caso de uso

**✗ Mal:**
```typescript
interface RealtimeService {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  submitToolResult(): void;
  getConnectionStatus(): string;
  getListeningState(): boolean;
  getError(): string | null;
  // ... 15 más propiedades
}
```

**✓ Bien:**
```typescript
interface Connectable {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
}

interface ToolExecutor {
  submitToolResult(toolCallId: string, result: ToolResult): void;
}

interface StatusProvider {
  getStatus(): ConnectionStatus;
}

// Componentes usan solo lo que necesitan
export function VoiceBar() {
  const connectable: Connectable = useRealtimeVoice();
}
```

### D - Dependency Inversion Principle
- **Depende de abstracciones, no de implementaciones concretas**
- Inyecta dependencias en lugar de crearlas dentro de funciones
- Las capas altas no deben depender de capas bajas

**✗ Mal:**
```typescript
export class VoiceCommandBar {
  private realtime = new RealtimeVoiceAdapter(); // Acoplado
  
  listen() {
    this.realtime.connect(); // No se puede testear sin la implementación real
  }
}
```

**✓ Bien:**
```typescript
interface VoiceAdapter {
  connect(): Promise<void>;
  executeToolCall(id: string, name: string, args: unknown): Promise<void>;
}

export function VoiceCommandBar({ adapter }: { adapter: VoiceAdapter }) {
  // Depende de la interfaz, no de la implementación
  // Fácil de testear con un mock
}
```

---

## Checklist antes de hacer commit

- [ ] Escribí tests PRIMERO (TDD workflow)
- [ ] Los tests pasan (`npm run test`)
- [ ] Cobertura >= 80% en archivos nuevos
- [ ] Cada función/clase tiene una sola responsabilidad (S)
- [ ] Nuevas características no requieren modificar código existente (O)
- [ ] Respeto las interfaces de mis dependencias (L)
- [ ] Mis interfaces son específicas y pequeñas (I)
- [ ] Mis dependencias se inyectan, no se crean localmente (D)
- [ ] ESLint y Prettier pasan sin errores
- [ ] TypeScript strict mode sin errores
- [ ] No hay comentarios sobre "qué hace", solo "por qué"

---

## Estructura de tests recomendada

```
src/
├── features/voice/
│   ├── realtime-tools.ts
│   ├── __tests__/
│   │   └── realtime-tools.test.ts    # Tests al lado del código
│   ├── use-realtime-voice.ts
│   └── __tests__/
│       └── use-realtime-voice.test.ts
```

### Template para test.ts

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";

describe("RealtimeTools", () => {
  describe("convertToolsForRealtime", () => {
    it("should convert Claude voice tools to Realtime format", () => {
      // Arrange
      const tools = convertToolsForRealtime();
      
      // Act
      const realtimeTool = tools[0];
      
      // Assert
      expect(realtimeTool).toHaveProperty("type", "function");
      expect(realtimeTool).toHaveProperty("parameters.type", "object");
    });

    it("should handle missing descriptions", () => {
      // ... test for edge case
    });
  });

  describe("processRealtimeToolCall", () => {
    it("should validate tool inputs against schema", () => {
      // ... test validation
    });

    it("should return ambiguities for invalid inputs", () => {
      // ... test error handling
    });
  });
});
```

---

## Referencias

- [Test-Driven Development - Kent Beck](https://www.pearson.com/en-us/subject-catalogs/engineering-it/test-driven-development-by-example-kent-beck-0201616224)
- [SOLID Principles - Robert Martin](https://en.wikipedia.org/wiki/SOLID)
- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)

@AGENTS.md
