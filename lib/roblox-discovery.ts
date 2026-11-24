export type RobloxExperience = {
  id: string;
  placeId: number;
  universeId: number | null;
  name: string;
  description: string;
  creator: string;
  genre: string;
  playing: number | null;
  visits: number | null;
  thumbnailUrl: string | null;
  url: string;
  source: "ROBLOX";
};

// Curated starter catalog. Roblox's public Games API supplies current names,
// descriptions, creator, player counts and visit counts when available.
const STARTER_PLACES = [
  { placeId: 4924922222, genre: "Roleplay", fallbackName: "Brookhaven 🏡 RP" },
  { placeId: 920587237, genre: "Pets", fallbackName: "Adopt Me!" },
  { placeId: 126884695634066, genre: "Simulator", fallbackName: "Grow a Garden" },
  { placeId: 15101393044, genre: "Fashion", fallbackName: "Dress To Impress" },
  { placeId: 1962086868, genre: "Obby", fallbackName: "Tower of Hell" },
  { placeId: 8737899170, genre: "Simulator", fallbackName: "Pet Simulator 99!" },
  { placeId: 1537690962, genre: "Simulator", fallbackName: "Bee Swarm Simulator" },
  { placeId: 537413528, genre: "Building", fallbackName: "Build A Boat For Treasure" },
  { placeId: 189707, genre: "Survival", fallbackName: "Natural Disaster Survival" },
  { placeId: 192800, genre: "Roleplay", fallbackName: "Work at a Pizza Place" },
  { placeId: 69184822, genre: "Tycoon", fallbackName: "Theme Park Tycoon 2" },
  { placeId: 3398014311, genre: "Tycoon", fallbackName: "Restaurant Tycoon 2" },
  { placeId: 183364845, genre: "Obby", fallbackName: "Speed Run 4" },
  { placeId: 185655149, genre: "Roleplay", fallbackName: "Welcome to Bloxburg" },
  { placeId: 370731277, genre: "Social", fallbackName: "MeepCity" },
  { placeId: 735030788, genre: "Roleplay", fallbackName: "Royale High" },
  { placeId: 6737970321, genre: "Roleplay", fallbackName: "Livetopia" },
  { placeId: 8481844229, genre: "Roleplay", fallbackName: "Berry Avenue" },
  { placeId: 6516141723, genre: "Horror", fallbackName: "DOORS" },
  { placeId: 4623386862, genre: "Horror", fallbackName: "Piggy" },
  { placeId: 7991339063, genre: "Adventure", fallbackName: "Rainbow Friends" },
  { placeId: 9872472334, genre: "Survival", fallbackName: "Evade" },
  { placeId: 2768379856, genre: "Survival", fallbackName: "3008" },
  { placeId: 738339342, genre: "Escape", fallbackName: "Flood Escape 2" },
  { placeId: 277751860, genre: "Minigames", fallbackName: "Epic Minigames" },
  { placeId: 2913303231, genre: "Building", fallbackName: "Obby Creator" },
  { placeId: 13822889, genre: "Building", fallbackName: "Lumber Tycoon 2" },
];

type PlaceDetails = {
  placeId: number;
  name?: string;
  description?: string;
  builder?: string;
  url?: string;
  universeId?: number;
  isPlayable?: boolean;
};

type GameDetails = {
  id: number;
  name?: string;
  description?: string;
  creator?: { name?: string };
  playing?: number;
  visits?: number;
  rootPlaceId?: number;
};

type ThumbnailResponse = {
  data?: Array<{ targetId: number; imageUrl?: string; state?: string }>;
};

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "ROBLOX-HUB/1.0" },
      next: { revalidate: 300 },
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function getRobloxFeaturedExperiences(): Promise<RobloxExperience[]> {
  const placeIds = STARTER_PLACES.map((game) => game.placeId);
  const details = await fetchJson<PlaceDetails[]>(
    `https://games.roblox.com/v1/games/multiget-place-details?placeIds=${placeIds.join(",")}`,
  );
  const byPlace = new Map((details ?? []).map((item) => [item.placeId, item]));
  const universeIds = [...new Set((details ?? []).map((item) => item.universeId).filter((id): id is number => Boolean(id)))];

  const [gameResponse, thumbnailResponse] = await Promise.all([
    universeIds.length
      ? fetchJson<{ data?: GameDetails[] }>(`https://games.roblox.com/v1/games?universeIds=${universeIds.join(",")}`)
      : Promise.resolve(null),
    fetchJson<ThumbnailResponse>(
      `https://thumbnails.roblox.com/v1/places/gameicons?placeIds=${placeIds.join(",")}&size=512x512&format=Png&isCircular=false`,
    ),
  ]);

  const gamesByUniverse = new Map((gameResponse?.data ?? []).map((game) => [game.id, game]));
  const thumbnailsByPlace = new Map((thumbnailResponse?.data ?? []).map((item) => [item.targetId, item.imageUrl ?? null]));

  return STARTER_PLACES.map((starter) => {
    const place = byPlace.get(starter.placeId);
    const game = place?.universeId ? gamesByUniverse.get(place.universeId) : undefined;
    return {
      id: `roblox-${starter.placeId}`,
      placeId: starter.placeId,
      universeId: place?.universeId ?? null,
      name: game?.name?.trim() || place?.name?.trim() || starter.fallbackName,
      description: game?.description?.trim() || place?.description?.trim() || "Open this experience on Roblox to see its latest details.",
      creator: game?.creator?.name || place?.builder || "Roblox creator",
      genre: starter.genre,
      playing: typeof game?.playing === "number" ? game.playing : null,
      visits: typeof game?.visits === "number" ? game.visits : null,
      thumbnailUrl: thumbnailsByPlace.get(starter.placeId) ?? null,
      url: place?.url || `https://www.roblox.com/games/${starter.placeId}`,
      source: "ROBLOX" as const,
    };
  }).filter((game) => game.name.length > 0);
}
