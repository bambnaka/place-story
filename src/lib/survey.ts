import { supabase, SURVEY_TABLE } from "./supabase";

export const AFFILIATION_CATEGORIES = [
  "環境デザイン研究室",
  "コミュニケーションデザイン研究室",
  "その他",
] as const;

export type AffiliationCategory = (typeof AFFILIATION_CATEGORIES)[number];

export const AFFILIATION_SHORT_LABELS: Record<AffiliationCategory, string> = {
  環境デザイン研究室: "環境デザイン",
  コミュニケーションデザイン研究室: "コミュニケーション",
  その他: "その他",
};

/**
 * モニター等の棒グラフで、所属ごとに色分けするためのTailwindクラス。
 * 環境デザイン研究室=緑、コミュニケーションデザイン研究室=オレンジ、その他=青。
 */
export const AFFILIATION_BAR_COLORS: Record<AffiliationCategory, string> = {
  環境デザイン研究室: "bg-emerald-500",
  コミュニケーションデザイン研究室: "bg-orange-500",
  その他: "bg-blue-500",
};

export interface SurveyAnswers {
  participation: string[];
  presenceFeeling: string;
  presenceFeelingOther: string;
  presenceReason: string;
  motivation: string[];
  motivationOther: string;
  easeOfPosting: string;
  easeOfPostingOther: string;
  easeReason: string;
  feedback: string;
}

export const OTHER = "その他";

export const PARTICIPATION_OPTIONS = [
  "他の人の投稿を見た",
  "QRコードを読み取った",
  "画像を投稿した",
  "投稿はしていない",
];

export const PRESENCE_FEELING_OPTIONS = [
  "まったく感じなかった",
  "あまり感じなかった",
  "どちらともいえない",
  "少し感じた",
  "とても感じた",
];

export const MOTIVATION_OPTIONS = [
  "他の人が投稿していたから",
  "自分の痕跡を残そうと思ったから",
  "後から来る人に投稿を見てもらおうと思ったから",
  "モニターに表示されるのが面白いと思ったから",
  "友達と一緒に楽しめそうだと思ったから",
  "知らない人との交流を楽しめそうだと思ったから",
  "24時間で投稿が消えるのが気軽だと思ったから",
];

export const EASE_OPTIONS = [
  "普段のSNSより投稿しにくかった",
  "あまり変わらなかった",
  "普段のSNSより投稿しやすかった",
];

export interface SurveyResponseRow {
  id: string;
  location_id: string | null;
  affiliation_category: AffiliationCategory;
  affiliation_other: string | null;
  answers: SurveyAnswers;
  created_at: string;
}

export interface SubmitSurveyInput {
  locationId: string | null;
  affiliationCategory: AffiliationCategory;
  affiliationOther: string;
  answers: SurveyAnswers;
}

export async function submitSurveyResponse(input: SubmitSurveyInput): Promise<void> {
  const { error } = await supabase.from(SURVEY_TABLE).insert({
    location_id: input.locationId,
    affiliation_category: input.affiliationCategory,
    affiliation_other: input.affiliationOther.trim() || null,
    answers: input.answers,
  });

  if (error) {
    throw new Error(`アンケートの送信に失敗しました: ${error.message}`);
  }
}

/**
 * 所属カテゴリごとの回答数を取得する(モニターの棒グラフ用)。
 * テーブル未作成時にも投稿・モニター表示自体は壊したくないので、
 * 呼び出し側でエラーを握りつぶして表示を省略できるよう例外を投げる設計にしている。
 */
export async function fetchAffiliationCounts(): Promise<Record<AffiliationCategory, number>> {
  const results = await Promise.all(
    AFFILIATION_CATEGORIES.map((category) =>
      supabase
        .from(SURVEY_TABLE)
        .select("*", { count: "exact", head: true })
        .eq("affiliation_category", category)
    )
  );

  const counts = {} as Record<AffiliationCategory, number>;
  AFFILIATION_CATEGORIES.forEach((category, i) => {
    const { count, error } = results[i];
    if (error) {
      throw new Error(`アンケート集計の取得に失敗しました: ${error.message}`);
    }
    if (count === null) {
      // テーブル未作成時など、PostgRESTがエラーを返さずcount=nullだけ返すケースがあるため
      throw new Error("アンケート集計を取得できませんでした(テーブル未作成の可能性があります)。");
    }
    counts[category] = count;
  });

  return counts;
}

/**
 * アンケート回答の総数を取得する(管理画面の表示・削除確認用)。
 * locationIdを指定するとそのモニター経由の回答のみに絞り込む。
 */
export async function fetchSurveyResponseCount(locationId?: string): Promise<number | null> {
  try {
    let query = supabase.from(SURVEY_TABLE).select("*", { count: "exact", head: true });
    if (locationId) {
      query = query.eq("location_id", locationId);
    }
    const { count, error } = await query;
    if (error || count === null) return null;
    return count;
  } catch {
    return null;
  }
}

/**
 * アンケート回答を全件取得する(管理画面の集計ページ用)。
 */
export async function fetchAllSurveyResponses(): Promise<SurveyResponseRow[]> {
  const { data, error } = await supabase
    .from(SURVEY_TABLE)
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`アンケート回答の取得に失敗しました: ${error.message}`);
  }

  return (data ?? []) as SurveyResponseRow[];
}

/**
 * 文字列配列の出現回数を集計する(単一選択・複数選択どちらの設問にも使う)。
 */
export function tally(values: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const value of values) {
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
}

/**
 * アンケート回答を1件だけ削除する。取り消せない操作。
 */
export async function deleteSurveyResponse(id: string): Promise<void> {
  const { error } = await supabase.from(SURVEY_TABLE).delete().eq("id", id);
  if (error) {
    throw new Error(`アンケート回答の削除に失敗しました: ${error.message}`);
  }
}

/**
 * アンケート回答を完全に削除する。取り消せない操作。
 * locationIdを指定しない場合は全ての回答を削除する。
 * テーブルが無い環境でも他の削除処理は成功させたいので、失敗しても無視する。
 */
export async function deleteAllSurveyResponses(locationId?: string): Promise<void> {
  try {
    const query = supabase.from(SURVEY_TABLE).delete();
    // PostgRESTはWHERE句の無いDELETEを拒否するため、全件削除時も
    // 「idがnullでない」という常に真の条件を明示的に付与する
    await (locationId ? query.eq("location_id", locationId) : query.not("id", "is", null));
  } catch {
    // 握りつぶして他の削除処理を続行させる
  }
}
