# ROBLOX HUB

A mobile-first Roblox experience discovery website with a 3D comic visual identity.

## Stack
- Next.js 15 + React 19 + TypeScript
- Supabase Auth and Postgres (RLS enabled)
- Vercel hosting and deployment

## Environment variables
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `XKIRO_API_KEY` (server-only secret for Zakss AI; never prefix with `NEXT_PUBLIC_`)
- `XKIRO_MODEL` (optional; defaults to `openai/gpt-5.6-sol`)

Zakss AI calls xKiro from the Next.js server at `https://api.xkiro.com/v1/chat/completions`. Set `XKIRO_API_KEY` as a server-only secret. For Cloudflare deployments, add it to GitHub Actions Secrets; the deploy workflow installs it on both HUB and STUDIO Workers. For the Vercel backup, also add `XKIRO_API_KEY` in each Vercel project's Environment Variables. Never commit the real key or paste it into client-side code.

Only the Supabase publishable key belongs in public frontend configuration. Never expose a Supabase secret/service-role key in browser code.

## Database
The initial `roblox_hub_core_schema` migration creates:
- public profiles and categories
- published Roblox experiences
- per-user favorites
- private owner membership, owner command queue, and audit logs

RLS is enabled on every public-schema table. Owner operations must be performed through trusted server-side code after verifying the authenticated user against the private owner membership list. Never trust a hidden URL or client-supplied role.

## Roblox integration boundary
The owner command queue is only a data model. Commands must only be sent to Roblox experiences that the account owner controls or is explicitly authorized to manage, using a legitimate Roblox server-side Luau integration. No Roblox passwords, cookies, or third-party exploit execution are supported.

## Local development
```bash
npm install
npm run dev
```
