import PostForm from "./PostForm";

export default async function PostPage({
  params,
  searchParams,
}: {
  params: Promise<{ locationId: string }>;
  searchParams: Promise<{ src?: string }>;
}) {
  const { locationId } = await params;
  const { src } = await searchParams;
  const isFromQr = src === "qr";

  return (
    <main className="flex min-h-dvh flex-col bg-gray-100 px-4 py-8 sm:items-center sm:justify-center">
      <div className="mx-auto w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-6 text-center">
          <p className="text-xs font-medium tracking-wide text-gray-400">PLACE STORY</p>
          <h1 className="mt-1 text-lg font-bold text-gray-900">この場所に投稿する</h1>
          <p className="mt-1 text-xs text-gray-400">location: {locationId}</p>
        </div>
        <PostForm locationId={locationId} isFromQr={isFromQr} />
      </div>
    </main>
  );
}
