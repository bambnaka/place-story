import type { Post } from "@/types/post";

export interface ParticipantSummaryRow {
  key: string;
  nicknames: string[];
  locationIds: string[];
  postCount: number;
  firstPostAt: string;
  lastPostAt: string;
  isLegacy: boolean;
}

/**
 * 投稿一覧から参加者(participant_id)ごとの投稿回数などを集計する。
 * participant_id が無い投稿(この機能を追加する前のデータ)は、
 * 投稿1件を1参加者として扱う(isLegacy = true)。
 */
export function summarizeParticipants(posts: Post[]): ParticipantSummaryRow[] {
  const map = new Map<string, ParticipantSummaryRow>();

  for (const post of posts) {
    const isLegacy = !post.participant_id;
    const key = post.participant_id ?? `__row_${post.id}`;
    const existing = map.get(key);

    if (existing) {
      existing.postCount += 1;
      if (post.nickname && !existing.nicknames.includes(post.nickname)) {
        existing.nicknames.push(post.nickname);
      }
      if (!existing.locationIds.includes(post.location_id)) {
        existing.locationIds.push(post.location_id);
      }
      if (post.created_at < existing.firstPostAt) existing.firstPostAt = post.created_at;
      if (post.created_at > existing.lastPostAt) existing.lastPostAt = post.created_at;
    } else {
      map.set(key, {
        key,
        nicknames: post.nickname ? [post.nickname] : [],
        locationIds: [post.location_id],
        postCount: 1,
        firstPostAt: post.created_at,
        lastPostAt: post.created_at,
        isLegacy,
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => b.postCount - a.postCount);
}
