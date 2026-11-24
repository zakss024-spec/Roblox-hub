"use client";

import Link from "next/link";

import { useState } from "react";
import { ArrowUpRight, LoaderCircle, Send, Sparkles, Users, Eye, Gamepad2 } from "lucide-react";
import type { RobloxExperience } from "@/lib/roblox-discovery";

type Game = RobloxExperience;
type Stage = "idle" | "thinking" | "searching" | "done" | "error";

function compact(value: number | null) {
  return value === null ? "—" : new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function ZakssAIPage() {
  const [prompt, setPrompt] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const [message, setMessage] = useState("");
  const [games, setGames] = useState<Game[]>([]);

  async function recommend() {
    const request = prompt.trim();
    if (stage === "thinking" || stage === "searching") return;
    if (request.length < 2) {
      setStage("error");
      setMessage("Tulis dulu game yang ingin kamu cari, minimal 2 karakter.");
      return;
    }
    setGames([]);
    setStage("thinking");
    setMessage("Siap Zakss AI, loading di carikan sesuai permintaan pengguna...");
    try {
      const aiResponse = await fetch("/api/zakss-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: request }),
      });
      const ai = await aiResponse.json() as { allowed?: boolean; searchQuery?: string; explanation?: string; error?: string };
      if (!aiResponse.ok) throw new Error(ai.error || "Zakss AI sedang tidak tersedia.");
      if (ai.allowed === false) {
        setStage("error");
        setMessage(ai.explanation || "Zakss AI tidak bisa membantu permintaan tersebut. Coba tema game yang aman.");
        return;
      }
      if (!ai.searchQuery?.trim()) throw new Error("Zakss AI belum mendapatkan kata pencarian yang sesuai.");
      setStage("searching");
      setMessage("Siap! Zakss AI sedang mencari map Roblox yang cocok...");
      const searchResponse = await fetch(`/api/roblox/search?q=${encodeURIComponent(ai.searchQuery.trim().slice(0, 80))}`);
      const result = await searchResponse.json() as { games?: Game[]; error?: string };
      if (!searchResponse.ok) throw new Error(result.error || "Pencarian Roblox sedang bermasalah.");
      const found = result.games ?? [];
      setGames(found);
      setStage("done");
      setMessage(found.length
        ? "Zakss AI telah menyarankan map ini berdasarkan permintaan kamu:"
        : "Zakss AI belum menemukan map yang cocok. Coba gunakan deskripsi yang lebih sederhana.");
    } catch (error) {
      setStage("error");
      setMessage(error instanceof Error ? error.message : "Zakss AI gagal memproses permintaan.");
    }
  }

  const busy = stage === "thinking" || stage === "searching";
  return (
    <main className="zakss-ai-page">
      <section className="zakss-ai-hero">
        <div className="zakss-ai-orbit orbit-a"/><div className="zakss-ai-orbit orbit-b"/>
        <div className="zakss-ai-hero-inner">
          <span className="zakss-ai-label"><Sparkles size={14}/> ROBLOX HUB INTELLIGENCE</span>
          <div className="zakss-ai-mascot"><Sparkles size={38}/><b>AI</b></div>
          <h1>MEET <span>ZAKSS AI.</span></h1>
          <p>Kasih tahu map seperti apa yang ingin kamu mainkan. Zakss AI akan memahami permintaanmu dan mencarikan pengalaman Roblox yang relevan.</p>
          <div className="zakss-ai-prompt">
            <textarea value={prompt} maxLength={500} onChange={(event) => setPrompt(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void recommend(); } }} placeholder="Contoh: carikan map roleplay kota yang seru dimainkan bareng teman..." aria-label="Permintaan rekomendasi map Roblox"/>
            <button type="button" onClick={() => void recommend()} disabled={busy}><Send size={17}/>{busy ? "SEDANG MENCARI..." : "TANYA ZAKSS AI"}</button>
          </div>
          <small className="zakss-ai-hint">ENTER UNTUK KIRIM · SHIFT + ENTER UNTUK BARIS BARU</small>
        </div>
      </section>
      {message && (
        <section className={`zakss-ai-response ${stage}`} aria-live="polite">
          <div className="zakss-ai-response-icon">{busy ? <LoaderCircle size={22}/> : <Sparkles size={22}/>}</div>
          <div><span className="zakss-ai-response-kicker">{busy ? "ZAKSS AI SEDANG BEKERJA" : stage === "error" ? "ZAKSS AI NOTICE" : "ZAKSS AI RECOMMENDATION"}</span><h2>{message}</h2></div>
        </section>
      )}
      {games.length > 0 && (
        <section className="zakss-ai-recommendations">
          <div className="zakss-ai-results-heading"><span>AI PICKS / {String(games.length).padStart(2, "0")}</span><h2>MAP PILIHAN ZAKSS AI.</h2></div>
          <div className="zakss-ai-game-grid">
            {games.map((game, index) => (
              <article className="zakss-ai-game-card" key={game.id}>
                <div className="zakss-ai-game-art">{game.thumbnailUrl ? <img src={game.thumbnailUrl} alt={game.name}/> : <Gamepad2 size={48}/>}<span>#{String(index + 1).padStart(2, "0")}</span></div>
                <div className="zakss-ai-game-copy"><small>{game.genre || "ROBLOX EXPERIENCE"}</small><h3>{game.name}</h3><p>{game.description || "Buka pengalaman ini di Roblox untuk melihat detail selengkapnya."}</p><div className="zakss-ai-game-stats"><span><Users size={13}/>{compact(game.playing)} PLAYING</span><span><Eye size={13}/>{compact(game.visits)} VISITS</span></div><Link href={`/game/${game.placeId}`}>GAME DETAILS <ArrowUpRight size={15}/></Link><a href={game.url} target="_blank" rel="noreferrer">BUKA DI ROBLOX <ArrowUpRight size={15}/></a></div>
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
