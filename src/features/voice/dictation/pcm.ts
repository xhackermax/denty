function toInt16(sample: number): number {
  const clipped = Math.max(-1, Math.min(1, sample));
  return Math.round(clipped < 0 ? clipped * 32768 : clipped * 32767);
}

/**
 * Turns microphone float samples into signed 16-bit PCM at a lower rate.
 * Each output sample averages the input samples it replaces, and the state
 * carries across calls so chunk boundaries never change the result.
 */
export function createLinear16Encoder(
  inputRate: number,
  outputRate: number,
): (chunk: Float32Array) => Int16Array {
  if (outputRate > inputRate) {
    throw new RangeError("El audio solo se puede reducir de frecuencia, no aumentar.");
  }
  const ratio = inputRate / outputRate;
  let buffer = new Float32Array(0);
  let bufferStart = 0;
  let produced = 0;

  return (chunk) => {
    const merged = new Float32Array(buffer.length + chunk.length);
    merged.set(buffer);
    merged.set(chunk, buffer.length);
    const output: number[] = [];

    for (;;) {
      const start = Math.floor(produced * ratio);
      const end = Math.max(start + 1, Math.floor((produced + 1) * ratio));
      if (end - bufferStart > merged.length) break;
      let sum = 0;
      for (let index = start; index < end; index += 1) sum += merged[index - bufferStart] ?? 0;
      output.push(toInt16(sum / (end - start)));
      produced += 1;
    }

    const nextStart = Math.floor(produced * ratio);
    buffer = merged.slice(nextStart - bufferStart);
    bufferStart = nextStart;
    return Int16Array.from(output);
  };
}
