/**
 * Realtime API tool definitions and handlers
 * Converts Denty's voice tools to Realtime API format and processes tool calls
 */

import {
  CLAUDE_VOICE_TOOLS,
  actionsFromToolCalls,
  type ClaudeVoiceInterpretation,
} from "@/server/voice/claude-voice-tools";

export interface RealtimeTool {
  type: "function";
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required: string[];
  };
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

/**
 * Converts Denty's Claude voice tools to Realtime API format
 * The Realtime API expects tools in a simplified format without strict mode
 */
export function convertToolsForRealtime(): RealtimeTool[] {
  return CLAUDE_VOICE_TOOLS.map((tool) => ({
    type: "function",
    name: tool.name,
    description: tool.description || "",
    parameters: {
      type: "object",
      properties: (tool.input_schema as any).properties || {},
      required: (tool.input_schema as any).required || [],
    },
  }));
}

/**
 * Handles tool calls from the Realtime API
 * Converts tool invocations to Denty voice actions
 */
export function processRealtimeToolCall(toolCall: ToolCall): ClaudeVoiceInterpretation {
  // Convert the single tool call to the format expected by actionsFromToolCalls
  const result = actionsFromToolCalls([
    {
      name: toolCall.name,
      input: toolCall.arguments,
    },
  ]);

  return result;
}

/**
 * Format tool result for sending back to Realtime API
 */
export function formatToolResult(
  toolCallId: string,
  result: {
    success: boolean;
    message?: string;
    error?: string;
  },
): {
  type: "client.tool.result";
  tool_call_id: string;
  result: string;
} {
  return {
    type: "client.tool.result",
    tool_call_id: toolCallId,
    result: JSON.stringify(result),
  };
}

/**
 * Gets the tool calling instructions for the Realtime system prompt
 */
export function getToolCallingInstructions(): string {
  return `
Tienes acceso a herramientas para ejecutar acciones en Denty. Úsalas cuando haya información suficiente.
Las herramientas disponibles son:
- marcar_hallazgo: Marca hallazgos en el odontograma (caries, sano, ausente)
- marcar_tratamiento: Registra tratamientos (obturación, endodoncia, etc.)
- anotar_nota: Guarda notas clínicas
- registrar_periodoncia: Registra mediciones periodontales
- abrir_seccion: Abre una sección de Denty (pacientes, agenda, etc.)
- pedir_aclaracion: Pide datos faltantes

Llama a las herramientas con los parámetros exactos, sin texto adicional.
`;
}
