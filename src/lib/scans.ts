import { supabase, SCANS_TABLE } from "./supabase";

/**
 * QRコードの読み取り(=投稿ページの表示)を記録する。
 * 厳密には「投稿ページを開いた回数」であり、QRコード経由か直接アクセスかは区別できない。
 * 失敗しても投稿フロー自体は止めたくないので、エラーは投げずに握りつぶす。
 */
export async function recordScan(locationId: string, participantId: string): Promise<void> {
  try {
    await supabase.from(SCANS_TABLE).insert({
      location_id: locationId,
      participant_id: participantId || null,
    });
  } catch {
    // 計測の失敗で投稿体験を止めないよう、ここでは何もしない
  }
}

export async function fetchScanCount(locationId?: string): Promise<number> {
  let query = supabase.from(SCANS_TABLE).select("*", { count: "exact", head: true });

  if (locationId) {
    query = query.eq("location_id", locationId);
  }

  const { count, error } = await query;

  if (error) {
    throw new Error(`QRコード読み取り回数の取得に失敗しました: ${error.message}`);
  }
  if (count === null) {
    // テーブル未作成時など、PostgRESTがエラーを返さずcount=nullだけ返すケースがあるため
    throw new Error("QRコード読み取り回数を取得できませんでした(テーブル未作成の可能性があります)。");
  }

  return count;
}
