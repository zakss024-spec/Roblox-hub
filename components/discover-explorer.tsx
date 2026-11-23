"use client";

import { useMemo, useState } from "react";
import {
  ArrowUpRight, Compass, Flame, Gamepad2, Search, Sparkles, Users, Eye,
} from "lucide-react";
import type { PublicExperience } from "@/lib/supabase";
import type { RobloxExperience } from "@/lib/roblox-discovery";

type Props = {
  robloxGames: RobloxExperience[];
  communityGames: PublicExperience[];
};

type DiscoverItem = {
  id: string;
  name: string;
  description: string;
  genre: string;
  creator: string;
  image: string | null;
  href: string | null;
  source: "ROBLOX" | "COMMUNITY";
  playing: number | null;
  visits: number | null;
};

const categories = ["All", "Roleplay", "Simulator", "Fashion", "Obby", "Adventure", "Survival", "Tycoon"];

function compact(value: number | null) {
  if (value === null) return "—";
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function DiscoverExplorer({ robloxGames, communityGames }: Props) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState<"active" | "visits" | "community">("active");

  const officialItems = useMemo<DiscoverItem[]>(() => robloxGames.map((game) => ({
    id: game.id,
    name: game.name,
    description: game.description,
    genre: game.genre,
    creator: game.creator,
    image: game.thumbnailUrl,
    href: game.url,
    source: "ROBLOX",
    playing: game.playing,
    visits: game.visits,
  })), [robloxGames]);

  const communityItems = useMemo<DiscoverItem[]>(() => communityGames.map((game) => ({
    id: game.id,
    name: game.name,
    description: game.description || "A community-selected experience from the ROBLOX HUB catalog.",
    genre: game.genre || "Community pick",
    creator: "ROBLOX HUB community",
    image: game.thumbnail_url,
    href: game.roblox_place_id ? `https://www.roblox.com/games/${encodeURIComponent(game.roblox_place_id)}` : null,
    source: "COMMUNITY",
    playing: null,
    visits: null,
  })), [communityGames]);

  const featured = officialItems[0];
  const visibleItems = useMemo(() => {
    let items = sort === "community" ? [...communityItems] : [...officialItems, ...communityItems];
    const normalized = query.trim().toLowerCase();
    if (normalized) {
      items = items.filter((item) =>
        [item.name, item.description, item.genre, item.creator].join(" ").toLowerCase().includes(normalized),
      );
    }
    if (category !== "All") {
      items = items.filter((item) => item.genre.toLowerCase() === category.toLowerCase());
    }
    if (sort === "active") items.sort((a, b) => (b.playing ?? -1) - (a.playing ?? -1));
    if (sort === "visits") items.sort((a, b) => (b.visits ?? -1) - (a.visits ?? -1));
    return items;
  }, [officialItems, communityItems, query, category, sort]);

  return (
    <div className="discover-explorer">
      {featured && !query && category === "All" && sort !== "community" && (
        <section className="discover-featured" aria-label="Featured Roblox experience">
          <div className="featured-copy">
            <span className="comic-kicker"><Sparkles size={13}/> HUB SPOTLIGHT / 001</span>
            <span className="featured-overline">FEATURED EXPERIENCE</span>
            <h2>{featured.name}</h2>
            <p>{featured.description}</p>
            <div className="featured-meta">
              <span>{featured.genre}</span>
              <span>BY {featured.creator}</span>
            </div>
            <a className="button-primary" href={featured.href ?? "https://www.roblox.com/charts"} target="_blank" rel="noreferrer">
              Play on Roblox <ArrowUpRight size={17}/>
            </a>
          </div>
          <div className="featured-art">
            {featured.image ? <img src={featured.image} alt={featured.name} /> : <div className="featured-placeholder"><Gamepad2 size={82}/></div>}
            <span className="featured-burst">PLAY<br/>NOW!</span>
            <span className="featured-caption">FIG. 001 — ROBLOX SPOTLIGHT</span>
          </div>
        </section>
      )}

      <section className="discover-toolbar" aria-label="Find experiences">
        <div className="discover-search">
          <Search size={18}/>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search worlds, genres, creators..." aria-label="Search experiences"/>
          {query && <button type="button" onClick={() => setQuery("")}>CLEAR</button>}
        </div>
        <div className="discover-sort" role="group" aria-label="Sort experiences">
          <button type="button" className={sort === "active" ? "selected" : ""} onClick={() => setSort("active")}><Flame size={14}/> Most active</button>
          <button type="button" className={sort === "visits" ? "selected" : ""} onClick={() => setSort("visits")}><Eye size={14}/> Most visited</button>
          <button type="button" className={sort === "community" ? "selected" : ""} onClick={() => setSort("community")}><Users size={14}/> Community</button>
        </div>
      </section>

      <section className="category-rail" aria-label="Experience categories">
        <span className="category-label"><Compass size={14}/> PICK A WORLD</span>
        <div className="category-list">
          {categories.map((item) => (
            <button type="button" key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>
          ))}
        </div>
      </section>

      <section className="discover-results">
        <div className="discover-results-heading">
          <div><span className="eyebrow dark-eyebrow">THE EXPLORE BOARD</span><h2>{sort === "community" ? "COMMUNITY PICKS." : sort === "visits" ? "MOST VISITED." : "WORLDS TO JUMP INTO."}</h2></div>
          <span className="result-count">{visibleItems.length.toString().padStart(2, "0")} EXPERIENCES</span>
        </div>

        {visibleItems.length > 0 ? (
          <div className="experience-grid">
            {visibleItems.map((game, index) => (
              <article className="experience-card discover-card" key={game.id}>
                <div className="experience-art" style={game.image ? { backgroundImage: `linear-gradient(180deg,transparent 40%,#171a20b8),url("${game.image}")` } : undefined}>
                  {!game.image && <Gamepad2 size={48}/>}
                  <span className={game.source === "ROBLOX" ? "source-sticker official" : "source-sticker community"}>{game.source === "ROBLOX" ? "ROBLOX DATA" : "COMMUNITY PICK"}</span>
                  <span className="genre-sticker">{game.genre}</span>
                  <span className="card-index">#{String(index + 1).padStart(2, "0")}</span>
                </div>
                <div className="experience-info">
                  <h3>{game.name}</h3>
                  <p>{game.description}</p>
                  <div className="experience-stats">
                    <span><Users size={13}/> {compact(game.playing)} <small>PLAYING</small></span>
                    <span><Eye size={13}/> {compact(game.visits)} <small>VISITS</small></span>
                  </div>
                  {game.href ? <a className="experience-open" href={game.href} target="_blank" rel="noreferrer">PLAY EXPERIENCE <ArrowUpRight size={14}/></a> : <span className="experience-open unavailable">ROBLOX LINK NOT ADDED YET</span>}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="discover-empty">
            <div className="empty-stamp"><Search size={25}/><span>NO MATCH<br/>FOUND</span></div>
            <div><strong>THIS WORLD ISN'T ON THE MAP YET.</strong><p>Try another keyword or category. Community picks appear here after they are approved for the public catalog.</p></div>
            <button type="button" onClick={() => { setQuery(""); setCategory("All"); setSort("active"); }}>RESET DISCOVER <ArrowUpRight size={15}/></button>
          </div>
        )}
      </section>

      <div className="discover-source-note">
        <span><span className="source-dot official-dot"/> Official Roblox public data</span>
        <span><span className="source-dot community-dot"/> ROBLOX HUB approved community catalog</span>
        <small>Live counts can be unavailable when Roblox's public API does not respond.</small>
      </div>
    </div>
  );
}
