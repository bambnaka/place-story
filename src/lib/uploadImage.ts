import { v4 as uuidv4 } from "uuid";
import { supabase, POST_IMAGES_BUCKET } from "./supabase";

const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024; // 8MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

export class ImageUploadError extends Error {}

export function validateImageFile(file: File): void {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new ImageUploadError(
      "対応していない画像形式です。JPEG・PNG・WEBP・HEICの画像を選択してください。"
    );
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new ImageUploadError("画像サイズが大きすぎます。8MB以下の画像を選択してください。");
  }
}

export interface UploadedImage {
  url: string;
  path: string;
}

export async function uploadPostImage(locationId: string, file: File): Promise<UploadedImage> {
  validateImageFile(file);

  const extension = file.name.split(".").pop() || "jpg";
  const path = `${locationId}/${uuidv4()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(POST_IMAGES_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });

  if (uploadError) {
    throw new ImageUploadError(`画像のアップロードに失敗しました: ${uploadError.message}`);
  }

  const { data } = supabase.storage.from(POST_IMAGES_BUCKET).getPublicUrl(path);

  if (!data?.publicUrl) {
    throw new ImageUploadError("画像URLの取得に失敗しました。");
  }

  return { url: data.publicUrl, path };
}
