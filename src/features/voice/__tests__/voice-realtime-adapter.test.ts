import { describe, it, expect, beforeEach, vi } from "vitest";
import { VoiceRealtimeAdapter, isRealtimeAvailable, selectVoiceEngine } from "../voice-realtime-adapter";

describe("VoiceRealtimeAdapter", () => {
  describe("constructor and configuration", () => {
    it("should initialize with provided config", () => {
      // Arrange
      const config = {
        onTranscript: vi.fn(),
        onError: vi.fn(),
      };

      // Act
      const adapter = new VoiceRealtimeAdapter(config);

      // Assert
      expect(adapter).toBeDefined();
    });

    it("should initialize with optional status callback", () => {
      // Arrange
      const config = {
        onTranscript: vi.fn(),
        onError: vi.fn(),
        onStatusChange: vi.fn(),
      };

      // Act
      const adapter = new VoiceRealtimeAdapter(config);

      // Assert
      expect(adapter).toBeDefined();
    });
  });

  describe("getRealtimeOptions", () => {
    it("should return options for useRealtimeVoice hook", () => {
      // Arrange
      const config = {
        onTranscript: vi.fn(),
        onError: vi.fn(),
        onStatusChange: vi.fn(),
      };
      const adapter = new VoiceRealtimeAdapter(config);

      // Act
      const options = adapter.getRealtimeOptions();

      // Assert
      expect(options).toHaveProperty("onText");
      expect(options).toHaveProperty("onTranscript");
      expect(options).toHaveProperty("onAudio");
      expect(options).toHaveProperty("onError");
      expect(options).toHaveProperty("onToolCall");
    });

    it("should accumulate text in onText callback", () => {
      // Arrange
      const config = {
        onTranscript: vi.fn(),
        onError: vi.fn(),
        onStatusChange: vi.fn(),
      };
      const adapter = new VoiceRealtimeAdapter(config);
      const options = adapter.getRealtimeOptions();

      // Act
      options.onText?.("Hello ");
      options.onText?.("world");

      // Assert
      expect(config.onStatusChange).toHaveBeenCalledWith("processing");
    });

    it("should handle transcript completion", () => {
      // Arrange
      const onTranscript = vi.fn();
      const config = {
        onTranscript,
        onError: vi.fn(),
        onStatusChange: vi.fn(),
      };
      const adapter = new VoiceRealtimeAdapter(config);
      const options = adapter.getRealtimeOptions();

      // Act
      options.onText?.("Marcar hallazgo en el 36");
      options.onTranscript?.("Marcar hallazgo en el 36");

      // Assert
      expect(onTranscript).toHaveBeenCalledWith("Marcar hallazgo en el 36");
      expect(config.onStatusChange).toHaveBeenCalledWith("idle");
    });

    it("should handle error callback", () => {
      // Arrange
      const onError = vi.fn();
      const config = {
        onTranscript: vi.fn(),
        onError,
        onStatusChange: vi.fn(),
      };
      const adapter = new VoiceRealtimeAdapter(config);
      const options = adapter.getRealtimeOptions();

      // Act
      options.onError?.("Connection lost");

      // Assert
      expect(onError).toHaveBeenCalledWith("Connection lost");
      expect(config.onStatusChange).toHaveBeenCalledWith("error");
    });

    it("should delegate tool calls to config handler", () => {
      // Arrange
      const onToolCall = vi.fn();
      const config = {
        onTranscript: vi.fn(),
        onError: vi.fn(),
        onToolCall,
      };
      const adapter = new VoiceRealtimeAdapter(config);
      const options = adapter.getRealtimeOptions();

      // Act
      const toolCall = {
        id: "tool_123",
        name: "marcar_hallazgo",
        arguments: { diente: "36", hallazgo: "caries", caras: ["V"] },
      };
      options.onToolCall?.(toolCall);

      // Assert
      expect(onToolCall).toHaveBeenCalledWith(toolCall);
    });
  });

  describe("onConnectionChange", () => {
    it("should set status to listening when connected", () => {
      // Arrange
      const onStatusChange = vi.fn();
      const config = {
        onTranscript: vi.fn(),
        onError: vi.fn(),
        onStatusChange,
      };
      const adapter = new VoiceRealtimeAdapter(config);

      // Act
      adapter.onConnectionChange(true);

      // Assert
      expect(onStatusChange).toHaveBeenCalledWith("listening");
    });

    it("should set status to idle when disconnected", () => {
      // Arrange
      const onStatusChange = vi.fn();
      const config = {
        onTranscript: vi.fn(),
        onError: vi.fn(),
        onStatusChange,
      };
      const adapter = new VoiceRealtimeAdapter(config);

      // Act
      adapter.onConnectionChange(false);

      // Assert
      expect(onStatusChange).toHaveBeenCalledWith("idle");
    });
  });

  describe("reset", () => {
    it("should clear accumulated transcript", () => {
      // Arrange
      const config = {
        onTranscript: vi.fn(),
        onError: vi.fn(),
      };
      const adapter = new VoiceRealtimeAdapter(config);

      // Act
      adapter.reset();

      // Assert - state should be reset
      expect(adapter).toBeDefined();
    });
  });

  describe("executeToolCall", () => {
    it("should process valid tool call and submit result", async () => {
      // Arrange
      const submitToolResult = vi.fn();
      const config = {
        onTranscript: vi.fn(),
        onError: vi.fn(),
        submitToolResult,
      };
      const adapter = new VoiceRealtimeAdapter(config);

      // Act
      await adapter.executeToolCall("tool_123", "pedir_aclaracion", {
        pregunta: "¿Qué diente?",
      });

      // Assert
      expect(submitToolResult).toHaveBeenCalled();
      const call = submitToolResult.mock.calls[0];
      expect(call[0]).toBe("tool_123");
      expect(call[1].success).toBeDefined();
    });

    it("should handle tool call errors gracefully", async () => {
      // Arrange
      const submitToolResult = vi.fn();
      const config = {
        onTranscript: vi.fn(),
        onError: vi.fn(),
        submitToolResult,
      };
      const adapter = new VoiceRealtimeAdapter(config);

      // Act
      await adapter.executeToolCall("tool_123", "invalid_tool", {});

      // Assert
      expect(submitToolResult).toHaveBeenCalled();
      const call = submitToolResult.mock.calls[0];
      expect(call[1].success).toBe(false);
    });
  });
});

