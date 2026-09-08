"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  fetchAllSurveyResponses,
  deleteSurveyResponse,
  tally,
  AFFILIATION_CATEGORIES,
  PARTICIPATION_OPTIONS,
  PRESENCE_FEELING_OPTIONS,
  MOTIVATION_OPTIONS,
  EASE_OPTIONS,
  OTHER,
  type SurveyResponseRow,
} from "@/lib/survey";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Bars({
  counts,
  order,
  total,
}: {
  counts: Map<string, number>;
  order: string[];
  total: number;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      {order.map((option) => {
        const count = counts.get(option) ?? 0;
        const percent = total > 0 ? (count / total) * 100 : 0;
        return (
          <div key={option}>
            <div className="flex items-center justify-between gap-2 text-sm text-gray-700">
              <span>{option}</span>
              <span className="font-bold text-gray-900">{count}</span>
            </div>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-gray-900 transition-all duration-500"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FreeTextList({
  items,
}: {
  items: { text: string; date: string; location: string | null }[];
}) {
  if (items.length === 0) {
    return <p className="text-sm text-gray-400">回答なし</p>;
  }
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item, i) => (
        <li key={i} className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-700">
          <p className="whitespace-pre-wrap">{item.text}</p>
          <p className="mt-1 text-xs text-gray-400">
            {formatDateTime(item.date)}
            {item.location ? ` · ${item.location}` : ""}
          </p>
        </li>
      ))}
    </ul>
  );
}

