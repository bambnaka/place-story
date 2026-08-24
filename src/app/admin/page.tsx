"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { deleteAllPosts, fetchAdminPosts, setPostVisibility } from "@/lib/posts";
import { deleteAllScans, fetchScanCount } from "@/lib/scans";
import { summarizeParticipants } from "@/lib/participantSummary";
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
  const [scanCount, setScanCount] = useState<number | null>(null);
  const [locationFilter, setLocationFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  const load = useCallback(async (locationId: string) => {
    setIsLoading(true);
    try {
      const trimmed = locationId.trim() || undefined;
      const postsData = await fetchAdminPosts(trimmed);
      setPosts(postsData);
      setErrorMessage(null);

      // place_story_scans テーブルが未作成でも投稿一覧の表示は続けたいので、
      // 読み取り回数の取得失敗はこのブロックの外に影響させない
      try {
        setScanCount(await fetchScanCount(trimmed));
      } catch {
        setScanCount(null);
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "投稿の取得に失敗しました。");
    } finally {
      setIsLoading(false);
    }
  }, []);

  function toggleExpanded(key: string) {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(locationFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const postsByLocation = useMemo(() => {
    const map = new Map<string, Post[]>();
    for (const post of posts) {
      const list = map.get(post.location_id);
      if (list) {
        list.push(post);
      } else {
        map.set(post.location_id, [post]);
      }
    }
    return Array.from(map.entries()).map(([locationId, items]) => ({ locationId, items }));
  }, [posts]);

  const participantSummary = useMemo(() => summarizeParticipants(posts), [posts]);
  const totalPosts = posts.length;
  const totalParticipants = participantSummary.length;
  const avgPostsPerParticipant =
    totalParticipants === 0 ? 0 : totalPosts / totalParticipants;
  const repeatParticipants = participantSummary.filter((p) => p.postCount > 1).length;
  const conversionRate =
    scanCount && scanCount > 0 ? Math.min((totalPosts / scanCount) * 100, 100) : null;

  async function handleDeleteAll() {
    const scope = locationFilter.trim();
    const scopeLabel = scope ? `「${scope}」の` : "全ての場所の";
    const confirmed = window.confirm(
      `${scopeLabel}履歴を完全に削除します。\n投稿 ${totalPosts}件・QR読み取り履歴 ${
        scanCount ?? 0
      }件が対象で、画像もStorageから削除されます。\n\nこの操作は取り消せません。本当によろしいですか?`
    );
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      await deleteAllPosts(scope || undefined);
      await deleteAllScans(scope || undefined);
      await load(locationFilter);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "削除に失敗しました。");
    } finally {
      setIsDeleting(false);
    }
  }

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

        {!isLoading && (posts.length > 0 || (scanCount ?? 0) > 0) && (
          <section className="mt-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-gray-900">実験用サマリー</h2>
                <p className="mt-1 text-xs text-gray-500">
                  非表示・期限切れの投稿も含めた、これまでの参加記録です
                  {locationFilter.trim() && (
                    <>
                      (location_id: <span className="font-medium">{locationFilter.trim()}</span>{" "}
                      で絞り込み中)
                    </>
                  )}
                  。
                </p>
              </div>
              <button
                type="button"
                onClick={handleDeleteAll}
                disabled={isDeleting}
                className="shrink-0 rounded-full border border-red-200 px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                {isDeleting
                  ? "削除中..."
                  : locationFilter.trim()
                    ? `「${locationFilter.trim()}」の履歴を全削除`
                    : "全ての履歴を削除"}
              </button>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <div className="rounded-xl bg-white p-4 shadow-sm">
                <p className="text-xs text-gray-500">QR読み取り回数</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {scanCount ?? "-"}
                </p>
              </div>
              <div className="rounded-xl bg-white p-4 shadow-sm">
                <p className="text-xs text-gray-500">総投稿数</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">{totalPosts}</p>
              </div>
              <div className="rounded-xl bg-white p-4 shadow-sm">
                <p className="text-xs text-gray-500">投稿率</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {conversionRate === null ? "-" : `${conversionRate.toFixed(0)}%`}
                </p>
              </div>
              <div className="rounded-xl bg-white p-4 shadow-sm">
                <p className="text-xs text-gray-500">参加人数</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">{totalParticipants}</p>
              </div>
              <div className="rounded-xl bg-white p-4 shadow-sm">
                <p className="text-xs text-gray-500">平均投稿回数/人</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {avgPostsPerParticipant.toFixed(1)}
                </p>
              </div>
              <div className="rounded-xl bg-white p-4 shadow-sm">
                <p className="text-xs text-gray-500">複数回投稿した人</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">{repeatParticipants}</p>
              </div>
            </div>

            <div className="mt-4 overflow-x-auto rounded-xl bg-white shadow-sm">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs text-gray-500">
                    <th className="px-4 py-3 font-medium">#</th>
                    <th className="px-4 py-3 font-medium">ニックネーム</th>
                    <th className="px-4 py-3 font-medium">場所</th>
                    <th className="px-4 py-3 font-medium">投稿回数</th>
                    <th className="px-4 py-3 font-medium">初回〜最終投稿</th>
                    <th className="px-4 py-3 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {participantSummary.map((row, i) => {
                    const isExpanded = expandedKeys.has(row.key);
                    return (
                      <Fragment key={row.key}>
                        <tr className="border-b border-gray-50 last:border-0">
                          <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                          <td className="px-4 py-3 text-gray-800">
                            {row.nicknames.length > 0 ? row.nicknames.join("・") : "(匿名)"}
                            {row.isLegacy && (
                              <span className="ml-1.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-400">
                                旧データ
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-500">
                            {row.locationIds.join("・")}
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-900">{row.postCount}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                            {formatDateTime(row.firstPostAt)}
                            {row.postCount > 1 && <> 〜 {formatDateTime(row.lastPostAt)}</>}
                          </td>
                          <td className="px-4 py-3">
                            {row.postCount > 1 && (
                              <button
                                type="button"
                                onClick={() => toggleExpanded(row.key)}
                                className="text-xs font-medium text-gray-500 underline underline-offset-2"
                              >
                                {isExpanded ? "閉じる" : `全${row.postCount}件を見る`}
                              </button>
                            )}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="border-b border-gray-50 bg-gray-50/60 last:border-0">
                            <td />
                            <td colSpan={5} className="px-4 py-3">
                              <ul className="flex flex-wrap gap-2">
                                {row.postTimes.map((time, timeIndex) => (
                                  <li
                                    key={`${row.key}-${time}-${timeIndex}`}
                                    className="rounded-full bg-white px-2.5 py-1 text-xs text-gray-600 shadow-sm"
                                  >
                                    {formatDateTime(time)}
                                  </li>
                                ))}
                              </ul>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-gray-400">
              「参加人数」は、同じ端末(ブラウザ)からの複数投稿を1人としてまとめた人数です。「旧データ」は参加者識別機能を追加する前の投稿で、投稿ごとに1人として数えています。
            </p>
          </section>
        )}

        {!isLoading && posts.length > 0 && (
          <h2 className="mt-8 text-sm font-bold text-gray-900">投稿一覧</h2>
        )}

        {isLoading ? (
          <p className="mt-8 text-sm text-gray-500">読み込み中...</p>
        ) : posts.length === 0 ? (
          <p className="mt-8 text-sm text-gray-500">投稿がありません。</p>
        ) : (
          <div className="mt-3 flex flex-col gap-8">
            {postsByLocation.map(({ locationId, items }) => (
              <section key={locationId}>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-gray-900">
                    {locationId}
                    <span className="ml-1.5 text-xs font-normal text-gray-400">
                      ({items.length}件)
                    </span>
                  </h3>
                  {!locationFilter.trim() && (
                    <button
                      type="button"
                      onClick={() => {
                        setLocationFilter(locationId);
                        load(locationId);
                      }}
                      className="text-xs font-medium text-gray-500 underline underline-offset-2"
                    >
                      この場所だけ表示
                    </button>
                  )}
                </div>
                <ul className="flex flex-col gap-3">
                  {items.map((post) => {
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
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}
                            >
                              {status.label}
                            </span>
                          </div>
                          <p className="mt-1 truncate text-sm text-gray-800">
                            {post.nickname && (
                              <span className="font-medium text-gray-500">
                                {post.nickname}:{" "}
                              </span>
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
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
