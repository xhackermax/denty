import { describe, it, expect } from "vitest";
import {
  convertToolsForRealtime,
  processRealtimeToolCall,
  formatToolResult,
} from "../realtime-tools";
import { CLAUDE_VOICE_TOOLS } from "@/server/voice/claude-voice-tools";

describe("RealtimeTools", () => {
  describe("convertToolsForRealtime", () => {
    it("should convert all Claude voice tools to Realtime format", () => {
      // Arrange & Act
      const realtimeTools = convertToolsForRealtime();

      // Assert
      expect(realtimeTools).toHaveLength(CLAUDE_VOICE_TOOLS.length);
      expect(realtimeTools[0]).toHaveProperty("type", "function");
      expect(realtimeTools[0]).toHaveProperty("name");
      expect(realtimeTools[0]).toHaveProperty("description");
      expect(realtimeTools[0]).toHaveProperty("parameters");
    });

    it("should preserve tool name and description", () => {
      // Arrange & Act
      const realtimeTools = convertToolsForRealtime();
      const claudeTools = CLAUDE_VOICE_TOOLS;

      // Assert
      for (let i = 0; i < realtimeTools.length; i++) {
        const realtimeTool = realtimeTools[i];
        const claudeTool = claudeTools[i];
        expect(realtimeTool).toBeDefined();
        expect(claudeTool).toBeDefined();
        if (realtimeTool && claudeTool) {
          expect(realtimeTool.name).toBe(claudeTool.name);
          expect(realtimeTool.description).toBe(claudeTool.description || "");
        }
      }
    });

    it("should structure parameters correctly", () => {
      // Arrange & Act
      const realtimeTools = convertToolsForRealtime();
      const firstTool = realtimeTools[0];

      // Assert
      expect(firstTool).toBeDefined();
      if (firstTool) {
        expect(firstTool.parameters).toEqual({
          type: "object",
          properties: expect.any(Object),
          required: expect.any(Array),
        });
      }
    });

    it("should handle empty description by providing empty string", () => {
      // Arrange & Act
      const realtimeTools = convertToolsForRealtime();

      // Assert
      for (const tool of realtimeTools) {
        expect(typeof tool.description).toBe("string");
        expect(tool.description).not.toBeNull();
      }
    });
  });

  describe("processRealtimeToolCall", () => {
    it("should process marcar_hallazgo tool call", () => {
      // Arrange
      const toolCall = {
        id: "call_123",
        name: "marcar_hallazgo",
        arguments: {
          diente: "36",
          hallazgo: "caries",
          caras: ["V", "M"],
        },
      };

      // Act
      const result = processRealtimeToolCall(toolCall);

      // Assert
      expect(result.actions).toBeDefined();
      expect(result.ambiguities).toBeDefined();
      expect(result.actions.length).toBeGreaterThan(0);
      expect(result.ambiguities.length).toBe(0);
    });

    it("should handle invalid tool call with ambiguities", () => {
      // Arrange
      const toolCall = {
        id: "call_123",
        name: "marcar_hallazgo",
        arguments: {
          diente: "99", // Invalid tooth number
          hallazgo: "caries",
          caras: ["V"],
        },
      };

      // Act
      const result = processRealtimeToolCall(toolCall);

      // Assert
      expect(result.ambiguities.length).toBeGreaterThan(0);
    });

    it("should handle unknown tool name gracefully", () => {
      // Arrange
      const toolCall = {
        id: "call_123",
        name: "unknown_tool",
        arguments: {},
      };

      // Act
      const result = processRealtimeToolCall(toolCall);

      // Assert
      expect(result.ambiguities.length).toBeGreaterThan(0);
    });

    it("should process pedir_aclaracion tool call", () => {
      // Arrange
      const toolCall = {
        id: "call_123",
        name: "pedir_aclaracion",
        arguments: {
          pregunta: "¿Qué diente?",
        },
      };

      // Act
      const result = processRealtimeToolCall(toolCall);

      // Assert
      // Note: The implementation removes trailing punctuation
      expect(result.ambiguities).toContain("¿Qué diente");
    });
  });

  describe("formatToolResult", () => {
    it("should format successful tool result", () => {
      // Arrange
      const toolCallId = "call_123";
      const result = {
        success: true,
        message: "Tool executed successfully",
      };

      // Act
      const formatted = formatToolResult(toolCallId, result);

      // Assert
      expect(formatted).toEqual({
        type: "client.tool.result",
        tool_call_id: toolCallId,
        result: JSON.stringify(result),
      });
    });

    it("should format error tool result", () => {
      // Arrange
      const toolCallId = "call_123";
      const result = {
        success: false,
        error: "Tool execution failed",
      };

      // Act
      const formatted = formatToolResult(toolCallId, result);

      // Assert
      expect(formatted.type).toBe("client.tool.result");
      expect(formatted.tool_call_id).toBe(toolCallId);
      const parsedResult = JSON.parse(formatted.result);
      expect(parsedResult.success).toBe(false);
      expect(parsedResult.error).toBe("Tool execution failed");
    });

    it("should serialize result as JSON string", () => {
      // Arrange & Act
      const formatted = formatToolResult("call_123", {
        success: true,
        message: "test",
      });

      // Assert
      expect(typeof formatted.result).toBe("string");
      expect(() => JSON.parse(formatted.result)).not.toThrow();
    });
  });

  describe("Tool Coverage", () => {
    it("should support all required dental tools", () => {
      // Arrange
      const realtimeTools = convertToolsForRealtime();
      const toolNames = realtimeTools.map((t) => t.name);
      const requiredTools = [
        "marcar_hallazgo",
        "marcar_tratamiento",
        "anotar_nota",
        "registrar_periodoncia",
        "abrir_seccion",
        "pedir_aclaracion",
      ];

      // Act & Assert
      for (const requiredTool of requiredTools) {
        expect(toolNames).toContain(requiredTool);
      }
    });

    it("should have correct parameter schema for marcar_hallazgo", () => {
      // Arrange & Act
      const realtimeTools = convertToolsForRealtime();
      const marcarHallazgoTool = realtimeTools.find((t) => t.name === "marcar_hallazgo");

      // Assert
      expect(marcarHallazgoTool).toBeDefined();
      expect(marcarHallazgoTool!.parameters.required).toContain("diente");
      expect(marcarHallazgoTool!.parameters.required).toContain("hallazgo");
      expect(marcarHallazgoTool!.parameters.required).toContain("caras");
    });
  });
});
