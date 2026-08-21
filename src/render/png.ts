import { isValidPngExportSize } from "../model/project";
import type { PictogramProject } from "../model/types";
import { renderSvgDocument } from "./svg";

export class PngRenderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PngRenderError";
  }
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new PngRenderError("SVG画像を読み込めませんでした。"));
    image.src = source;
  });
}

function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new PngRenderError("PNGデータを生成できませんでした。"));
      }
    }, "image/png");
  });
}

export async function renderPngBlob(
  project: PictogramProject,
  size = project.pngSize,
): Promise<Blob> {
  if (!isValidPngExportSize(size)) {
    throw new RangeError("PNG size is outside the supported range.");
  }

  if (typeof document === "undefined" || typeof Image === "undefined") {
    throw new PngRenderError("PNG出力にはブラウザ環境が必要です。");
  }

  const svg = renderSvgDocument(project, { size });
  const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const objectUrl = URL.createObjectURL(svgBlob);

  try {
    const image = await loadImage(objectUrl);
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");

    if (!context) {
      throw new PngRenderError("Canvasを初期化できませんでした。");
    }

    context.clearRect(0, 0, size, size);
    context.drawImage(image, 0, 0, size, size);
    return await canvasToPngBlob(canvas);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
