# Place Story

QRコードから画像を投稿すると、その場所に設置されたモニターに24時間限定で表示される Web アプリです。

## アプリの概要

Place Story は、特定の**リアルな場所**に紐づいたデジタル伝言板です。

1. 場所ごとに `locationId` を割り当て、その場所にQRコードを設置する
2. 来訪者がQRコードを読み取り、その場でスマホから写真・ひとことコメント・ニックネーム(いずれも任意項目あり)を投稿する
3. 投稿は Supabase に保存され、同じ場所のモニター(`/screen/[locationId]`)に**24時間限定**で表示される
4. 次にその場所を訪れた人は、前の人の投稿を見ることができる

投稿は場所ごとに独立しており、`locationId` が異なれば表示される投稿も異なります。

## 研究目的

研究テーマ:「リアルな場に残るSNS」

現代のSNSは、離れた場所にいる人同士が互いの日常を共有するメディアとして使われています。一方で本アプリでは、投稿を特定の**リアルな場所**に紐づけ、その場所にあるモニターへ一時的に表示します。いわば「場所に残るデジタル伝言板」です。

他者の投稿の痕跡がリアルな場に表示されることで、後から訪れた人の参加(投稿)がどのように誘発されるかを観察することを目的としたプロトタイプです。研究用途のため、認証・スパム対策・本番運用のセキュリティ強化などは最小限に留めています。

## 使用技術

