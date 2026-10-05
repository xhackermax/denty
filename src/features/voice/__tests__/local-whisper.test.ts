import { describe, expect, it, vi } from "vitest";

import { extractWhisperText, transcribeLocally } from "../local-whisper";

describe("local whisper", () => {
  it("joins the text of every chunk", () => {
    expect(extractWhisperText([{ text: " caries en 17 " }, { text: "" }, { text: "y 46" }])).toBe(
      "caries en 17 y 46",
    );
    expect(extractWhisperText({ text: "hola" })).toBe("hola");
  });

  it("decodes the audio and asks for Spanish transcription", async () => {
    const run = vi.fn().mockResolvedValue({ text: "caries en el 17" });
    const samples = new Float32Array(4);
    const text = await transcribeLocally(new Blob(["x"]), {
      loadTranscriber: async () => run,
      decode: async () => samples,
    });
    expect(text).toBe("caries en el 17");
    expect(run).toHaveBeenCalledWith(samples, expect.objectContaining({ language: "spanish" }));
  });

  it("propagates model loading failures", async () => {
    await expect(
      transcribeLocally(new Blob(["x"]), {
        loadTranscriber: async () => {
          throw new Error("offline");
        },
        decode: async () => new Float32Array(1),
      }),
    ).rejects.toThrow("offline");
  });
});
