import { NextRequest, NextResponse } from "next/server";

type UnknownRecord = Record<string, unknown>;

type RobloxSearchGame = {
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

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as UnknownRecord
    : null;
}

function numeric(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function collectGames(value: unknown, output: UnknownRecord[] = [], depth = 0): UnknownRecord[] {
  if (depth > 7 || value == null) return output;
  if (Array.isArray(value)) {
    for (const item of value) collectGames(item, output, depth + 1);
    return output;
  }
  const record = asRecord(value);
  if (!record) return output;

  const nested = asRecord(record.game) ?? asRecord(record.universe) ?? record;
  const name = typeof nested.name === "string" ? nested.name : "";
  const placeId = numeric(nested.rootPlaceId) ?? numeric(nested.placeId);
  const universeId = numeric(nested.universeId) ?? numeric(nested.id);
  if (name && (placeId || universeId)) output.push(nested);

  for (const [key, child] of Object.entries(record)) {
    if (key !== "game" && key !== "universe") collectGames(child, output, depth + 1);
  }
  return output;
}

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "ROBLOX-HUB/1.0" },
      next: { revalidate: 180 },
    });
    if (!response.ok) return null;
    return await response.json() as T;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const cursor = request.nextUrl.searchParams.get("cursor")?.trim() ?? "";
  if (query.length < 1 || query.length > 80 || cursor.length > 1500) {
    return NextResponse.json({ games: [], nextCursor: null, error: "Invalid search." }, { status: 400 });
  }

  const searchUrl = new URL("https://apis.roblox.com/search-api/omni-search");
  searchUrl.searchParams.set("searchQuery", query);
  searchUrl.searchParams.set("sessionId", "roblox-hub-discover");
  searchUrl.searchParams.set("pageType", "all");
  if (cursor) searchUrl.searchParams.set("pageToken", cursor);

  const search = await getJson<UnknownRecord>(searchUrl.toString());
  if (!search) {
    return NextResponse.json({ games: [], nextCursor: null, error: "Roblox search is temporarily unavailable." }, { status: 502 });
  }

  const candidates = collectGames(search.searchResults ?? search.results ?? search.data);
  const unique = new Map<string, UnknownRecord>();
  for (const game of candidates) {
    const placeId = numeric(game.rootPlaceId) ?? numeric(game.placeId);
    const universeId = numeric(game.universeId) ?? numeric(game.id);
    const key = String(universeId ?? placeId ?? "");
    if (key && !unique.has(key)) unique.set(key, game);
  }
  const rows = [...unique.values()].slice(0, 30);
  const universeIds = rows.map((game) => numeric(game.universeId) ?? numeric(game.id)).filter((id): id is number => id !== null).slice(0, 50);

  const [metadata, thumbnailData] = await Promise.all([
    universeIds.length
      ? getJson<{ data?: Array<{ id: number; name?: string; description?: string; playing?: number; visits?: number; creator?: { name?: string }; rootPlaceId?: number }> }>(
          `https://games.roblox.com/v1/games?universeIds=${universeIds.join(",")}`,
        )
      : Promise.resolve(null),
    universeIds.length
      ? getJson<{ data?: Array<{ targetId: number; imageUrl?: string }> }>(
          `https://thumbnails.roblox.com/v1/games/icons?universeIds=${universeIds.join(",")}&size=512x512&format=Png&isCircular=false`,
        )
      : Promise.resolve(null),
  ]);

  const metadataById = new Map((metadata?.data ?? []).map((game) => [game.id, game]));
  const thumbnailsById = new Map((thumbnailData?.data ?? []).map((item) => [item.targetId, item.imageUrl ?? null]));
  const games: RobloxSearchGame[] = rows.map((raw) => {
    const universeId = numeric(raw.universeId) ?? numeric(raw.id);
    const placeId = numeric(raw.rootPlaceId) ?? numeric(raw.placeId) ?? numeric(asRecord(raw.rootPlace)?.id);
    const details = universeId ? metadataById.get(universeId) : undefined;
    const creatorRecord = asRecord(raw.creator);
    const name = details?.name ?? (typeof raw.name === "string" ? raw.name : "Roblox experience");
    const finalPlaceId = details?.rootPlaceId ?? placeId;
    return {
      id: `roblox-search-${universeId ?? finalPlaceId ?? name}`,
      placeId: finalPlaceId ?? 0,
      universeId,
      name,
      description: details?.description ?? (typeof raw.description === "string" ? raw.description : ""),
      creator: details?.creator?.name ?? (typeof raw.creatorName === "string" ? raw.creatorName : typeof creatorRecord?.name === "string" ? creatorRecord.name : "Roblox creator"),
      genre: typeof raw.genre === "string" ? raw.genre : "Roblox experience",
      playing: details?.playing ?? numeric(raw.playerCount),
      visits: details?.visits ?? numeric(raw.totalVisits),
      thumbnailUrl: universeId ? thumbnailsById.get(universeId) ?? null : null,
      url: finalPlaceId ? `https://www.roblox.com/games/${finalPlaceId}` : "https://www.roblox.com/charts",
      source: "ROBLOX" as const,
    };
  }).filter((game) => game.name && game.placeId > 0);

  const nextCursor = typeof search.nextPageToken === "string"
    ? search.nextPageToken
    : typeof search.nextPageCursor === "string" ? search.nextPageCursor : null;

  return NextResponse.json({ games, nextCursor });
}
