"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { supabase, POSTS_TABLE, SURVEY_TABLE } from "@/lib/supabase";
import { fetchScreenPosts } from "@/lib/posts";
import {
  fetchAffiliationCounts,
  AFFILIATION_CATEGORIES,
  AFFILIATION_SHORT_LABELS,
  AFFILIATION_BAR_COLORS,
  type AffiliationCategory,
} from "@/lib/survey";
import type { Post } from "@/types/post";

const FETCH_INTERVAL_MS = 30_000;
const ROTATE_INTERVAL_MS = 12_000;
// 縦置きサイネージ(9:16)のステージ幅を100とした単位(cqw)で指定する
const CARD_WIDTH_CQ = 86;
const CARD_GAP_CQ = 2;
const CARD_STEP_CQ = CARD_WIDTH_CQ + CARD_GAP_CQ;

function formatElapsed(createdAt: string): string {
  const diffMs = Date.now() - new Date(createdAt).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "たった今";
  if (minutes < 60) return `${minutes}分前`;
  const hours = Math.floor(minutes / 60);
  return `${hours}時間前`;
}

function AffiliationChart({
  counts,
  large = false,
}: {
  counts: Record<AffiliationCategory, number>;
  large?: boolean;
}) {
  const max = Math.max(1, ...AFFILIATION_CATEGORIES.map((c) => counts[c]));
  return (
    <div className={`flex w-full flex-col ${large ? "gap-[3cqw]" : "gap-[2.4cqw]"}`}>
      {AFFILIATION_CATEGORIES.map((category) => {
        const count = counts[category];
        return (
          <div key={category}>
            <div
              className={`flex items-baseline justify-between gap-[1.5cqw] text-gray-600 ${
                large ? "text-[3.4cqw]" : "text-[2.6cqw]"
              }`}
            >
              <span className="truncate">{AFFILIATION_SHORT_LABELS[category]}</span>
              <span className="font-bold text-gray-900">{count}</span>
            </div>
            <div
              className={`mt-[1cqw] w-full overflow-hidden rounded-full bg-gray-100 ${
                large ? "h-[3cqw]" : "h-[2.4cqw]"
              }`}
            >
              <div
                className={`h-full rounded-full transition-all duration-500 ${AFFILIATION_BAR_COLORS[category]}`}
                style={{ width: `${(count / max) * 100}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function ScreenView({ locationId }: { locationId: string }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [surveyUrl, setSurveyUrl] = useState("");
  const [affiliationCounts, setAffiliationCounts] = useState<Record<
    AffiliationCategory,
    number
  > | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await fetchScreenPosts(locationId);
      setPosts(data);
      setErrorMessage(null);
      setActiveIndex((current) => (data.length === 0 ? 0 : current % data.length));
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "投稿の取得に失敗しました。");
    } finally {
      setIsLoading(false);
    }
  }, [locationId]);

  useEffect(() => {
    // window はブラウザでしか取得できないため、マウント後に反映する
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSurveyUrl(`${window.location.origin}/survey?loc=${locationId}`);
  }, [locationId]);

  const loadSurveyCounts = useCallback(async () => {
    try {
      setAffiliationCounts(await fetchAffiliationCounts());
    } catch {
      // survey テーブルが未作成でもモニター表示自体は続ける
      setAffiliationCounts(null);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSurveyCounts();
    const timer = setInterval(loadSurveyCounts, FETCH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [loadSurveyCounts]);

  useEffect(() => {
    const channel = supabase
      .channel(`place_story_survey_${locationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: SURVEY_TABLE },
        () => {
          loadSurveyCounts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [locationId, loadSurveyCounts]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const fetchTimer = setInterval(load, FETCH_INTERVAL_MS);
    return () => clearInterval(fetchTimer);
  }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel(`place_story_posts_${locationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: POSTS_TABLE,
          filter: `location_id=eq.${locationId}`,
        },
        () => {
          load();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [locationId, load]);

  const postsRef = useRef(posts);
  useEffect(() => {
    postsRef.current = posts;
  }, [posts]);

  useEffect(() => {
    const rotateTimer = setInterval(() => {
      setActiveIndex((current) => {
        const count = postsRef.current.length;
        if (count === 0) return 0;
        return (current + 1) % count;
      });
    }, ROTATE_INTERVAL_MS);
    return () => clearInterval(rotateTimer);
  }, []);

  const activePost = posts[activeIndex];

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden text-white">
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden bg-black">
        <div
          className="absolute top-[-20%] left-[-15%] h-[70vh] w-[70vh] rounded-full bg-red-600/40 blur-[120px]"
          style={{ animation: "glow-drift-a 26s ease-in-out infinite" }}
        />
        <div
          className="absolute top-[10%] right-[-20%] h-[80vh] w-[80vh] rounded-full bg-blue-500/35 blur-[130px]"
          style={{ animation: "glow-drift-b 32s ease-in-out infinite" }}
        />
        <div
          className="absolute bottom-[-25%] left-[15%] h-[65vh] w-[65vh] rounded-full bg-purple-600/30 blur-[110px]"
          style={{ animation: "glow-drift-c 38s ease-in-out infinite" }}
        />
        <div
          className="absolute right-[10%] bottom-[-15%] h-[55vh] w-[55vh] rounded-full bg-orange-500/25 blur-[110px]"
          style={{ animation: "glow-drift-a 30s ease-in-out infinite reverse" }}
        />
      </div>

      {/* 縦置きサイネージ(9:16)専用のステージ。内部の寸法は全て cqw(ステージ幅の1%)で指定 */}
      <div className="screen-stage relative z-10 flex flex-col items-center">
        {isLoading && (
          <p className="m-auto text-[3cqw] text-white/60">読み込み中...</p>
        )}

        {!isLoading && errorMessage && (
          <p className="m-auto max-w-[80cqw] text-center text-[3cqw] text-red-300">
            {errorMessage}
          </p>
        )}

        {!isLoading && !errorMessage && posts.length === 0 && surveyUrl && (
          <div className="flex w-full flex-1 flex-col items-center justify-center gap-[5cqw] px-[4cqw] text-center">
            <div className="flex flex-col items-center gap-[2.5cqw]">
              <p className="text-[2.2cqw] font-bold tracking-[0.4em] text-white/50">
                PLACE STORY
              </p>
              <p className="text-[9cqw] leading-tight font-bold tracking-wide">
                本実験のアンケート
              </p>
              <p className="text-[3cqw] text-white/60">
                投稿していない人も回答対象です！ぜひ教えてください
              </p>
            </div>
            <div className="flex w-full flex-col items-center gap-[4cqw] rounded-[4cqw] bg-white px-[6cqw] py-[5cqw] shadow-2xl">
              <div className="w-[52cqw]">
                <QRCodeSVG value={surveyUrl} size={512} style={{ width: "100%", height: "auto" }} />
              </div>
              {affiliationCounts && <AffiliationChart counts={affiliationCounts} large />}
            </div>
          </div>
        )}

        {!isLoading && activePost && (
          <div className="flex w-full flex-1 flex-col items-center pt-[5cqw] pb-[4cqw]">
            <p className="text-[2.2cqw] font-bold tracking-[0.4em] text-white/50">PLACE STORY</p>

            <div className="my-auto flex w-full flex-col items-center">
            <div
              className="relative w-full overflow-hidden"
              style={{ height: `${(CARD_WIDTH_CQ * 9) / 16 + 4}cqw` }}
            >
              <div
                className="absolute top-0 flex h-full items-center gap-x-[2cqw] transition-transform duration-[1300ms] ease-in-out"
                style={{
                  left: "50%",
                  transform: `translateX(-${activeIndex * CARD_STEP_CQ + CARD_WIDTH_CQ / 2}cqw)`,
                }}
              >
                {posts.map((post, i) => (
                  <div
                    key={post.id}
                    className="shrink-0 transition-all duration-[1300ms] ease-in-out"
                    style={{
                      width: `${CARD_WIDTH_CQ}cqw`,
                      opacity: i === activeIndex ? 1 : 0.35,
                      transform: i === activeIndex ? "scale(1)" : "scale(0.92)",
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={post.image_url}
                      alt={post.comment ?? "投稿画像"}
                      className="aspect-video w-full rounded-[2cqw] object-cover shadow-2xl"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-[5cqw] flex min-h-[26cqw] w-full flex-col items-center gap-[1.5cqw] px-[6cqw] text-center">
              {activePost.comment && (
                <p className="line-clamp-3 text-[7cqw] leading-tight font-bold">
                  {activePost.comment}
                </p>
              )}
              <p className="text-[2.4cqw] text-white/50">
                {activePost.nickname ? `${activePost.nickname} · ` : ""}
                {formatElapsed(activePost.created_at)}
              </p>
            </div>

            {posts.length > 1 && (
              <div className="mt-[2cqw] flex gap-[1cqw]">
                {posts.map((p, i) => (
                  <span
                    key={p.id}
                    className={`h-[1cqw] w-[1cqw] rounded-full transition ${
                      i === activeIndex ? "bg-white" : "bg-white/30"
                    }`}
                  />
                ))}
              </div>
            )}
            </div>

            {surveyUrl && (
              <div className="flex w-[92cqw] flex-col items-center gap-[2.5cqw] rounded-[4cqw] bg-white px-[4cqw] py-[3.5cqw] shadow-2xl">
                <div className="text-center">
                  <p className="text-[3.4cqw] font-bold text-gray-900">本実験のアンケート</p>
                  <p className="text-[2.2cqw] text-gray-500">
                    投稿していない人も回答対象です！ぜひ教えてください
                  </p>
                </div>
                <div className="flex w-full items-center gap-[4cqw]">
                  <div className="w-[38cqw] shrink-0">
                    <QRCodeSVG
                      value={surveyUrl}
                      size={512}
                      style={{ width: "100%", height: "auto" }}
                    />
                  </div>
                  {affiliationCounts && (
                    <div className="flex-1">
                      <AffiliationChart counts={affiliationCounts} />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
