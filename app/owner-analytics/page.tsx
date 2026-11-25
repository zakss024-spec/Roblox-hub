import Link from "next/link";
import {SiteHeader} from "@/components/site-header";
import {HubPlatform} from "@/components/hub-platform";
import {getRobloxFeaturedExperiences} from "@/lib/roblox-discovery";
import {OwnerLiveUsers} from "@/components/owner-live-users";
export const revalidate=300;
export default async function Page(){const fallbackGames=await getRobloxFeaturedExperiences();return <main><SiteHeader/><section className="hub-page-shell"><HubPlatform kind="analytics" fallbackGames={fallbackGames}/><OwnerLiveUsers/></section><footer className="site-footer"><Link className="footer-brand" href="/">ROBLOX<span>HUB</span></Link><span>AN UNIVERSE OF EXPERIENCES.</span><span>© 2026 ROBLOX HUB</span></footer></main>;}