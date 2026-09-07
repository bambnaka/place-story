"use client";

import { useState } from "react";
import {
  submitSurveyResponse,
  OTHER,
  PARTICIPATION_OPTIONS,
  PRESENCE_FEELING_OPTIONS,
  MOTIVATION_OPTIONS,
  EASE_OPTIONS,
  type AffiliationCategory,
  type SurveyAnswers,
} from "@/lib/survey";

const AFFILIATION_OPTIONS: AffiliationCategory[] = [
  "環境デザイン研究室",
  "コミュニケーションデザイン研究室",
  "その他",
];

type Status = "idle" | "submitting" | "done" | "error";

function toggleInArray(arr: string[], value: string): string[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

const inputClass =
  "mt-2 w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-500 focus:outline-none";
const textareaClass =
  "w-full resize-none rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-500 focus:outline-none";
const labelClass = "flex items-center gap-2 text-sm text-gray-700";
const questionClass = "mb-2 text-sm font-medium text-gray-700";

export default function SurveyForm({ locationId }: { locationId: string | null }) {
  const [affiliation, setAffiliation] = useState<AffiliationCategory | "">("");
  const [affiliationOther, setAffiliationOther] = useState("");

  const [participation, setParticipation] = useState<string[]>([]);

  const [presenceFeeling, setPresenceFeeling] = useState("");
  const [presenceFeelingOther, setPresenceFeelingOther] = useState("");
  const [presenceReason, setPresenceReason] = useState("");

  const [motivation, setMotivation] = useState<string[]>([]);
  const [motivationOther, setMotivationOther] = useState("");

  const [easeOfPosting, setEaseOfPosting] = useState("");
  const [easeOfPostingOther, setEaseOfPostingOther] = useState("");
  const [easeReason, setEaseReason] = useState("");

  const [feedback, setFeedback] = useState("");

  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (
      !affiliation ||
      participation.length === 0 ||
      !presenceFeeling ||
      !presenceReason.trim() ||
      motivation.length === 0 ||
      !easeOfPosting ||
      !easeReason.trim() ||
      !feedback.trim()
    ) {
      setErrorMessage("回答されていない必須項目(*)があります。ご確認ください。");
      return;
    }

    setStatus("submitting");
    setErrorMessage(null);

    const answers: SurveyAnswers = {
      participation,
      presenceFeeling,
      presenceFeelingOther,
      presenceReason: presenceReason.trim(),
      motivation,
      motivationOther,
      easeOfPosting,
      easeOfPostingOther,
      easeReason: easeReason.trim(),
      feedback: feedback.trim(),
    };

    try {
      await submitSurveyResponse({
        locationId,
        affiliationCategory: affiliation,
        affiliationOther,
        answers,
      });
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof Error ? err.message : "送信に失敗しました。もう一度お試しください。"
      );
    }
  }

  if (status === "done") {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
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
        <h2 className="text-xl font-bold text-gray-900">ご回答ありがとうございました</h2>
        <p className="text-sm text-gray-600">貴重なご意見、研究に活用させていただきます。</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8">
      <div className="text-center">
        <p className="text-xs font-medium tracking-wide text-gray-400">PLACE STORY</p>
        <h1 className="mt-1 text-lg font-bold text-gray-900">アンケート</h1>
        <p className="mt-3 text-sm leading-relaxed text-gray-600">
          2週間にわたる実験へのご参加ありがとうございました。大きく4つの設問をご用意いたしました。実際に投稿していない方もぜひお答えください！
        </p>
      </div>

      {/* はじめに */}
      <section className="flex flex-col gap-5">
        <h2 className="text-sm font-bold text-gray-900">はじめに🙇</h2>

        <div>
          <p className={questionClass}>
            あなたの所属はどこですか？<span className="text-red-500"> *</span>
          </p>
          <div className="flex flex-col gap-2">
            {AFFILIATION_OPTIONS.map((option) => (
              <label key={option} className={labelClass}>
                <input
                  type="radio"
                  name="affiliation"
                  className="accent-gray-900"
                  checked={affiliation === option}
                  onChange={() => setAffiliation(option)}
                />
                {option}
              </label>
            ))}
          </div>
          {affiliation === OTHER && (
            <input
              type="text"
              value={affiliationOther}
              onChange={(e) => setAffiliationOther(e.target.value)}
              placeholder="所属を入力"
              className={inputClass}
            />
          )}
        </div>

        <div>
          <p className={questionClass}>
            あなたは今回の体験で、どのように関わりましたか？(複数選択可)
            <span className="text-red-500"> *</span>
          </p>
          <div className="flex flex-col gap-2">
            {PARTICIPATION_OPTIONS.map((option) => (
              <label key={option} className={labelClass}>
                <input
                  type="checkbox"
                  className="accent-gray-900"
                  checked={participation.includes(option)}
                  onChange={() => setParticipation((prev) => toggleInArray(prev, option))}
                />
                {option}
              </label>
            ))}
          </div>
        </div>
      </section>

      {/* 他の人の投稿について */}
      <section className="flex flex-col gap-5 border-t border-gray-100 pt-6">
        <div>
          <h2 className="text-sm font-bold text-gray-900">他の人の投稿について👥</h2>
          <p className="mt-1 text-xs text-gray-500">
            他の人の投稿を見ていない人はその他で「見ていない」と回答してください。
          </p>
        </div>

        <div>
          <p className={questionClass}>
            モニターの投稿を見て、この場所にいた他の人の存在を感じましたか？
            <span className="text-red-500"> *</span>
          </p>
          <div className="flex flex-col gap-2">
            {PRESENCE_FEELING_OPTIONS.map((option) => (
              <label key={option} className={labelClass}>
                <input
                  type="radio"
                  name="presenceFeeling"
                  className="accent-gray-900"
                  checked={presenceFeeling === option}
                  onChange={() => setPresenceFeeling(option)}
                />
                {option}
              </label>
            ))}
            <label className={labelClass}>
              <input
                type="radio"
                name="presenceFeeling"
                className="accent-gray-900"
                checked={presenceFeeling === OTHER}
                onChange={() => setPresenceFeeling(OTHER)}
              />
              その他
            </label>
          </div>
          {presenceFeeling === OTHER && (
            <input
              type="text"
              value={presenceFeelingOther}
              onChange={(e) => setPresenceFeelingOther(e.target.value)}
              placeholder="回答を入力"
              className={inputClass}
            />
          )}
        </div>

        <div>
          <p className={questionClass}>
            どんなところで他の人の存在を感じましたか？または、なぜ感じなかったのですか？具体的に教えてください。
            <span className="text-red-500"> *</span>
          </p>
          <textarea
            value={presenceReason}
            onChange={(e) => setPresenceReason(e.target.value)}
            rows={3}
            placeholder="回答を入力"
            className={textareaClass}
          />
        </div>
      </section>

      {/* 投稿した人へ */}
      <section className="flex flex-col gap-5 border-t border-gray-100 pt-6">
        <div>
          <h2 className="text-sm font-bold text-gray-900">投稿した人へ🙋</h2>
          <p className="mt-1 text-xs text-gray-500">
            投稿してない人はその他で「投稿していない」と回答してください。
          </p>
        </div>

        <div>
          <p className={questionClass}>
            どんなモチベーションで投稿しましたか？(複数回答可)<span className="text-red-500"> *</span>
          </p>
          <div className="flex flex-col gap-2">
            {MOTIVATION_OPTIONS.map((option) => (
              <label key={option} className={labelClass}>
                <input
                  type="checkbox"
                  className="accent-gray-900"
                  checked={motivation.includes(option)}
                  onChange={() => setMotivation((prev) => toggleInArray(prev, option))}
                />
                {option}
              </label>
            ))}
            <label className={labelClass}>
              <input
                type="checkbox"
                className="accent-gray-900"
                checked={motivation.includes(OTHER)}
                onChange={() => setMotivation((prev) => toggleInArray(prev, OTHER))}
              />
              その他
            </label>
          </div>
          {motivation.includes(OTHER) && (
            <input
              type="text"
              value={motivationOther}
              onChange={(e) => setMotivationOther(e.target.value)}
              placeholder="回答を入力"
              className={inputClass}
            />
          )}
        </div>

        <div>
          <p className={questionClass}>
            InstagramやXなどの、普段使っているSNSへの投稿と比べて投稿のしやすさはどうでしたか？
            <span className="text-red-500"> *</span>
          </p>
          <div className="flex flex-col gap-2">
            {EASE_OPTIONS.map((option) => (
              <label key={option} className={labelClass}>
                <input
                  type="radio"
                  name="easeOfPosting"
                  className="accent-gray-900"
                  checked={easeOfPosting === option}
                  onChange={() => setEaseOfPosting(option)}
                />
                {option}
              </label>
            ))}
            <label className={labelClass}>
              <input
                type="radio"
                name="easeOfPosting"
                className="accent-gray-900"
                checked={easeOfPosting === OTHER}
                onChange={() => setEaseOfPosting(OTHER)}
              />
              その他
            </label>
          </div>
          {easeOfPosting === OTHER && (
            <input
              type="text"
              value={easeOfPostingOther}
              onChange={(e) => setEaseOfPostingOther(e.target.value)}
              placeholder="回答を入力"
              className={inputClass}
            />
          )}
        </div>

        <div>
          <p className={questionClass}>
            その理由を教えてください<span className="text-red-500"> *</span>
          </p>
          <textarea
            value={easeReason}
            onChange={(e) => setEaseReason(e.target.value)}
            rows={3}
            placeholder="回答を入力"
            className={textareaClass}
          />
        </div>
      </section>

      {/* 最後に */}
      <section className="flex flex-col gap-4 border-t border-gray-100 pt-6">
        <h2 className="text-sm font-bold text-gray-900">最後に💐</h2>
        <div>
          <p className={questionClass}>
            今回の体験について、よかった点、気になった点、もっと継続的に体験するために改善してほしい点などがあれば教えてください！
            <span className="text-red-500"> *</span>
          </p>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={4}
            placeholder="回答を入力"
            className={textareaClass}
          />
        </div>
      </section>

      {errorMessage && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{errorMessage}</p>
      )}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="w-full rounded-full bg-gray-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {status === "submitting" ? (
          <span className="inline-flex items-center justify-center gap-1.5">
            送信中
            <span className="inline-flex items-end gap-0.5">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white" />
            </span>
          </span>
        ) : (
          "送信する"
        )}
      </button>
    </form>
  );
}
