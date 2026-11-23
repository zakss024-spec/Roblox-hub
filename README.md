# ROBLOX HUB

Comic-inspired Roblox experience discovery website.

## Platform setup
- GitHub: source code and version control.
- Vercel: website hosting and deployment.
- Supabase: authentication, database, and realtime features (integration phase).

## Product direction
The visual system is 3D Comic Universe: dimensional comic panels, halftone textures, bold ink outlines, pop-art colors, layered depth, and responsive motion. It must remain usable on mobile and respect reduced-motion preferences.

## Security principles
- Public discovery pages never expose private owner controls.
- Owner access must be verified server-side; hiding a URL is not authorization.
- No public owner registration or client-controlled role metadata.
- Admin controls may only target Roblox experiences owned by the account or explicitly authorized by the owner.
- Never request Roblox passwords or session cookies.
- No fake catalog entries, ratings, activity, or success states.

## Deployment
Connect this repository to Vercel. Framework preset: Next.js. Build command: npm run build.

Supabase credentials will be configured as Vercel environment variables after a dedicated ROBLOX HUB Supabase project is selected:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

Never add Supabase secret keys to public variables or commit credentials to GitHub.

## Current implementation
The first implementation establishes the responsive 3D Comic Universe landing page and a truthful discovery empty state. Supabase-backed catalog, authentication, profiles, and private owner routes are intentionally gated until the dedicated database and server-side policies are configured.
