export interface WakeWordEngine {
  start(): Promise<void>;
  stop(): Promise<void>;
  onWake(callback: () => void): () => void;
  readonly running: boolean;
}

export class NullWakeWordEngine implements WakeWordEngine {
  readonly running = false;
  async start(): Promise<void> {}
  async stop(): Promise<void> {}
  onWake(): () => void {
    return () => undefined;
  }
}
