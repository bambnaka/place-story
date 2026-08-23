import ScreenView from "./ScreenView";

export default async function ScreenPage({
  params,
}: {
  params: Promise<{ locationId: string }>;
}) {
  const { locationId } = await params;

  return <ScreenView locationId={locationId} />;
}
