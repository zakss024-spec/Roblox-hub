import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { DiscoverExplorer } from "@/components/discover-explorer";
import { getPublishedExperiences } from "@/lib/supabase";
import { getRobloxFeaturedExperiences } from "@/lib/roblox-discovery";

export const revalidate = 300;

export default async function DiscoverPage() {
  const [communityGames, robloxGames] = await Promise.all([
    getPublishedExperiences(),
    getRobloxFeaturedExperiences(),
  ]);

  return (
    <main>
      <SiteHeader/>
      <section className="discover-page">
        <Link className="back-link" href="/"><ArrowLeft size={15}/> BACK TO HOME</Link>
        <div className="discover-intro">
          <div className="eyebrow dark-eyebrow"><span className="discover-live-dot"/> THE DISCOVERY ZONE</div>
          <h1>FIND YOUR<br/><span>NEXT WORLD.</span></h1>
          <p>Find your next Roblox adventure. Explore official Roblox experiences and community picks approved by ROBLOX HUB.</p>
        </div>
        <DiscoverExplorer robloxGames={robloxGames} communityGames={communityGames}/>
      </section>
      <footer className="site-footer">
        <Link className="footer-brand" href="/">ROBLOX<span>HUB</span></Link>
        <span>AN UNIVERSE OF EXPERIENCES.</span>
        <span>© 2026 ROBLOX HUB</span>
      </footer>
    </main>
  );
}
