import { supabase, POSTS_TABLE, POST_IMAGES_BUCKET } from "./supabase";
import type { Post } from "@/types/post";

const EXPIRES_IN_HOURS = 24;

export async function createPost(
  locationId: string,
  imageUrl: string,
  imagePath: string,
  comment: string,
  nickname: string,
  participantId: string
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
      participant_id: participantId || null,
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
 * その場所への累計参加人数を取得する。
 * 同じ端末(participant_id)からの複数投稿は1人として数える。
 * is_visible や expires_at に関わらず、これまでの参加者数を数える。
 * participant_id が無い古いデータ(移行前の投稿)は、投稿ごとに1人としてカウントする。
 */
export async function fetchParticipantCount(locationId: string): Promise<number> {
  const { data, error } = await supabase
    .from(POSTS_TABLE)
    .select("id, participant_id")
    .eq("location_id", locationId);

  if (error) {
    throw new Error(`参加人数の取得に失敗しました: ${error.message}`);
  }

  const uniqueParticipants = new Set(
    (data ?? []).map((row) => row.participant_id ?? `__row_${row.id}`)
  );

  return uniqueParticipants.size;
}

/**
 * 投稿(と紐づくStorage上の画像)を完全に削除する。取り消せない操作。
 * locationIdを指定しない場合は全場所の投稿を削除する。
 */
export async function deleteAllPosts(locationId?: string): Promise<Post[]> {
  const query = supabase.from(POSTS_TABLE).delete().select();
  const { data, error } = await (locationId
    ? query.eq("location_id", locationId)
    : query);

  if (error) {
    throw new Error(`投稿の削除に失敗しました: ${error.message}`);
  }

  const deleted = (data ?? []) as Post[];
  const paths = deleted.map((post) => post.image_path).filter(Boolean);

  if (paths.length > 0) {
    const { error: storageError } = await supabase.storage
      .from(POST_IMAGES_BUCKET)
      .remove(paths);
    if (storageError) {
      throw new Error(`投稿データは削除しましたが、画像の削除に失敗しました: ${storageError.message}`);
    }
  }

  return deleted;
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
