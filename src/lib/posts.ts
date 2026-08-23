import { supabase, POSTS_TABLE } from "./supabase";
import type { Post } from "@/types/post";

const EXPIRES_IN_HOURS = 24;

export async function createPost(
  locationId: string,
  imageUrl: string,
  imagePath: string,
  comment: string,
  nickname: string
): Promise<Post> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + EXPIRES_IN_HOURS * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from(POSTS_TABLE)
    .insert({
      location_id: locationId,
      image_url: imageUrl,
      image_path: imagePath,
      comment: comment.trim() || null,
      nickname: nickname.trim() || null,
      is_visible: true,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw new Error(`投稿の保存に失敗しました: ${error.message}`);
  }

  return data as Post;
}

/**
 * モニター表示用の投稿取得。
 * location_id が一致し、is_visible = true、expires_at が現在時刻より未来のものだけを
 * created_at 昇順(投稿された順)で取得する。
 */
export async function fetchScreenPosts(locationId: string): Promise<Post[]> {
  const { data, error } = await supabase
    .from(POSTS_TABLE)
    .select("*")
    .eq("location_id", locationId)
    .eq("is_visible", true)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`投稿の取得に失敗しました: ${error.message}`);
  }

  return (data ?? []) as Post[];
}

/**
 * 管理画面用の投稿取得。非表示・期限切れも含めて全件取得する。
 */
export async function fetchAdminPosts(locationId?: string): Promise<Post[]> {
  let query = supabase.from(POSTS_TABLE).select("*").order("created_at", { ascending: false });

  if (locationId) {
    query = query.eq("location_id", locationId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`投稿の取得に失敗しました: ${error.message}`);
  }

  return (data ?? []) as Post[];
}

/**
 * その場所への累計参加人数(投稿数)を取得する。
 * is_visible や expires_at に関わらず、これまでに投稿された総数を数える。
 */
export async function fetchParticipantCount(locationId: string): Promise<number> {
  const { count, error } = await supabase
    .from(POSTS_TABLE)
    .select("*", { count: "exact", head: true })
    .eq("location_id", locationId);

  if (error) {
    throw new Error(`参加人数の取得に失敗しました: ${error.message}`);
  }

  return count ?? 0;
}

export async function setPostVisibility(id: string, isVisible: boolean): Promise<void> {
  const { error } = await supabase
    .from(POSTS_TABLE)
    .update({ is_visible: isVisible })
    .eq("id", id);

  if (error) {
    throw new Error(`投稿の更新に失敗しました: ${error.message}`);
  }
}
