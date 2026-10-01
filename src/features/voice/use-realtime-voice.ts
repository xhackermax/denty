"use client";

import { getGatewayRealtimeProtocols } from "@ai-sdk/gateway";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Vercel AI Gateway Realtime WebSocket client
 * Manages bidirectional audio streaming with GPT-Realtime
 */

interface RealtimeAudioDelta {
  type: "server.audio.delta";
  audio: string; // base64-encoded audio
  index?: number;
}

interface RealtimeTextDelta {
  type: "server.text.delta";
  text: string;
  index?: number;
}

interface RealtimeResponseDone {
  type: "server.response.done";
  response: {
    id: string;
    output: Array<{
      type: "text" | "audio";
      text?: string;
      transcript?: string;
    }>;
  };
}

interface RealtimeToolCallCreated {
  type: "server.tool_calls.created";
  tool_calls: Array<{
    id: string;
    type: "function";
    function: {
      name: string;
      arguments: string; // JSON string
    };
  }>;
}

type RealtimeEvent =
  RealtimeAudioDelta | RealtimeTextDelta | RealtimeResponseDone | RealtimeToolCallCreated;

export interface UseRealtimeVoiceOptions {
  onText?: (text: string) => void;
  onTranscript?: (transcript: string) => void;
  onAudio?: (audioBase64: string) => void;
  onError?: (error: string) => void;
  onToolCall?: (toolCall: { id: string; name: string; arguments: Record<string, unknown> }) => void;
}

export function useRealtimeVoice(options: UseRealtimeVoiceOptions = {}) {
  const [connected, setConnected] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const responseBufferRef = useRef<string>("");

  // Acquire audio stream from microphone
  const startAudio = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // Initialize Web Audio API for processing
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioContext = new AudioContextClass();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e: AudioProcessingEvent) => {
        const audioData = e.inputBuffer.getChannelData(0);
        if (!audioData) return;

        const pcm16 = new Int16Array(audioData.length);

        // Convert float32 to int16
        for (let i = 0; i < audioData.length; i++) {
          const value = audioData[i] ?? 0;
          pcm16[i] = Math.max(-1, Math.min(1, value)) < 0 ? value * 0x8000 : value * 0x7fff;
        }

        // Send audio chunk to Realtime API
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          const uint8Array = new Uint8Array(pcm16.buffer);
          const audioBase64 = btoa(String.fromCharCode(...uint8Array));
          wsRef.current.send(
            JSON.stringify({
              type: "client.audio.delta",
              audio: audioBase64,
            }),
          );
        }
      };

      source.connect(processor);
      processor.connect(audioContext.destination);
      setListening(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to access microphone";
      setError(message);
      options.onError?.(message);
    }
  }, [options]);

  // Stop audio capture
  const stopAudio = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    setListening(false);
  }, []);

  // Connect to Vercel AI Gateway Realtime API
  const connect = useCallback(async () => {
    try {
      setError(null);

      // Get session token from server
      const tokenResponse = await fetch("/api/voice/realtime-session", {
        method: "POST",
      });

      if (!tokenResponse.ok) {
        let errorMsg = "No se pudo iniciar la sesión de voz";
        try {
          const errorData = (await tokenResponse.json()) as { error?: string };
          if (errorData.error) {
            errorMsg = errorData.error;
          }
        } catch {
          // Fallback to status-based error message
          if (tokenResponse.status === 401) {
            errorMsg = "Usuario no autenticado";
          } else if (tokenResponse.status === 503) {
            errorMsg = "Servicio de voz no disponible";
          } else if (tokenResponse.status === 429) {
            errorMsg = "Demasiadas solicitudes. Intenta de nuevo más tarde";
          }
        }
        throw new Error(errorMsg);
      }

      const { token, url } = (await tokenResponse.json()) as { token: string; url: string };

      // Connect to AI Gateway Realtime with the official auth subprotocols.
      const ws = new WebSocket(url, getGatewayRealtimeProtocols(token));

      ws.onopen = () => {
        setConnected(true);
        startAudio();
      };

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data) as RealtimeEvent;

        if (message.type === "server.text.delta") {
          responseBufferRef.current += message.text;
          options.onText?.(message.text);
        } else if (message.type === "server.audio.delta") {
          options.onAudio?.(message.audio);
        } else if (message.type === "server.tool_calls.created") {
          // Handle tool calls from the model
          for (const toolCall of message.tool_calls) {
            const args = JSON.parse(toolCall.function.arguments) as Record<string, unknown>;
            options.onToolCall?.({
              id: toolCall.id,
              name: toolCall.function.name,
              arguments: args,
            });
          }
        } else if (message.type === "server.response.done") {
          // Response complete - process accumulated text
          const fullResponse = responseBufferRef.current;
          if (fullResponse) {
            options.onTranscript?.(fullResponse);
          }
          responseBufferRef.current = "";
        }
      };

      ws.onerror = (event) => {
        const errorMsg = "Realtime connection error";
        setError(errorMsg);
        options.onError?.(errorMsg);
      };

      ws.onclose = () => {
        setConnected(false);
        stopAudio();
      };

      wsRef.current = ws;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Connection failed";
      setError(message);
      options.onError?.(message);
    }
  }, [startAudio, stopAudio, options]);

  // Send tool result back to the model
  const submitToolResult = useCallback(
    (toolCallId: string, result: { success: boolean; message?: string; error?: string }) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: "client.tool.result",
            tool_call_id: toolCallId,
            result: JSON.stringify(result),
          }),
        );
      }
    },
    [],
  );

  // Disconnect and cleanup
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    stopAudio();
    setConnected(false);
  }, [stopAudio]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    connected,
    listening,
    error,
    connect,
    disconnect,
    submitToolResult,
  };
}
