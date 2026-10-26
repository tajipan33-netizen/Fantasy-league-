# SUPER LEAGUE — Supabase Rebuild (separate app)

This folder is intentionally separate from the existing `super-league/` pages.

## Connection
- Supabase project ref: `fdszmpirncjkznjciikz`
- Frontend uses only the Supabase publishable API key and the REST Data API.
- Never put a service-role/secret key in this HTML or in GitHub.

## Current features
- Clubs list and search
- Squad roster by club, roster category, and search
- Match results table
- Dashboard connection status and counts
- Mobile-first dark UI
- Mutations intentionally disabled until a server-side authenticated admin flow and club-scope authorization are configured.

## Database
Uses existing `public.clubs`, `public.roster_entries`, and `public.matches` tables.
RLS remains enabled. Public SELECT policies are applied to these tables; public INSERT/UPDATE/DELETE is not granted.

## Deployment note
The existing Vercel projects have deployment protection and project-scope access restrictions. This file is committed on the `super-league-supabase-rebuild` branch for review and does not replace the existing production entrypoint. Link a separate Vercel project to this repo/branch and set the root directory to `super-league-supabase` to deploy this as a separate app.
