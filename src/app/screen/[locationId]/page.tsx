import ScreenView from "./ScreenView";

export default async function ScreenPage({
  params,
  searchParams,
}: {
  params: Promise<{ locationId: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const { locationId } = await params;
  const { mode } = await searchParams;

  // 既定は投稿の実験(前回のUI)。?mode=survey でアンケート用の表示になる
  return <ScreenView locationId={locationId} mode={mode === "survey" ? "survey" : "post"} />;
}
