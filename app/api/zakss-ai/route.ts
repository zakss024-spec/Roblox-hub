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
  const clearlyHarmful =
    /\b(konten seksual eksplisit|pornografi|eksploitasi seksual|eksploitasi anak|pelecehan seksual|perdagangan manusia|cara membunuh orang|membunuh orang di dunia nyata|membuat bom|membuat bahan peledak|melukai orang sungguhan|serangan di dunia nyata)\b/i.test(normalized);
  if (clearlyHarmful) return "";

  const genres: Array<[RegExp, string]> = [
    [/\b(fps|first person shooter|shooter|tembak[ -]?tembakan|tembak menembak)\b/i, "Roblox FPS shooter"],
    [/\b(horror|horor|scary|spooky|seram|jumpscare)\b/i, "Roblox horror survival"],
    [/\b(zombie|undead)\b/i, "Roblox zombie survival"],
    [/\b(survival|bertahan hidup)\b/i, "Roblox survival game"],
    [/\b(sniper|aim training|latihan menembak)\b/i, "Roblox aim training"],
    [/\b(paintball|laser tag)\b/i, "Roblox paintball laser tag"],
    [/\b(battle royale)\b/i, "Roblox battle royale"],
    [/\b(combat|pertempuran|war game|perang dalam game|military)\b/i, "Roblox fictional combat game"],
    [/\b(murder mystery|mystery|misteri|detective)\b/i, "Roblox mystery detective"],
    [/\b(fighting|pertarungan|martial arts)\b/i, "Roblox fighting game"],
    [/\\b(escape|obby|simulator|roleplay|racing|balapan|adventure|petualangan)\\b/i, `Roblox ${normalized.match(/escape|obby|simulator|roleplay|racing|balapan|adventure|petualangan/i)?.[0] ?? "adventure"}`],
  ];
  const match = genres.find(([pattern]) => pattern.test(normalized));
  return match?.[1] ?? "";
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
              "Recommend a broad range of Roblox themes, including horror, scary, spooky, survival horror, escape horror, mystery, and mild jumpscare experiences, as well as obby, puzzle, creative building, roleplay, sports, racing, social hangouts, simulators, and adventure.",
              "Do NOT reject a request only because it asks for horror, scary, spooky, survival, escape, mystery, or jumpscare games. These are allowed entertainment genres; prefer non-graphic Roblox experiences.",
              "Only refuse requests that specifically seek sexual content, real-world harm, dangerous challenges, drugs, gambling, or instructions to bypass safety protections. Do not treat fictional horror themes as real-world harm.",
              "Do not help search for real-world weapons, drugs, gambling, dangerous challenges, sexual content, or ways to bypass safety rules. If the request asks for these, return allowed=false and a brief Indonesian explanation.",
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
