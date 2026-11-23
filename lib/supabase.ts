import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

export type PublicExperience = {
  id: string;
  name: string;
  slug: string;
  description: string;
  thumbnail_url: string | null;
  banner_url: string | null;
  genre: string | null;
  roblox_place_id: string | null;
  featured: boolean;
};

export async function getPublishedExperiences(): Promise<PublicExperience[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("experiences")
    .select("id,name,slug,description,thumbnail_url,banner_url,genre,roblox_place_id,featured")
    .eq("status", "published")
    .order("featured", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(24);

  if (error) {
    console.error("ROBLOX HUB catalog query failed:", error.message);
    return [];
  }
  return (data ?? []) as PublicExperience[];
}
