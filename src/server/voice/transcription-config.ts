export function gatewayTranscriptionModel(model: string): string {
  return model.includes("/") ? model : `openai/${model}`;
}
