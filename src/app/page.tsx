export default function Home() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-gray-100 px-6 text-center">
      <p className="text-xs font-medium tracking-wide text-gray-400">PLACE STORY</p>
      <h1 className="text-2xl font-bold text-gray-900">リアルな場に残るデジタル伝言板</h1>
      <p className="max-w-md text-sm text-gray-600">
        このアプリは修士研究のプロトタイプです。各場所に設置されたQRコードから
        <code className="mx-1 rounded bg-gray-200 px-1.5 py-0.5 text-xs">/post/[locationId]</code>
        へアクセスして投稿し、
        <code className="mx-1 rounded bg-gray-200 px-1.5 py-0.5 text-xs">/screen/[locationId]</code>
        のモニターに24時間限定で表示されます。
      </p>
      <p className="text-xs text-gray-400">
        管理画面は <code className="rounded bg-gray-200 px-1.5 py-0.5">/admin</code> です。
      </p>
    </main>
  );
}
