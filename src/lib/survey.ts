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
