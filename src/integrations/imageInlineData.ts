export const HERMES_INLINE_IMAGE_MAX_BYTES = 900_000;
export const HERMES_INLINE_IMAGE_MAX_REQUEST_BYTES = 700_000;

type CompressionPlan = {
  maxEdge: number;
  quality: number;
};

export function estimateDataUrlBytes(dataUrl: string) {
  const base64 = dataUrl.split(",", 2)[1] ?? "";
  return Math.floor((base64.length * 3) / 4);
}

export function estimateDataUrlRequestBytes(dataUrl: string) {
  return dataUrl.length;
}

export function needsHermesImageCompression(
  dataUrl: string,
  maxBytes = HERMES_INLINE_IMAGE_MAX_BYTES,
  maxRequestBytes = HERMES_INLINE_IMAGE_MAX_REQUEST_BYTES
) {
  return estimateDataUrlBytes(dataUrl) > maxBytes || estimateDataUrlRequestBytes(dataUrl) > maxRequestBytes;
}

export function nextCompressionPlan(plan: CompressionPlan): CompressionPlan | undefined {
  if (plan.maxEdge <= 512 && plan.quality <= 0.5) return undefined;
  if (plan.maxEdge >= 1280) return { maxEdge: 1024, quality: 0.64 };
  if (plan.maxEdge >= 1024) return { maxEdge: 896, quality: 0.58 };
  if (plan.maxEdge >= 896) return { maxEdge: 768, quality: 0.54 };
  if (plan.maxEdge >= 768) return { maxEdge: 640, quality: 0.5 };
  return { maxEdge: 512, quality: 0.5 };
}

function readBlobAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read image data"));
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("Image data URL read returned no text result"));
    };
    reader.readAsDataURL(blob);
  });
}

function isHeicLike(file: File) {
  return /image\/hei[cf]/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onerror = () => reject(new Error("Browser could not decode image for compression"));
    image.onload = () => resolve(image);
    image.src = dataUrl;
  });
}

async function compressReadableImageDataUrl(dataUrl: string, plan: CompressionPlan) {
  const image = await loadImage(dataUrl);
  const scale = Math.min(1, plan.maxEdge / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Browser could not create canvas context for compression");
  context.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", plan.quality);
}

export async function prepareHermesInlineImageDataUrl(file: File) {
  const sourceBlob = isHeicLike(file)
    ? await import("heic-to").then((module) => module.heicTo({ blob: file, type: "image/jpeg", quality: 0.72 }))
    : file;
  const blob = Array.isArray(sourceBlob) ? sourceBlob[0] : sourceBlob;
  let dataUrl = await readBlobAsDataUrl(blob);

  let plan: CompressionPlan | undefined = { maxEdge: 1280, quality: 0.72 };
  while (needsHermesImageCompression(dataUrl) && plan) {
    dataUrl = await compressReadableImageDataUrl(dataUrl, plan);
    plan = nextCompressionPlan(plan);
  }

  return dataUrl;
}