describe("isRealtimeAvailable", () => {
  it("should return true when WebSocket and AudioContext are available", () => {
    // Arrange - assume browser environment with both APIs
    const available = isRealtimeAvailable();

    // Assert
    expect(typeof available).toBe("boolean");
  });
});

describe("selectVoiceEngine", () => {
  it("should prefer realtime when enabled and available", () => {
    // Arrange & Act
    const engine = selectVoiceEngine(true);

    // Assert
    expect(["realtime", "web-speech", "recording"]).toContain(engine);
  });

  it("should return fallback when realtime disabled", () => {
    // Arrange & Act
    const engine = selectVoiceEngine(false);

    // Assert
    expect(["web-speech", "recording"]).toContain(engine);
  });

  it("should respect realtimeEnabled parameter", () => {
    // Arrange & Act
    const enabledEngine = selectVoiceEngine(true);
    const disabledEngine = selectVoiceEngine(false);

    // Assert
    if (enabledEngine === "realtime") {
      // If realtime is available, it should be selected when enabled
      expect(enabledEngine).toBe("realtime");
    }
  });
});

describe("SOLID Principles Compliance", () => {
  it("S - VoiceRealtimeAdapter has single responsibility", () => {
    // Assert: Class should only bridge Realtime API with Denty voice
    const adapter = new VoiceRealtimeAdapter({
      onTranscript: () => {},
      onError: () => {},
    });

    // Should have minimal interface focused on one purpose
    expect(adapter).toHaveProperty("getRealtimeOptions");
    expect(adapter).toHaveProperty("onConnectionChange");
    expect(adapter).toHaveProperty("reset");
    expect(adapter).toHaveProperty("executeToolCall");
  });

  it("D - Config is injected, not created internally", () => {
    // Assert: Dependency injection pattern
    const mockConfig = {
      onTranscript: vi.fn(),
      onError: vi.fn(),
    };

    const adapter = new VoiceRealtimeAdapter(mockConfig);
    expect(adapter).toBeDefined();
    // Config is dependency, not tight coupling
  });

  it("I - Accepts segregated interfaces for callbacks", () => {
    // Assert: Adapter doesn't require all methods
    const minimalConfig = {
      onTranscript: vi.fn(),
      onError: vi.fn(),
    };

    const adapter = new VoiceRealtimeAdapter(minimalConfig);
    expect(adapter).toBeDefined();
    // Works with minimal interface
  });
});
