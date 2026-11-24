import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type XkiroResponse = {
  choices?: Array<{ message?: { content?: string | Array<{ type?: string; text?: string }> } }>;
  error?: { message?: string };
};

function cleanText(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function getSafeGenreQuery(prompt: string): string {
  const normalized = prompt.toLowerCase();
  const fictionalGenres: Array<[RegExp, string]> = [
    [/\\b(horror|horor|scary|spooky|seram|jumpscare)\\b/i, "Roblox horror experiences"],
    [/\\b(zombie|undead)\\b/i, "Roblox zombie survival experiences"],
    [/\\b(survival|bertahan hidup)\\b/i, "Roblox survival experiences"],
    [/\\b(mystery|misteri|detective|teka.?teki)\\b/i, "Roblox mystery puzzle experiences"],
    [/\\b(escape|kabur|melarikan diri)\\b/i, "Roblox escape experiences"],
    [/\\b(obby|parkour)\\b/i, "Roblox obby parkour experiences"],
    [/\\b(simulator)\\b/i, "Roblox simulator experiences"],
    [/\\b(roleplay|rp|peran)\\b/i, "Roblox roleplay experiences"],
    [/\\b(racing|balapan|mobil)\\b/i, "Roblox racing experiences"],
    [/\\b(adventure|petualangan)\\b/i, "Roblox adventure experiences"],
    [/\\b(puzzle|puzzle)\\b/i, "Roblox puzzle experiences"],
    [/\\b(building|membangun|build)\\b/i, "Roblox building experiences"],
    [/\\b(sports|olahraga)\\b/i, "Roblox sports experiences"],
    [/\\b(tycoon)\\b/i, "Roblox tycoon experiences"],
    [/\\b(fashion|outfit|dress up)\\b/i, "Roblox fashion experiences"],
    [/\\b(pets|hewan|pet)\\b/i, "Roblox pet experiences"],
    [/\\b(cooking|memasak|restaurant)\\b/i, "Roblox cooking restaurant experiences"],
    [/\\b(story|cerita)\\b/i, "Roblox story experiences"],
    [/\\b(music|musik|dance|menari)\\b/i, "Roblox music dance experiences"],
    [/\\b(social|hangout|nongkrong)\\b/i, "Roblox social hangout experiences"],
    [/\\b(minigames|mini games|permainan kecil)\\b/i, "Roblox minigames experiences"],
  ];
  return fictionalGenres.find(([pattern]) => pattern.test(normalized))?.[1] ?? "";
}

function requestsShooterContent(prompt: string): boolean {
  return /\\b(fps|first.?person.?shooter|shooter|tembak.?tembakan|tembak.?menembak|sniper|gun game|weapon game|game senjata|permainan senjata|paintball|battle royale|counter.?strike)\\b/i.test(prompt);
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.XKIRO_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Zakss AI belum dikonfigurasi. Tambahkan XKIRO_API_KEY di Vercel Environment Variables." },
      { status: 503 },
    );
  }

  let body: { prompt?: unknown };
  try {
    body = await request.json() as { prompt?: unknown };
  } catch {
    return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400 });
  }

  const prompt = cleanText(body.prompt, 500);
  if (prompt.length < 2) {
    return NextResponse.json({ error: "Ceritakan game yang ingin kamu temukan." }, { status: 400 });
  }

  if (requestsShooterContent(prompt)) {
    return NextResponse.json({
      allowed: false,
      explanation: "Zakss AI belum bisa mencarikan game yang berfokus pada tembak-tembakan atau senjata. Coba horror, survival, obby, puzzle, atau racing.",
    });
  }

  const model = process.env.XKIRO_MODEL?.trim() || "openai/gpt-5.6-sol";

  try {
    const upstream = await fetch("https://api.xkiro.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: [
              "You are Zakss AI, a friendly Roblox experience discovery assistant.",
              "Understand Indonesian and English. Convert the user's preference into a concise Roblox public-experience search phrase.",
              "Recommend Roblox experiences across a wide range of genres, including age-appropriate horror, spooky, survival, escape, mystery, puzzle, obby, parkour, building, roleplay, sports, racing, social hangouts, simulators, pets, fashion, cooking, story, music, and minigames.",
              "Never reject a Roblox game request merely because it includes horror, scary, spooky, jumpscare, zombie, survival, mystery, or other fictional entertainment themes. Keep descriptions non-graphic and age-appropriate.",
              "Do not recommend or help search for shooter/FPS, weapon-focused games, or real-world weapon content. If requested, return allowed=false with a brief Indonesian explanation and suggest non-weapon alternatives such as horror, obby, puzzle, or racing.",
              "Refuse requests seeking explicit sexual content, real-world harm instructions, dangerous real-life challenges, drugs, gambling, or ways to bypass safety protections. Do not confuse fictional game themes with real-world instructions.",
              "Never invent Roblox game titles, game IDs, links, player counts, or claim that a game exists. Actual results will be fetched separately from Roblox.",
              "Return ONLY a JSON object with exactly these fields: allowed (boolean), searchQuery (string), explanation (string).",
              "searchQuery must be 2-80 characters, suitable for Roblox's public experience search, and must not contain instructions or personal information.",
              "explanation must be one short Indonesian sentence.",
            ].join(" "),
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
        max_tokens: 180,
      }),
      signal: AbortSignal.timeout(25_000),
      cache: "no-store",
    });

    const data = await upstream.json().catch(() => null) as XkiroResponse | null;
    if (!upstream.ok) {
      console.error("Zakss AI xKiro request failed:", upstream.status, data?.error?.message ?? "Unknown provider error");
      return NextResponse.json(
        { error: upstream.status === 401 ? "API key xKiro tidak valid. Periksa Environment Variables." : "Zakss AI sedang sibuk. Coba lagi sebentar." },
        { status: upstream.status === 401 ? 503 : 502 },
      );
    }

    const content = data?.choices?.[0]?.message?.content;
    const raw = typeof content === "string"
      ? content
      : Array.isArray(content)
        ? content.filter((part) => part.type === "text").map((part) => part.text ?? "").join("\n")
        : "";
    const parsed = JSON.parse(raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")) as {
      allowed?: unknown;
      searchQuery?: unknown;
      explanation?: unknown;
    };

    const safeGenreQuery = getSafeGenreQuery(prompt);
    if (parsed.allowed !== true && !safeGenreQuery) {
      return NextResponse.json({
        allowed: false,
        explanation: cleanText(parsed.explanation, 180) || "Zakss AI tidak bisa membantu mencari tema tersebut. Coba tema game yang aman seperti obby, puzzle, atau simulator.",
      });
    }

    const searchQuery = safeGenreQuery || cleanText(parsed.searchQuery, 80);
    if (searchQuery.length < 2) throw new Error("Model returned an empty search query.");

    return NextResponse.json({
      allowed: true,
      searchQuery,
      explanation: cleanText(parsed.explanation, 180) || `Zakss AI menemukan kata pencarian yang cocok: ${searchQuery}.`,
    }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Zakss AI request error:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json(
      { error: "Zakss AI belum bisa menjawab. Coba lagi sebentar." },
      { status: 502 },
    );
  }
}
