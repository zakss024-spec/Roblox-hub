import type { Metadata } from "next";
import "./globals.css";
import "./catalog.css";
export const metadata: Metadata = {
  title: "ROBLOX HUB — Enter the universe",
  description: "Discover your next Roblox experience in a comic-inspired universe.",
  applicationName: "ROBLOX HUB",
  themeColor: "#f4f0e6"
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}