export default function AdminSurveyPage() {
  const [responses, setResponses] = useState<SurveyResponseRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  async function load() {
    setIsLoading(true);
    try {
      const data = await fetchAllSurveyResponses();
      setResponses(data);
      setErrorMessage(null);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "アンケート結果の取得に失敗しました。");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  async function handleDelete(id: string) {
    const confirmed = window.confirm(
      "この回答を完全に削除します。この操作は取り消せません。本当によろしいですか?"
    );
    if (!confirmed) return;

    setPendingDeleteId(id);
    try {
      await deleteSurveyResponse(id);
      setResponses((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "削除に失敗しました。");
    } finally {
      setPendingDeleteId(null);
    }
  }

  const total = responses.length;

  const affiliationCounts = useMemo(
    () => tally(responses.map((r) => r.affiliation_category)),
    [responses]
  );
  const affiliationOtherTexts = useMemo(
    () =>
      responses
        .filter((r) => r.affiliation_category === OTHER && r.affiliation_other)
        .map((r) => ({
          text: r.affiliation_other as string,
          date: r.created_at,
          location: r.location_id,
        })),
    [responses]
  );

  const participationCounts = useMemo(
    () => tally(responses.flatMap((r) => r.answers.participation ?? [])),
    [responses]
  );

  const presenceFeelingCounts = useMemo(
    () => tally(responses.map((r) => r.answers.presenceFeeling)),
    [responses]
  );
  const presenceFeelingOtherTexts = useMemo(
    () =>
      responses
        .filter((r) => r.answers.presenceFeeling === OTHER && r.answers.presenceFeelingOther)
        .map((r) => ({
          text: r.answers.presenceFeelingOther,
          date: r.created_at,
          location: r.location_id,
        })),
    [responses]
  );
  const presenceReasons = useMemo(
    () =>
      responses
        .filter((r) => r.answers.presenceReason)
        .map((r) => ({
          text: r.answers.presenceReason,
          date: r.created_at,
          location: r.location_id,
        })),
    [responses]
  );

  const motivationCounts = useMemo(
    () => tally(responses.flatMap((r) => r.answers.motivation ?? [])),
    [responses]
  );
  const motivationOtherTexts = useMemo(
    () =>
      responses
        .filter((r) => r.answers.motivation?.includes(OTHER) && r.answers.motivationOther)
        .map((r) => ({
          text: r.answers.motivationOther,
          date: r.created_at,
          location: r.location_id,
        })),
    [responses]
  );

  const easeCounts = useMemo(
    () => tally(responses.map((r) => r.answers.easeOfPosting)),
    [responses]
  );
  const easeOtherTexts = useMemo(
    () =>
      responses
        .filter((r) => r.answers.easeOfPosting === OTHER && r.answers.easeOfPostingOther)
        .map((r) => ({
          text: r.answers.easeOfPostingOther,
          date: r.created_at,
          location: r.location_id,
        })),
    [responses]
  );
  const easeReasons = useMemo(
    () =>
      responses
        .filter((r) => r.answers.easeReason)
        .map((r) => ({ text: r.answers.easeReason, date: r.created_at, location: r.location_id })),
    [responses]
  );

  const feedbacks = useMemo(
    () =>
      responses
        .filter((r) => r.answers.feedback)
        .map((r) => ({ text: r.answers.feedback, date: r.created_at, location: r.location_id })),
    [responses]
  );

  return (
    <main className="min-h-dvh bg-gray-100 px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <Link href="/admin" className="text-xs font-medium text-gray-500 underline">
          ← 管理画面へ
        </Link>
        <h1 className="mt-2 text-xl font-bold text-gray-900">アンケート結果</h1>
        <p className="mt-1 text-sm text-gray-500">
          `/survey` に集まった回答を設問ごとに集計しています。
        </p>

        {errorMessage && (
          <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
            {errorMessage}
          </p>
        )}

        {isLoading ? (
          <p className="mt-8 text-sm text-gray-500">読み込み中...</p>
        ) : total === 0 ? (
          <p className="mt-8 text-sm text-gray-500">まだ回答がありません。</p>
        ) : (
          <div className="mt-6 flex flex-col gap-6">
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <p className="text-xs text-gray-500">総回答数</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{total}</p>
            </div>

            <section className="rounded-2xl bg-white p-5 shadow-sm">
              <h2 className="text-sm font-bold text-gray-900">個別の回答(削除できます)</h2>
              <ul className="mt-3 flex flex-col gap-3">
                {responses.map((r) => (
                  <li key={r.id} className="rounded-xl border border-gray-100 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
                        <span>{formatDateTime(r.created_at)}</span>
                        {r.location_id && <span>· {r.location_id}</span>}
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 font-medium text-gray-600">
                          {r.affiliation_category}
                          {r.affiliation_other ? `(${r.affiliation_other})` : ""}
                        </span>
                      </div>
                      <button
                        type="button"
                        disabled={pendingDeleteId === r.id}
                        onClick={() => handleDelete(r.id)}
                        className="shrink-0 rounded-full border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        {pendingDeleteId === r.id ? "削除中..." : "削除"}
                      </button>
                    </div>
                    <dl className="mt-3 flex flex-col gap-1.5 text-sm text-gray-700">
                      <div>
                        <dt className="text-xs text-gray-400">関わり方</dt>
                        <dd>{r.answers.participation?.join("・") || "(未回答)"}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-gray-400">他者の存在を感じたか</dt>
                        <dd>
                          {r.answers.presenceFeeling}
                          {r.answers.presenceFeelingOther
                            ? `(${r.answers.presenceFeelingOther})`
                            : ""}
                          {r.answers.presenceReason ? ` — ${r.answers.presenceReason}` : ""}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-gray-400">投稿のモチベーション</dt>
                        <dd>
                          {r.answers.motivation?.join("・") || "(未回答)"}
                          {r.answers.motivationOther ? `(${r.answers.motivationOther})` : ""}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-gray-400">SNSとの比較</dt>
                        <dd>
                          {r.answers.easeOfPosting}
                          {r.answers.easeOfPostingOther
                            ? `(${r.answers.easeOfPostingOther})`
                            : ""}
                          {r.answers.easeReason ? ` — ${r.answers.easeReason}` : ""}
                        </dd>
                      </div>
                      {r.answers.feedback && (
                        <div>
                          <dt className="text-xs text-gray-400">感想</dt>
                          <dd className="whitespace-pre-wrap">{r.answers.feedback}</dd>
                        </div>
                      )}
                    </dl>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-2xl bg-white p-5 shadow-sm">
              <h2 className="text-sm font-bold text-gray-900">あなたの所属はどこですか？</h2>
              <div className="mt-3">
                <Bars counts={affiliationCounts} order={[...AFFILIATION_CATEGORIES]} total={total} />
              </div>
              {affiliationOtherTexts.length > 0 && (
                <div className="mt-3">
                  <p className="mb-2 text-xs font-medium text-gray-500">その他の内訳</p>
                  <FreeTextList items={affiliationOtherTexts} />
                </div>
              )}
            </section>

            <section className="rounded-2xl bg-white p-5 shadow-sm">
              <h2 className="text-sm font-bold text-gray-900">
                今回の体験で、どのように関わりましたか？(複数選択可)
              </h2>
              <div className="mt-3">
                <Bars counts={participationCounts} order={PARTICIPATION_OPTIONS} total={total} />
              </div>
            </section>

            <section className="rounded-2xl bg-white p-5 shadow-sm">
              <h2 className="text-sm font-bold text-gray-900">
                モニターの投稿を見て、この場所にいた他の人の存在を感じましたか？
              </h2>
              <div className="mt-3">
                <Bars
                  counts={presenceFeelingCounts}
                  order={[...PRESENCE_FEELING_OPTIONS, OTHER]}
                  total={total}
                />
              </div>
              {presenceFeelingOtherTexts.length > 0 && (
                <div className="mt-3">
                  <p className="mb-2 text-xs font-medium text-gray-500">その他の内訳</p>
                  <FreeTextList items={presenceFeelingOtherTexts} />
                </div>
              )}
            </section>

            <section className="rounded-2xl bg-white p-5 shadow-sm">
              <h2 className="text-sm font-bold text-gray-900">
                どんなところで他の人の存在を感じましたか?(自由記述)
              </h2>
              <div className="mt-3">
                <FreeTextList items={presenceReasons} />
              </div>
            </section>

            <section className="rounded-2xl bg-white p-5 shadow-sm">
              <h2 className="text-sm font-bold text-gray-900">
                どんなモチベーションで投稿しましたか？(複数回答可)
              </h2>
              <div className="mt-3">
                <Bars
                  counts={motivationCounts}
                  order={[...MOTIVATION_OPTIONS, OTHER]}
                  total={total}
                />
              </div>
              {motivationOtherTexts.length > 0 && (
                <div className="mt-3">
                  <p className="mb-2 text-xs font-medium text-gray-500">その他の内訳</p>
                  <FreeTextList items={motivationOtherTexts} />
                </div>
              )}
            </section>

            <section className="rounded-2xl bg-white p-5 shadow-sm">
              <h2 className="text-sm font-bold text-gray-900">
                普段使っているSNSへの投稿と比べて投稿のしやすさはどうでしたか？
              </h2>
              <div className="mt-3">
                <Bars counts={easeCounts} order={[...EASE_OPTIONS, OTHER]} total={total} />
              </div>
              {easeOtherTexts.length > 0 && (
                <div className="mt-3">
                  <p className="mb-2 text-xs font-medium text-gray-500">その他の内訳</p>
                  <FreeTextList items={easeOtherTexts} />
                </div>
              )}
            </section>

            <section className="rounded-2xl bg-white p-5 shadow-sm">
              <h2 className="text-sm font-bold text-gray-900">その理由(自由記述)</h2>
              <div className="mt-3">
                <FreeTextList items={easeReasons} />
              </div>
            </section>

            <section className="rounded-2xl bg-white p-5 shadow-sm">
              <h2 className="text-sm font-bold text-gray-900">
                今回の体験について、よかった点・気になった点・改善してほしい点(自由記述)
              </h2>
              <div className="mt-3">
                <FreeTextList items={feedbacks} />
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
