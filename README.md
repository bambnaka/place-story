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
- [react-easy-crop](https://github.com/ricardo-ccestari/react-easy-crop)(投稿画像のトリミングUI)

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
  participant_id uuid,
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
- `participant_id`: 投稿した端末(ブラウザ)を識別するための匿名ID。ログイン機能がないため、`localStorage`に保存したUUIDを使って「同じ端末からの投稿は同一参加者」として扱い、参加人数の重複カウントを防ぐ(詳細は後述)
- `expires_at`: アプリ側で投稿作成時に「作成時刻 + 24時間」を計算して明示的に保存(テーブル側にデフォルト値は設定していません)

既存のテーブルに後から列を追加する場合は、以下だけ実行すれば大丈夫です。

```sql
alter table place_story_posts add column participant_id uuid;
```

> **注意**: `select` / `update` を anon ロールに広く許可しているのは、このプロトタイプが管理画面用の認証を持たないためです。本番運用する場合は Supabase Auth を導入し、管理系の操作は認証済みユーザーのみに制限してください。

## Supabase の `place_story_scans` テーブル作成SQL(QRコード読み取り回数の記録用)

投稿ページ(`/post/[locationId]`)が **QRコード経由で** 開かれたときだけ1行記録され、管理画面の「QR読み取り回数」に使われます。

モニターに表示されるQRコードには `?src=qr` という目印が付いたURL(例: `/post/cafe-tanaka?src=qr`)が埋め込まれています。この目印が無い状態でページを開いた場合(URLを直接入力・リンクを共有された・動作確認のためブラウザで開いた、など)はカウントされません。これはあくまで「URLにその目印が付いていたか」による簡易的な判定であり、実際にスマホのカメラで読み取ったことを技術的に証明するものではない点にご注意ください。

記録した直後に `history.replaceState` でURLから `?src=qr` を取り除いているため、同じ端末で投稿ページをリロードしても再カウントされません(目印はその1回のアクセスでしか残らない仕組みです)。

モニター画面はブラウザタブを開いたときに一度だけQRコードの中身を決めます。機能追加・修正のたびに、常時表示しているモニターのタブは**手動でリロード**しないと新しいQRコードに切り替わらない点にご注意ください。

```sql
create table place_story_scans (
  id uuid primary key default gen_random_uuid(),
  location_id text not null,
  participant_id uuid,
  created_at timestamp with time zone default now()
);

alter table place_story_scans enable row level security;
create policy "誰でも書ける_scans" on place_story_scans for insert with check (true);
create policy "誰でも読める_scans" on place_story_scans for select using (true);

grant select, insert on table public.place_story_scans to anon;
```

このテーブルが無くても投稿機能自体は問題なく動作します(記録に失敗しても投稿フローは止めない設計になっています)。管理画面の「QR読み取り回数」欄には `-` が表示され続けます。

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

## 管理画面からの完全削除機能を使うためのSQL

管理画面の「履歴を削除」ボタンは、投稿・QR読み取り履歴・Storage上の画像を完全に削除します(取り消せません)。これを使うには、通常の select/insert/update に加えて **delete 権限** を追加で付与する必要があります。

```sql
create policy "誰でも削除できる_ps" on place_story_posts for delete using (true);
grant delete on table public.place_story_posts to anon;

create policy "誰でも削除できる_scans" on place_story_scans for delete using (true);
grant delete on table public.place_story_scans to anon;

create policy "Allow public delete place-story-images"
  on storage.objects for delete
  to anon
  using (bucket_id = 'place-story-images');
```

このSQLを実行しない場合、削除ボタンを押すとエラーになりますが、それ以外の機能(投稿・モニター表示・非表示化など)には一切影響しません。

## Realtime(モニターの即時反映)の有効化

モニター画面は投稿を検知すると即座に表示を更新します(30秒ごとのポーリングは、これを取りこぼした場合の保険として併用しています)。この即時反映には、Supabaseの **Realtime** 機能をテーブルごとに有効化する必要があります。

1. Supabase ダッシュボード → **Database** → **Replication**
2. `place_story_posts` テーブルのトグルを **ON** にする

または **SQL Editor** で以下を実行しても同じです。

```sql
alter publication supabase_realtime add table place_story_posts;
```

これを設定しないと、モニター画面は30秒ごとのポーリングでのみ更新されます(機能自体は動きますが、反映が最大30秒遅れます)。

## モニターのカルーセル表示

モニター画面は投稿を横一列に並べたカルーセルで表示します。中央の1枚が画面いっぱいに大きく表示され、その前後の投稿は画面の左右の端からのぞくように薄く表示されます。12秒ごとに次の投稿へ自動で切り替わります。

## 投稿画像のトリミング(表示範囲の調整)

モニターは画像を横長(16:9)の枠に敷き詰めて表示するため、縦長の写真をそのまま投稿すると意図しない部分が切れてしまうことがあります。これを投稿者自身が確認・調整できるよう、投稿ページでは写真を選んだ直後にトリミング画面を表示します。

- ドラッグで表示位置を移動、スライダーで拡大・縮小できます
- 「この範囲に決定」でその範囲だけを切り抜いた画像がアップロードされます(切り抜き後の画像がそのままモニターに表示される画像そのものになります)
- 投稿確認画面に戻ってからも「表示範囲を調整し直す」から出し直せます
- 実装は `src/lib/cropImage.ts`(Canvasで実際に画像を切り抜く処理)と `react-easy-crop` を使っています

## 参加人数のカウント方法

画面右下のQRコードパネルに表示される「参加人数」は、**同じ端末からの複数投稿を1人として数えた**人数です。

- 投稿ページを開いたブラウザに、ログイン不要の匿名ID(UUID)を `localStorage` に保存します(`src/lib/participant.ts`)
- 投稿時にこのIDを `participant_id` として一緒に保存します
- モニターは `participant_id` の重複を除いた数を「参加人数」として表示します

そのため、同じ人が同じ端末・同じブラウザで何度QRコードを読み取って投稿しても、参加人数は1人のまま増えません。ただし以下の場合は別人として数えられます(匿名IDによる簡易的な識別のため、完全ではない点にご注意ください)。

- ブラウザのデータ(localStorage)を消去した場合
- 別のブラウザ・別の端末から投稿した場合
- シークレット/プライベートブラウジングモードで投稿した場合(タブを閉じるとIDが消える)

なお、この機能を追加する前に作成された投稿には `participant_id` が入っていないため、それらは投稿ごとに1人としてカウントされます。

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
- モニター画面(`/screen/[locationId]`)はRealtimeで新しい投稿を即座に検知し、30秒ごとの再取得も保険として併用しつつ、12秒ごとに表示を切り替えます。常時表示するデバイス(サイネージ等)では、ブラウザのスリープ・スクリーンセーバーを無効化してください。
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

### 実験用サマリー

投稿一覧の上に、研究で使えそうな集計を表示しています(`location_id` で絞り込むと、その場所だけの集計に切り替わります)。

- **QR読み取り回数 / 総投稿数 / 投稿率**: 投稿ページが開かれた回数(≒QRコードが読み取られた回数)と、実際に投稿された数、その割合。`place_story_scans` テーブルが無い場合は `-` 表示になります
- **参加人数 / 平均投稿回数/人 / 複数回投稿した人**: `participant_id` で重複を除いた集計
- **参加者ごとの投稿回数の表**: ニックネーム・投稿した場所・投稿回数・初回〜最終投稿の時間帯を一覧表示。投稿が2件以上ある参加者は「全◯件を見る」から、その人の全投稿時刻の履歴を展開して確認できます

### 履歴の完全削除

「実験用サマリー」の右上にある「〇〇の履歴を全削除」ボタンから、投稿・QR読み取り履歴・Storage上の画像を**完全に削除**できます。

- `location_id` で絞り込んでいる場合は、その場所のデータだけが削除されます
- 絞り込んでいない場合は、**全ての場所のデータ**が削除されます
- 確認ダイアログが出るので、内容をよく確認してから実行してください
- 一度削除すると元に戻せません
- 使うには前述の delete 権限のSQLを実行しておく必要があります

## 動作確認の優先事項(研究プロトタイプとして)

まずは以下が確認できることを優先しています。

- [ ] QRコードからスマホで投稿できる
- [ ] 画像が Supabase Storage に保存される
- [ ] 投稿が `place_story_posts` テーブルに保存される
- [ ] モニター画面に24時間以内の投稿が表示される
- [ ] 投稿が一定時間(12秒)ごとに切り替わる
- [ ] 新しい投稿がモニターに即座に(リアルタイムで)反映される
- [ ] 累計参加人数がモニター画面に表示される
- [ ] モニター画面からQRコードを読み取って投稿ページに遷移できる
- [ ] 管理画面から不適切な投稿を非表示にできる
