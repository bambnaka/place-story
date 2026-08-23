import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Supabaseの環境変数(NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY)が設定されていません。.env.localを確認してください。"
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const POSTS_TABLE = "place_story_posts";
export const POST_IMAGES_BUCKET = "place-story-images";
