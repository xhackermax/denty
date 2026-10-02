// Denty: copies microphone samples off the audio thread in ~43 ms batches.
// Served as a static file because the Content-Security-Policy blocks blob: worklets.
const BATCH_SIZE = 2048;

class DentyPcmCapture extends AudioWorkletProcessor {
  constructor() {
    super();
    this.batch = new Float32Array(BATCH_SIZE);
    this.filled = 0;
  }

  process(inputs) {
    const channel = inputs[0] && inputs[0][0];
    if (!channel) return true;
    let offset = 0;
    while (offset < channel.length) {
      const count = Math.min(channel.length - offset, BATCH_SIZE - this.filled);
      this.batch.set(channel.subarray(offset, offset + count), this.filled);
      this.filled += count;
      offset += count;
      if (this.filled === BATCH_SIZE) {
        this.port.postMessage(this.batch);
        this.batch = new Float32Array(BATCH_SIZE);
        this.filled = 0;
      }
    }
    return true;
  }
}

registerProcessor("denty-pcm-capture", DentyPcmCapture);
