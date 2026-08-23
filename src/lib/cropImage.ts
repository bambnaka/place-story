export interface CropPixelArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (err) => reject(err));
    image.src = url;
  });
}

export async function getCroppedImageFile(
  imageSrc: string,
  cropPixels: CropPixelArea,
  fileName: string,
  mimeType: string
): Promise<File> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(cropPixels.width);
  canvas.height = Math.round(cropPixels.height);
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("画像の切り抜き処理に失敗しました。");
  }

  ctx.drawImage(
    image,
    cropPixels.x,
    cropPixels.y,
    cropPixels.width,
    cropPixels.height,
    0,
    0,
    canvas.width,
    canvas.height
  );

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, mimeType, 0.92);
  });

  if (!blob) {
    throw new Error("画像の切り抜きに失敗しました。もう一度お試しください。");
  }

  return new File([blob], fileName, { type: mimeType });
}
