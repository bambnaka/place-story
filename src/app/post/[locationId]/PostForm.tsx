"use client";

import { useEffect, useRef, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { uploadPostImage, ImageUploadError } from "@/lib/uploadImage";
import { createPost } from "@/lib/posts";
import { getParticipantId } from "@/lib/participant";
import { getCroppedImageFile } from "@/lib/cropImage";
import { recordScan } from "@/lib/scans";

type Status = "idle" | "uploading" | "done" | "error";

const MAX_COMMENT_LENGTH = 80;
const MAX_NICKNAME_LENGTH = 20;
const CROP_ASPECT_RATIO = 16 / 9;

export default function PostForm({
  locationId,
  isFromQr,
}: {
  locationId: string;
  isFromQr: boolean;
}) {
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [rawImageUrl, setRawImageUrl] = useState<string | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isSavingCrop, setIsSavingCrop] = useState(false);

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [nickname, setNickname] = useState("");
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isFromQr) {
      recordScan(locationId, getParticipantId());
      // リロードで再カウントされないよう、記録した直後にURLから目印を消す
      window.history.replaceState(null, "", `/post/${locationId}`);
    }
  }, [locationId, isFromQr]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setRawFile(selected);
    setRawImageUrl(URL.createObjectURL(selected));
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setIsCropping(true);
    setFile(null);
    setPreviewUrl(null);
    setErrorMessage(null);
  }

  function resetForm() {
    setRawFile(null);
    setRawImageUrl(null);
    setIsCropping(false);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setFile(null);
    setPreviewUrl(null);
    setNickname("");
    setComment("");
    setStatus("idle");
    setErrorMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleConfirmCrop() {
    if (!rawImageUrl || !rawFile || !croppedAreaPixels) return;

    setIsSavingCrop(true);
    setErrorMessage(null);
    try {
      const croppedFile = await getCroppedImageFile(
        rawImageUrl,
        croppedAreaPixels,
        rawFile.name,
        rawFile.type || "image/jpeg"
      );
      setFile(croppedFile);
      setPreviewUrl(URL.createObjectURL(croppedFile));
      setIsCropping(false);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "画像の切り抜きに失敗しました。もう一度お試しください。"
      );
    } finally {
      setIsSavingCrop(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setErrorMessage("画像を選択し、表示範囲を決定してください。");
      return;
    }

    setStatus("uploading");
    setErrorMessage(null);

    try {
      const { url, path } = await uploadPostImage(locationId, file);
      const participantId = getParticipantId();
      await createPost(locationId, url, path, comment, nickname, participantId);
      setStatus("done");
    } catch (err) {
      setStatus("error");
      if (err instanceof ImageUploadError) {
        setErrorMessage(err.message);
      } else if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("投稿中に不明なエラーが発生しました。もう一度お試しください。");
      }
    }
  }

  if (status === "done") {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-8 w-8 text-emerald-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900">投稿ありがとうございました</h2>
        <p className="text-sm text-gray-600">
          この場所のモニターに、あなたの投稿が1時間表示されます。
        </p>
        {previewUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt="投稿した画像のプレビュー"
            className="mt-2 w-full max-w-xs rounded-xl object-cover shadow-sm"
          />
        )}
        <button
          type="button"
          onClick={resetForm}
          className="mt-4 rounded-full bg-gray-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-gray-700"
        >
          もう一度投稿する
        </button>
      </div>
    );
  }

  if (isCropping && rawImageUrl) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-sm font-medium text-gray-700">表示範囲を調整してください</p>
          <p className="mt-1 text-xs text-gray-500">
            モニターでは横長で表示されます。ドラッグで位置、スライダーで拡大・縮小できます。
          </p>
        </div>

        <div className="relative h-72 w-full overflow-hidden rounded-xl bg-gray-900">
          <Cropper
            image={rawImageUrl}
            crop={crop}
            zoom={zoom}
            aspect={CROP_ASPECT_RATIO}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
          />
        </div>

        <input
          type="range"
          min={1}
          max={4}
          step={0.01}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="w-full accent-gray-900"
          aria-label="ズーム"
        />

        {errorMessage && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{errorMessage}</p>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={resetForm}
            className="flex-1 rounded-full border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            選び直す
          </button>
          <button
            type="button"
            onClick={handleConfirmCrop}
            disabled={isSavingCrop || !croppedAreaPixels}
            className="flex-1 rounded-full bg-gray-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSavingCrop ? "処理中..." : "この範囲に決定"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div>
        <label
          htmlFor="image"
          className="mb-2 block text-sm font-medium text-gray-700"
        >
          写真
        </label>
        <label
          htmlFor="image"
          className="flex h-40 w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 transition hover:border-gray-400"
        >
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="選択した画像のプレビュー"
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="flex flex-col items-center gap-2 text-gray-500">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-10 w-10"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                />
                <circle cx="12" cy="13" r="3.5" />
              </svg>
              <span className="text-sm">タップして写真を撮る・選ぶ</span>
            </span>
          )}
        </label>
        {previewUrl && rawImageUrl && (
          <button
            type="button"
            onClick={() => setIsCropping(true)}
            className="mt-2 text-xs font-medium text-gray-500 underline underline-offset-2"
          >
            表示範囲を調整し直す
          </button>
        )}
        <input
          ref={fileInputRef}
          id="image"
          name="image"
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      <div>
        <label htmlFor="nickname" className="mb-2 block text-sm font-medium text-gray-700">
          ニックネーム(任意)
        </label>
        <input
          id="nickname"
          name="nickname"
          type="text"
          value={nickname}
          maxLength={MAX_NICKNAME_LENGTH}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="通りすがりの学生 など"
          className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-500 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="comment" className="mb-2 block text-sm font-medium text-gray-700">
          ひとことコメント(任意)
        </label>
        <textarea
          id="comment"
          name="comment"
          value={comment}
          maxLength={MAX_COMMENT_LENGTH}
          onChange={(e) => setComment(e.target.value)}
          placeholder="今この場所で感じたことを一言"
          rows={3}
          className="w-full resize-none rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-500 focus:outline-none"
        />
        <p className="mt-1 text-right text-xs text-gray-400">
          {comment.length}/{MAX_COMMENT_LENGTH}
        </p>
      </div>

      {errorMessage && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{errorMessage}</p>
      )}

      <button
        type="submit"
        disabled={status === "uploading"}
        className="w-full rounded-full bg-gray-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {status === "uploading" ? "投稿中..." : "この場所に投稿する"}
      </button>
    </form>
  );
}
