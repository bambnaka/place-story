const PARTICIPANT_ID_KEY = "place-story-participant-id";

/**
 * 同じブラウザ(端末)からの投稿を同一人物として扱うための匿名ID。
 * ログイン機能を持たないため、localStorageに保存したIDで簡易的に識別する。
 * ブラウザのデータを消去したり別端末から投稿したりすると、別人としてカウントされる。
 */
export function getParticipantId(): string {
  if (typeof window === "undefined") return "";

  const existing = window.localStorage.getItem(PARTICIPANT_ID_KEY);
  if (existing) return existing;

  const id = crypto.randomUUID();
  window.localStorage.setItem(PARTICIPANT_ID_KEY, id);
  return id;
}
