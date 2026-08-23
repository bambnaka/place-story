"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchAdminPosts, setPostVisibility } from "@/lib/posts";
import type { Post } from "@/types/post";

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusOf(post: Post): { label: string; className: string } {
  const expired = new Date(post.expires_at).getTime() < Date.now();
  if (expired) return { label: "期限切れ", className: "bg-gray-100 text-gray-500" };
  if (!post.is_visible) return { label: "非表示", className: "bg-red-100 text-red-600" };
  return { label: "表示中", className: "bg-emerald-100 text-emerald-700" };
}

export default function AdminPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [locationFilter, setLocationFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const load = useCallback(async (locationId: string) => {
    setIsLoading(true);
    try {
      const data = await fetchAdminPosts(locationId.trim() || undefined);
      setPosts(data);
      setErrorMessage(null);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "投稿の取得に失敗しました。");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(locationFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggleVisibility(post: Post) {
    setPendingId(post.id);
    try {
      await setPostVisibility(post.id, !post.is_visible);
      setPosts((prev) =>
        prev.map((p) => (p.id === post.id ? { ...p, is_visible: !p.is_visible } : p))
      );
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "更新に失敗しました。");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <main className="min-h-dvh bg-gray-100 px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-xl font-bold text-gray-900">管理画面</h1>
        <p className="mt-1 text-sm text-gray-500">
          投稿の一覧確認と、不適切な投稿の非表示化ができます。
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            load(locationFilter);
          }}
          className="mt-6 flex gap-2"
        >
          <input
            type="text"
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            placeholder="location_id で絞り込み(空欄で全件)"
            className="w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            検索
          </button>
          <button
            type="button"
            onClick={() => load(locationFilter)}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            更新
          </button>
        </form>

        {errorMessage && (
          <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
            {errorMessage}
          </p>
        )}

        {isLoading ? (
          <p className="mt-8 text-sm text-gray-500">読み込み中...</p>
        ) : posts.length === 0 ? (
          <p className="mt-8 text-sm text-gray-500">投稿がありません。</p>
        ) : (
          <ul className="mt-6 flex flex-col gap-3">
            {posts.map((post) => {
              const status = statusOf(post);
              return (
                <li
                  key={post.id}
                  className="flex flex-col gap-3 rounded-xl bg-white p-4 shadow-sm sm:flex-row sm:items-center"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={post.image_url}
                    alt={post.comment ?? "投稿画像"}
                    className="h-24 w-24 shrink-0 rounded-lg object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium text-gray-400">
                        {post.location_id}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}
                      >
                        {status.label}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm text-gray-800">
                      {post.nickname && (
                        <span className="font-medium text-gray-500">{post.nickname}: </span>
                      )}
                      {post.comment || "(コメントなし)"}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      投稿: {formatDateTime(post.created_at)} / 期限:{" "}
                      {formatDateTime(post.expires_at)}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={pendingId === post.id}
                    onClick={() => toggleVisibility(post)}
                    className="shrink-0 rounded-full border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    {post.is_visible ? "非表示にする" : "表示に戻す"}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
