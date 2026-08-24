"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { supabase, POSTS_TABLE } from "@/lib/supabase";
import { fetchScreenPosts, fetchParticipantCount } from "@/lib/posts";
import type { Post } from "@/types/post";

const FETCH_INTERVAL_MS = 30_000;
const ROTATE_INTERVAL_MS = 12_000;
const CARD_WIDTH_VW = 88;
const CARD_GAP_VW = 2;
const CARD_STEP_VW = CARD_WIDTH_VW + CARD_GAP_VW;

function formatElapsed(createdAt: string): string {
  const diffMs = Date.now() - new Date(createdAt).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "たった今";
  if (minutes < 60) return `${minutes}分前`;
  const hours = Math.floor(minutes / 60);
  return `${hours}時間前`;
}

export default function ScreenView({ locationId }: { locationId: string }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [participantCount, setParticipantCount] = useState<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [postUrl, setPostUrl] = useState("");

  const load = useCallback(async () => {
    try {
      const [data, count] = await Promise.all([
        fetchScreenPosts(locationId),
        fetchParticipantCount(locationId),
      ]);
      setPosts(data);
      setParticipantCount(count);
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
    setPostUrl(`${window.location.origin}/post/${locationId}?src=qr`);
  }, [locationId]);

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
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-black text-white">
      {isLoading && (
        <p className="text-white/60">読み込み中...</p>
      )}

      {!isLoading && errorMessage && (
        <p className="max-w-md px-6 text-center text-red-300">{errorMessage}</p>
      )}

      {!isLoading && !errorMessage && posts.length === 0 && postUrl && (
        <div className="flex max-w-3xl flex-col items-center gap-8 px-6 text-center">
          <div className="flex flex-col items-center gap-4">
            <p className="text-xs font-bold tracking-[0.4em] text-white/50">PLACE STORY</p>
            <p className="text-3xl font-bold tracking-wide sm:text-4xl lg:text-5xl">
              あなたの今を共有しよう
            </p>
          </div>
          <div className="flex flex-col items-center gap-3 rounded-3xl bg-white px-10 py-8 shadow-2xl">
            <QRCodeSVG value={postUrl} size={260} />
            <p className="text-sm font-medium text-gray-700">QRコードを読み取って投稿</p>
          </div>
        </div>
      )}

      {!isLoading && activePost && (
        <div className="flex w-full flex-col items-center gap-6">
          <div className="relative h-[78dvh] w-full overflow-hidden">
            <div
              className="absolute top-0 flex h-full items-center gap-x-[2vw] transition-transform duration-[1300ms] ease-in-out"
              style={{
                left: "50%",
                transform: `translateX(-${activeIndex * CARD_STEP_VW + CARD_WIDTH_VW / 2}vw)`,
              }}
            >
              {posts.map((post, i) => (
                <div
                  key={post.id}
                  className="flex h-full shrink-0 items-center justify-center transition-all duration-[1300ms] ease-in-out"
                  style={{
                    width: `${CARD_WIDTH_VW}vw`,
                    opacity: i === activeIndex ? 1 : 0.35,
                    transform: i === activeIndex ? "scale(1)" : "scale(0.9)",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={post.image_url}
                    alt={post.comment ?? "投稿画像"}
                    className="h-full w-full rounded-2xl object-cover shadow-2xl"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex w-full max-w-2xl flex-col items-center gap-1 px-6 text-center">
            {activePost.comment && (
              <p className="text-xl font-medium">{activePost.comment}</p>
            )}
            <p className="text-sm text-white/50">
              {activePost.nickname ? `${activePost.nickname} · ` : ""}
              {formatElapsed(activePost.created_at)}
            </p>
          </div>

          {posts.length > 1 && (
            <div className="flex gap-1.5">
              {posts.map((p, i) => (
                <span
                  key={p.id}
                  className={`h-1.5 w-1.5 rounded-full transition ${
                    i === activeIndex ? "bg-white" : "bg-white/30"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {postUrl && posts.length > 0 && (
        <div className="absolute bottom-8 right-8 flex flex-col items-center gap-3 rounded-3xl bg-white px-8 py-6 shadow-2xl">
          <p className="text-xl font-bold tracking-wide text-gray-900">PLACE STORY</p>
          {participantCount !== null && (
            <p className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
              参加人数 {participantCount}人
            </p>
          )}
          <QRCodeSVG value={postUrl} size={240} />
          <p className="text-sm font-medium text-gray-700">QRコードを読み取って投稿</p>
        </div>
      )}
    </main>
  );
}
