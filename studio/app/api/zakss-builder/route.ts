import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TYPES = new Set(["block", "platform", "coin", "checkpoint", "tree"]);
const COLORS = /^#[0-9a-fA-F]{6}$/;

export async function POST(request: NextRequest) {
  const apiKey = process.env.XKIRO_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Zakss AI Builder belum dikonfigurasi." }, { status: 503 });
  let body: { prompt?: unknown; existingCount?: unknown };
  try { body = await request.json() as typeof body; } catch { return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400 }); }
  const prompt = typeof body.prompt === "string" ? body.prompt.trim().slice(0, 500) : "";
  const existingCount = Number(body.existingCount) || 0;
  if (prompt.length < 3) return NextResponse.json({ error: "Tulis ide bangunan dulu, bro." }, { status: 400 });
  if (existingCount >= 200) return NextResponse.json({ error: "Dunia sudah mencapai batas 200 objek." }, { status: 400 });
  const normalizedPrompt = prompt.toLowerCase();
  const asksSoil = /\b(tanah|soil|dirt|ground|terrain)\b/.test(normalizedPrompt);
  const asksGrass = /\b(rumput|grass|grassy)\b/.test(normalizedPrompt);
  if (asksSoil && asksGrass) {
    if (200 - existingCount < 2) return NextResponse.json({ error: "Butuh ruang untuk 2 objek terrain. Hapus satu objek dulu ya." }, { status: 400 });
    return NextResponse.json({
      objects: [
        { type: "platform", x: 0, y: 0, z: 0, w: 18, h: .6, d: 18, color: "#80502d" },
        { type: "platform", x: 0, y: .6, z: 0, w: 18, h: .2, d: 18, color: "#58a94f" }
      ],
      summary: "Tanah dan rumput 3D sudah jadi nih broo!"
    }, { headers: { "Cache-Control": "no-store" } });
  }
  const base = (process.env.XKIRO_BASE_URL || "https://api.xkiro.com/v1").replace(/\/+$/, "");
  const model = process.env.XKIRO_MODEL || "mistralai/mistral-large-2512";
  try {
    const response = await fetch(base + "/chat/completions", {
      method: "POST",
      headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: [
            "You are Zakss AI Builder for a 3D block-based game editor.",
            "Convert the user's Indonesian or English building idea into a small set of concrete 3D scene objects.",
            "Return ONLY JSON: {\"objects\":[{\"type\":\"block|platform|coin|checkpoint\",\"x\":0,\"y\":0,\"z\":0,\"w\":1,\"h\":1,\"d\":1,\"color\":\"#RRGGBB\"}],\"summary\":\"short friendly Indonesian completion message\"}.",
            "Coordinates are relative to world origin. Ground level is y=0. Platforms should sit at y=0. Blocks use their bottom as y=0 in the editor. Use platform for broad ground, paths and floors; use blocks for rocks, walls and decorations. Use tree for a complete stylized tree with a brown trunk and green foliage; tree objects should have w/d around 1.5 and h around 3, y=0.",
            "For a request to add soil and grass, create a broad brown dirt platform (y=0, h around 0.6) and a green grass platform just above it (y=0.6, h around 0.2), both centered near origin, with sensible sizes. If the prompt asks for trees or a forest, use tree objects with varied positions and sizes; avoid placing them all on top of each other. Do not generate code, scripts, URLs or unsafe instructions.",
            "Create 1 to 18 objects only. Keep every coordinate between -20 and 20, dimensions between 0.25 and 20, and use only the listed object types. Preserve existing scene by adding objects only; never delete or edit existing objects.",
            "Keep all content age-appropriate and non-graphic. If the request is unrelated to safe game building, return {\"objects\":[],\"summary\":\"Coba perintah untuk membangun dunia game 3D ya.\"}."
          ].join(" ") },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
        max_tokens: 1200
      }),
      signal: AbortSignal.timeout(25000),
      cache: "no-store"
    });
    const data = await response.json().catch(() => null) as { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } } | null;
    if (!response.ok) {
      console.error("Zakss Builder provider error", response.status, data?.error?.message || "");
      return NextResponse.json({ error: "Zakss AI Builder sedang sibuk. Coba lagi sebentar." }, { status: 502 });
    }
    const raw = data?.choices?.[0]?.message?.content || "";
    const parsed = JSON.parse(raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")) as { objects?: unknown; summary?: unknown };
    const candidates = Array.isArray(parsed.objects) ? parsed.objects.slice(0, Math.min(18, 200 - existingCount)) : [];
    const objects = candidates.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const o = item as Record<string, unknown>;
      const num = (key: string, fallback: number) => { const v = Number(o[key]); return Number.isFinite(v) ? Math.max(key === "w" || key === "h" || key === "d" ? .25 : -20, Math.min(key === "w" || key === "h" || key === "d" ? 20 : 20, v)) : fallback; };
      const type = String(o.type || "");
      if (!TYPES.has(type)) return [];
      const color = typeof o.color === "string" && COLORS.test(o.color) ? o.color : "#72a957";
      return [{ type, x: num("x", 0), y: num("y", 0), z: num("z", 0), w: num("w", 1), h: num("h", 1), d: num("d", 1), color }];
    });
    return NextResponse.json({ objects, summary: typeof parsed.summary === "string" ? parsed.summary.slice(0, 180) : "Sudah jadi nih broo!" }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Zakss Builder error", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Zakss AI Builder gagal memproses ide. Coba perintah yang lebih sederhana." }, { status: 502 });
  }
}
