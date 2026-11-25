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
  const room = 200 - existingCount;
  const asksCity = /\b(kota|city|town|perumahan)\b/.test(normalizedPrompt);
  if (asksCity) {
    const city = [
      { type: "platform", x: 0, y: 0, z: 0, w: 22, h: .4, d: 22, color: "#55585d" },
      ...[
        [-7, -7, 3.5, 6, 5, "#6d879d"], [-1, -7, 4.5, 5, 6, "#b78a63"],
        [6, -7, 3.2, 6, 4, "#8c9c75"], [-7, 5, 4.2, 5, 6, "#9a7caa"],
        [0, 5, 5.2, 6, 5, "#b6a16d"], [7, 5, 3.8, 5, 5, "#739da0"]
      ].map(([x, z, h, w, d, color]) => ({ type: "block", x, y: .4, z, w, h, d, color }))
    ];
    if (room < city.length) return NextResponse.json({ error: "Butuh ruang untuk 7 objek kota. Hapus beberapa objek dulu ya." }, { status: 400 });
    return NextResponse.json({ objects: city, summary: "Kota kecil 3D sudah jadi nih broo!" }, { headers: { "Cache-Control": "no-store" } });
  }
  const asksBridge = /\b(jembatan|bridge)\b/.test(normalizedPrompt);
  if (asksBridge) {
    const bridge = [
      { type: "platform", x: 0, y: 0, z: 0, w: 14, h: .3, d: 12, color: "#287fa8" },
      { type: "platform", x: 0, y: .45, z: 0, w: 4, h: .35, d: 12, color: "#9b7048" },
      ...[-5, -2.5, 0, 2.5, 5].map((z) => ({ type: "platform", x: 0, y: .48, z, w: .18, h: .7, d: .18, color: "#d3b58a" }))
    ];
    if (room < bridge.length) return NextResponse.json({ error: "Butuh ruang untuk 7 objek jembatan. Hapus beberapa objek dulu ya." }, { status: 400 });
    return NextResponse.json({ objects: bridge, summary: "Jembatan 3D sudah jadi nih broo!" }, { headers: { "Cache-Control": "no-store" } });
  }
  const asksRoad = /\b(jalan|road|path|lintasan|track)\b/.test(normalizedPrompt);
  if (asksRoad) {
    const road = [
      { type: "platform", x: 0, y: 0, z: 0, w: 4, h: .25, d: 20, color: "#34363a" },
      ...[-8, -4, 0, 4, 8].map((z) => ({ type: "platform", x: 0, y: .13, z, w: .18, h: .03, d: 1.6, color: "#f2d75c" }))
    ];
    if (room < road.length) return NextResponse.json({ error: "Butuh ruang untuk 6 objek jalan. Hapus beberapa objek dulu ya." }, { status: 400 });
    return NextResponse.json({ objects: road, summary: "Jalan 3D sudah jadi nih broo!" }, { headers: { "Cache-Control": "no-store" } });
  }
  const asksForest = /\b(hutan|forest|woods|woodland)\b/.test(normalizedPrompt);
  if (asksForest) {
    const forest = [
      { type: "platform", x: 0, y: 0, z: 0, w: 20, h: .4, d: 20, color: "#80502d" },
      ...[
        [-6, -5, 1.1], [-2, -6, .9], [3, -5, 1.2], [7, -3, .95],
        [-7, 2, 1.0], [-3, 5, 1.15], [2, 4, .9], [6, 6, 1.1]
      ].map(([x, z, scale]) => ({ type: "tree", x, y: .4, z, w: 1.5 * scale, h: 3 * scale, d: 1.5 * scale, color: "#3d8d43" }))
    ];
    if (room < forest.length) return NextResponse.json({ error: "Butuh ruang untuk 8 objek hutan. Hapus beberapa objek dulu ya." }, { status: 400 });
    return NextResponse.json({ objects: forest, summary: "Hutan kecil 3D sudah jadi nih broo!" }, { headers: { "Cache-Control": "no-store" } });
  }
  const asksHouse = /\b(rumah|house|cottage|pondok)\b/.test(normalizedPrompt);
  if (asksHouse) {
    const house = [
      { type: "platform", x: 0, y: 0, z: 0, w: 6.5, h: .4, d: 6.5, color: "#8b8d91" },
      { type: "block", x: 0, y: .4, z: 0, w: 5.5, h: 3, d: 5.5, color: "#e8d5b5" },
      { type: "block", x: 0, y: .4, z: -2.82, w: 1.1, h: 2, d: .16, color: "#75442c" },
      { type: "block", x: -1.55, y: 1.35, z: -2.83, w: .85, h: .85, d: .16, color: "#74c9e8" },
      { type: "block", x: 1.55, y: 1.35, z: -2.83, w: .85, h: .85, d: .16, color: "#74c9e8" },
      { type: "block", x: 0, y: 3.4, z: 0, w: 6.4, h: .75, d: 6.4, color: "#a84432" },
      { type: "block", x: 0, y: 4.15, z: 0, w: 4.8, h: .7, d: 4.8, color: "#8d3529" }
    ];
    if (room < house.length) return NextResponse.json({ error: "Butuh ruang untuk 7 objek rumah. Hapus beberapa objek dulu ya." }, { status: 400 });
    return NextResponse.json({ objects: house, summary: "Rumah sederhana 3D sudah jadi nih broo!" }, { headers: { "Cache-Control": "no-store" } });
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
            "Return ONLY JSON: {\"objects\":[{\"type\":\"block|platform|coin|checkpoint|tree\",\"x\":0,\"y\":0,\"z\":0,\"w\":1,\"h\":1,\"d\":1,\"color\":\"#RRGGBB\"}],\"summary\":\"short friendly Indonesian completion message\"}.",
            "Coordinates are relative to world origin. Ground level is y=0. Platforms should sit at y=0. Blocks use their bottom as y=0 in the editor. Use platform for broad ground, paths and floors; use blocks for rocks, walls and decorations. Use tree for a complete stylized tree with a brown trunk and green foliage; tree objects should have w/d around 1.5 and h around 3, y=0.",
            "For a request to add soil and grass, create a broad brown dirt platform (y=0, h around 0.6) and a green grass platform just above it (y=0.6, h around 0.2), both centered near origin, with sensible sizes. If the prompt asks for trees or a forest, use tree objects with varied positions and sizes; avoid placing them all on top of each other. For houses, build a foundation, walls, door, windows and layered roof using blocks and platforms. Do not generate code, scripts, URLs or unsafe instructions.",
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