- [Next.js](https://nextjs.org/) 16(App Router)
- TypeScript
- Tailwind CSS 4
- [Supabase](https://supabase.com/)(Postgres / Storage)
- [qrcode.react](https://github.com/zpao/qrcode.react)(QRコード表示)

## ディレクトリ構成(主要部分)

```
src/
  app/
    page.tsx                    トップページ(概要・リンク)
    post/[locationId]/page.tsx  投稿ページ
    screen/[locationId]/page.tsx モニター表示ページ
    admin/page.tsx              管理画面
  lib/
    supabase.ts                 Supabaseクライアント
    posts.ts                    投稿の取得・作成・更新
    uploadImage.ts               画像アップロード処理
  types/
    post.ts                     投稿データの型定義
```

## 環境変数の設定方法

`.env.local.example` をコピーして `.env.local` を作成し、Supabaseプロジェクトの値を設定してください。

```bash
cp .env.local.example .env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

値は Supabase ダッシュボード → **Project Settings → API** から取得できます(`Project URL` と `anon public` キー)。

`NEXT_PUBLIC_` プレフィックスの環境変数はクライアント(ブラウザ)にも公開される値です。ここには **anon key** のみを設定し、`service_role` キーは絶対にこのアプリに含めないでください。

## Supabase の `place_story_posts` テーブル作成SQL

Supabase ダッシュボードの **SQL Editor** で以下を実行してください。

```sql
create table place_story_posts (
  id uuid primary key default gen_random_uuid(),
  location_id text not null,
  image_url text not null,
  image_path text not null,
  comment text,
  nickname text,
  created_at timestamp with time zone default now(),
  expires_at timestamp with time zone not null,
  is_visible boolean default true
);

alter table place_story_posts enable row level security;
create policy "誰でも読める_ps" on place_story_posts for select using (true);
create policy "誰でも書ける_ps" on place_story_posts for insert with check (true);
create policy "誰でも更新できる_ps" on place_story_posts for update using (true);

grant select, insert, update on table public.place_story_posts to anon;
```

- `image_url`: モニターやブラウザから表示するための公開URL(Supabase Storageの `getPublicUrl` から取得)
- `image_path`: Storageバケット内の実ファイルパス(`{locationId}/{uuid}.{拡張子}`)。将来、投稿削除時にストレージからも画像を消す場合などに使う
- `nickname`: 投稿者が任意で入力できるニックネーム
- `expires_at`: アプリ側で投稿作成時に「作成時刻 + 24時間」を計算して明示的に保存(テーブル側にデフォルト値は設定していません)

> **注意**: `select` / `update` を anon ロールに広く許可しているのは、このプロトタイプが管理画面用の認証を持たないためです。本番運用する場合は Supabase Auth を導入し、管理系の操作は認証済みユーザーのみに制限してください。

## Supabase Storage バケットの作成方法

1. Supabase ダッシュボード → **Storage** → **New bucket**
2. バケット名を `place-story-images` にする
3. **Public bucket** を ON にする(モニターやブラウザから画像URLへ直接アクセスするため)
4. 作成後、**SQL Editor** で以下を実行してアップロード・閲覧用のポリシーを追加する(Policies が 0 件のままだと投稿画像のアップロードに失敗します)

```sql
create policy "Allow public upload to place-story-images"
  on storage.objects for insert
  to anon
  with check (bucket_id = 'place-story-images');

create policy "Allow public read place-story-images"
  on storage.objects for select
  to anon
  using (bucket_id = 'place-story-images');
```

アプリ内では `POST_IMAGES_BUCKET`(`src/lib/supabase.ts`)としてバケット名 `place-story-images` を参照しています。バケット名を変更する場合はこの定数も合わせて変更してください。

## ローカル起動方法

```bash
npm install
cp .env.local.example .env.local   # 値を編集してから
npm run dev
```

ブラウザで以下にアクセスして動作確認できます。

- `http://localhost:3000/post/test-location` … 投稿ページ
- `http://localhost:3000/screen/test-location` … モニター表示ページ
- `http://localhost:3000/admin` … 管理画面

## Vercel 公開時の注意

- Vercel の **Project Settings → Environment Variables** に `NEXT_PUBLIC_SUPABASE_URL` と `NEXT_PUBLIC_SUPABASE_ANON_KEY` を設定してください(Production / Preview 両方推奨)。
- 環境変数はビルド時にクライアントバンドルへ埋め込まれます。値を変更した場合は再デプロイが必要です。
- 画像は `<img>` タグでそのまま表示しており、`next/image` のリモート画像許可設定は不要です。
- モニター画面(`/screen/[locationId]`)は30秒ごとに投稿を再取得し、8秒ごとに表示を切り替えます。常時表示するデバイス(サイネージ等)では、ブラウザのスリープ・スクリーンセーバーを無効化してください。
- `/admin` に認証がないため、URLを知っていれば誰でもアクセスできます。研究用プロトタイプとしての利用に留め、公開範囲に注意してください。

## モニターで表示するURL例

各場所のモニター(デジタルサイネージ・タブレット等)のブラウザで、その場所専用のURLを開きます。`locationId` は場所ごとに任意の文字列(英数字推奨)を割り当てます。

```
https://your-app.vercel.app/screen/cafe-tanaka
https://your-app.vercel.app/screen/station-entrance
```

## QRコードの使い方

QRコードはモニター画面(`/screen/[locationId]`)の右下に自動表示され、その場所の投稿ページ(`/post/[locationId]`)のURLを埋め込んでいます。印刷して掲示したい場合は、以下のURLに対応するQRコードを別途生成してください。

```
https://your-app.vercel.app/post/cafe-tanaka
```

来訪者がこのQRコードを読み取ると投稿ページが開き、写真とひとことコメントをその場から投稿できます。

## 管理画面の使い方

`/admin` にアクセスすると、全投稿(非表示・期限切れを含む)が新しい順に一覧表示されます。

- 上部の入力欄に `location_id` を入力して「検索」すると、その場所の投稿のみに絞り込めます(空欄で全件表示)
- 各投稿には「表示中 / 非表示 / 期限切れ」のステータスが表示されます
- 不適切な投稿は「非表示にする」ボタンで `is_visible` を `false` にでき、即座にモニター画面から消えます
- 誤って非表示にした場合は「表示に戻す」で再表示できます
- 期限切れ(`expires_at` を過ぎた)の投稿は `is_visible` の値にかかわらずモニターには表示されません

## 動作確認の優先事項(研究プロトタイプとして)

まずは以下が確認できることを優先しています。

- [ ] QRコードからスマホで投稿できる
- [ ] 画像が Supabase Storage に保存される
- [ ] 投稿が `place_story_posts` テーブルに保存される
- [ ] モニター画面に24時間以内の投稿が表示される
- [ ] 投稿が一定時間(8秒)ごとに切り替わる
- [ ] モニター画面からQRコードを読み取って投稿ページに遷移できる
- [ ] 管理画面から不適切な投稿を非表示にできる
