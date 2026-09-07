import SurveyForm from "./SurveyForm";

export default async function SurveyPage({
  searchParams,
}: {
  searchParams: Promise<{ loc?: string }>;
}) {
  const { loc } = await searchParams;

  return (
    <main className="flex min-h-dvh flex-col bg-gray-100 px-4 py-8 sm:items-center sm:justify-center">
      <div className="mx-auto w-full max-w-lg rounded-2xl bg-white p-6 shadow-sm sm:p-8">
        <SurveyForm locationId={loc ?? null} />
      </div>
    </main>
  );
}
