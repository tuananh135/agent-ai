import { createClient } from "@supabase/supabase-js";

// Client serveur uniquement: utilise la clé service_role (accès complet, contourne RLS).
// Ne JAMAIS exposer cette clé au navigateur. Le front passe par nos routes /api/*.
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  // Message clair plutôt qu'un crash obscur si les variables manquent.
  console.warn("[supabase] SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant — voir .env.local / variables Vercel.");
}

export const supabase = createClient(url ?? "", key ?? "", {
  auth: { persistSession: false, autoRefreshToken: false },
  // IMPORTANT (Next.js App Router): forcer no-store, sinon Next met en cache les
  // requêtes GET internes de supabase-js → données périmées en production (Vercel).
  global: {
    fetch: (input: RequestInfo | URL, init?: RequestInit) =>
      fetch(input, { ...init, cache: "no-store" }),
  },
});
