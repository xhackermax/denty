/**
 * Adapter that bridges Vercel AI Gateway Realtime voice with Denty's voice dispatcher
 * Manages model switching and fallbacks between Realtime and Web Speech APIs
 */

import type { UseRealtimeVoiceOptions } from "./use-realtime-voice";

export interface RealtimeVoiceConfig {
  onTranscript: (text: string) => void;
  onError: (error: string) => void;
  onStatusChange?: (status: "connecting" | "listening" | "processing" | "idle" | "error") => void;
}

export class VoiceRealtimeAdapter {
  private config: RealtimeVoiceConfig;
  private currentTranscript = "";
  private isProcessing = false;

  constructor(config: RealtimeVoiceConfig) {
    this.config = config;
  }

  /**
   * Creates options for useRealtimeVoice hook
   * Integrates Realtime output with Denty's voice processing pipeline
   */
  getRealtimeOptions(): UseRealtimeVoiceOptions {
    return {
      onText: (text: string) => {
        // Accumulate text as it streams
        this.currentTranscript += text;
        this.config.onStatusChange?.("processing");
      },
      onTranscript: (fullTranscript: string) => {
        // Full response is ready - process it
        const transcript = (this.currentTranscript || fullTranscript).trim();
        this.currentTranscript = "";

        if (transcript) {
          this.config.onStatusChange?.("idle");
          this.config.onTranscript(transcript);
        }
      },
      onAudio: () => {
        // Audio being played - can show visual feedback
        this.config.onStatusChange?.("processing");
      },
      onError: (error: string) => {
        this.currentTranscript = "";
        this.config.onStatusChange?.("error");
        this.config.onError(error);
      },
    };
  }

  /**
   * Handle connection status changes
   */
  onConnectionChange(connected: boolean) {
    if (connected) {
      this.config.onStatusChange?.("listening");
    } else {
      this.config.onStatusChange?.("idle");
    }
  }

  /**
   * Reset accumulated transcript
   */
  reset() {
    this.currentTranscript = "";
    this.isProcessing = false;
  }
}

/**
 * Utility to check if Realtime API is available (browser support)
 */
export function isRealtimeAvailable(): boolean {
  return typeof WebSocket !== "undefined" && typeof AudioContext !== "undefined";
}

/**
 * Determine which voice engine to use based on browser capabilities
 */
export function selectVoiceEngine(
  realtimeEnabled: boolean = true,
): "realtime" | "web-speech" | "recording" {
  if (realtimeEnabled && isRealtimeAvailable()) {
    return "realtime";
  }

  const hasSpeechRecognition =
    typeof window !== "undefined" &&
    (typeof (window as any).SpeechRecognition !== "undefined" ||
      typeof (window as any).webkitSpeechRecognition !== "undefined");

  if (hasSpeechRecognition) {
    return "web-speech";
  }

  return "recording";
}
