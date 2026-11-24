import { SiteHeader } from "@/components/site-header";
import { ZakssAIPage } from "@/components/zakss-ai-page";

export const metadata = {
  title: "Zakss AI — ROBLOX HUB",
  description: "AI assistant untuk menemukan rekomendasi pengalaman Roblox.",
};

export default function ZakssAI() {
  return <><SiteHeader/><ZakssAIPage/><footer className="site-footer"><a className="footer-brand" href="/">ROBLOX<span>HUB</span></a><span>POWERED BY ZAKSS AI</span><span>© 2026 ROBLOX HUB</span></footer></>;
}
