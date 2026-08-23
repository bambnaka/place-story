export interface Post {
  id: string;
  location_id: string;
  image_url: string;
  image_path: string;
  comment: string | null;
  nickname: string | null;
  participant_id: string | null;
  is_visible: boolean;
  created_at: string;
  expires_at: string;
}
