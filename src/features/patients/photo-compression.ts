/**
 * Patient photos are only used to recognise the patient (avatar and record
 * header), so they are stored small: at most 512 px on the longest side and
 * lossy WebP (JPEG where the browser cannot encode WebP). A phone photo of
 * several MB ends up around 20–60 KB.
 */
export const PATIENT_PHOTO_MAX_SIDE = 512;
export const PATIENT_PHOTO_QUALITY = 0.72;
export const PATIENT_PHOTO_MAX_BYTES = 1024 * 1024;

export function scaledPhotoSize(
  width: number,
  height: number,
  maxSide = PATIENT_PHOTO_MAX_SIDE,
): { width: number; height: number } {
  if (width <= 0 || height <= 0) return { width: 0, height: 0 };
  const scale = Math.min(1, maxSide / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

type PhotoSource = HTMLVideoElement | ImageBitmap;

function sourceSize(source: PhotoSource): { width: number; height: number } {
  return source instanceof HTMLVideoElement
    ? { width: source.videoWidth, height: source.videoHeight }
    : { width: source.width, height: source.height };
}

function encode(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, PATIENT_PHOTO_QUALITY));
}

async function compressSource(source: PhotoSource): Promise<File> {
  const size = scaledPhotoSize(sourceSize(source).width, sourceSize(source).height);
  if (!size.width) throw new Error("La imagen está vacía.");
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("El navegador no puede procesar imágenes.");
  context.imageSmoothingQuality = "high";
  context.drawImage(source, 0, 0, size.width, size.height);
  // Browsers that cannot encode WebP silently return PNG, which would be larger.
  let blob = await encode(canvas, "image/webp");
  if (!blob || blob.type !== "image/webp") blob = await encode(canvas, "image/jpeg");
  if (!blob) throw new Error("No se pudo comprimir la foto.");
  const extension = blob.type === "image/webp" ? "webp" : "jpg";
  return new File([blob], `paciente-${Date.now()}.${extension}`, { type: blob.type });
}

export function compressVideoFrame(video: HTMLVideoElement): Promise<File> {
  return compressSource(video);
}

export async function compressPhotoFile(file: Blob): Promise<File> {
  // "from-image" applies the EXIF orientation of phone pictures before resizing.
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    return await compressSource(bitmap);
  } finally {
    bitmap.close();
  }
}
