"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-gray-100 px-6 text-center">
      <p className="text-xs font-medium tracking-wide text-gray-400">PLACE STORY</p>
      <h1 className="text-lg font-bold text-gray-900">エラーが発生しました</h1>
      <p className="max-w-sm text-sm text-gray-600">{error.message}</p>
      <button
        type="button"
        onClick={reset}
        className="rounded-full bg-gray-900 px-6 py-3 text-sm font-medium text-white hover:bg-gray-700"
      >
        もう一度試す
      </button>
    </main>
  );
}
