# Assistant IA — Agence immobilière (démo)

Agent IA qui qualifie les leads immobiliers : il cerne le besoin, évalue le prospect selon les critères de l'agence, réserve une visite si le dossier passe, rend compte à l'agent, et escalade vers un humain (avec brouillon) sinon.

Stack : **Next.js 14 (App Router) · TypeScript · Vercel AI SDK · Supabase Postgres**. Persistance en base (compatible serverless/Vercel), supervision par polling du snapshot. Voir [SPEC.md](./SPEC.md) pour le découpage par phase.

## 1. Base de données (Supabase)

1. Créer un projet sur [supabase.com](https://supabase.com).
2. Ouvrir **SQL Editor → New query**, coller le contenu de [`supabase/migrations/0001_init.sql`](./supabase/migrations/0001_init.sql), **Run**.
3. Récupérer dans **Project Settings → API** : la *Project URL* et la clé **`service_role`** (secrète).

## 2. Démarrer en local

```bash
npm install
cp .env.local.example .env.local
```

Renseigner dans `.env.local` :
- `OPENROUTER_API_KEY` (ou `ANTHROPIC_API_KEY`)
- `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY`

```bash
npm run dev      # http://localhost:3000 → /monitor
```

> LLM : OpenRouter prioritaire s'il est défini (routé vers Anthropic uniquement), sinon Anthropic direct. Modèles : `claude-opus-4.8` (évaluation EF4 + escalade), `claude-sonnet-4.6` (conversation, rapports).
> La base se remplit toute seule au premier chargement ; le bouton **Réinitialiser** recharge le scénario.

## L'écran de supervision (EF9)

3 colonnes :
1. **Leads** — liste + statut + priorité. Boutons *Réinitialiser* (recharge le scénario) et *Évaluer en attente* (scénario E). Formulaire *Nouveau prospect* = une demande entrante (EF1).
2. **Conversation** du lead sélectionné, mise à jour en direct. La barre du bas permet de **jouer le prospect** (parler à l'agent IA).
3. **Onglets** : Agenda (créneaux/RDV), Rapports (EF7), Escalades (EF8), Agent (assistant de l'agent immobilier, EF2/EF7).

## Tester les scénarios de l'annexe (mục 9)

- **A — bien précis, qualifié, RDV** : créer un prospect sur le T3 Lyon 6e, dire « prêt accordé, budget 400k, achat sous 2 mois », répondre aux questions → l'IA évalue *pass*, propose des créneaux, réserve. Le RDV et un rapport apparaissent à droite.
- **B — non qualifié** : prospect « budget 200k, pas encore vu la banque » → évaluation *fail*, message poli, rapport « non qualifié ».
- **C — escalade** : poser une question hors périmètre (« vous gérez aussi la fiscalité d'un achat en SCI ? ») → message d'attente au prospect + escalade avec brouillon (onglet Escalades).
- **D — définir les critères** : onglet *Agent* → « Définis les critères : budget min 300k, prêt accordé ou comptant, zone Lyon, achat sous 6 mois ». Les leads suivants sont évalués selon ces critères.
- **E — liste courte (valeur clé)** : *Réinitialiser* crée plusieurs demandes sur le même bien. Cliquer *Évaluer en attente*, puis dans l'onglet *Agent* : « Liste courte pour le T3 Lyon 6e » → l'assistant ne remonte que les 1–2 dossiers qualifiés et sérieux, classés par priorité.

## Architecture

```
app/
  monitor/page.tsx        UI supervision + chat prospect + chat agent (EF9)
  api/
    inbound/route.ts      EF1 — demande entrante → lead + 1er tour IA
    chat/route.ts         tour de conversation prospect (EF3/EF5/EF6/EF8)
    broker/route.ts       conversation agent immobilier (EF2/EF7)
    evaluate/route.ts     évaluation par lot / unitaire (EF4)
    events/route.ts       SSE — snapshot temps réel (EF9)
    state, seed           snapshot initial / réinitialisation
lib/
  types.ts                modèle de données (mục 8)
  store.ts                store mémoire + machine à états du lead + événements
  seed.ts                 catalogue, créneaux, critères, scénario E
  model.ts                choix des modèles
  agents/
    tools.ts              outils (function calling) — un par action métier
    schemas.ts            schéma Zod de l'évaluation (EF4)
    evaluate.ts           EF4 — évaluation structurée + application au store
    clientAgent.ts        agent prospect (prompt FR)
    brokerAgent.ts        agent immobilier (prompt FR)
```

Principes : logique métier séparée de la source d'entrée (tout passe par `InboundRequest`) ; **machine à états gérée par le code** ; chaque action métier = un outil ; EF4 en sortie structurée.

## Déploiement sur Vercel

1. Pousser le repo sur GitHub, puis **Import Project** sur [vercel.com](https://vercel.com).
2. Dans **Settings → Environment Variables**, ajouter :
   - `OPENROUTER_API_KEY` (ou `ANTHROPIC_API_KEY`)
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Deploy. La même base Supabase est partagée par toutes les instances serverless (l'ancien store mémoire + SSE n'était pas compatible serverless — d'où le passage à Postgres + polling).

> ⚠️ Ne jamais committer `.env.local` ni la clé `service_role`. Ne renseigner les secrets que dans le dashboard Vercel / Supabase.

## Vers la production (au-delà de la démo)

- Brancher les vraies sources (formulaire, email, SMS, SeLoger) sur `/api/inbound`.
- Calendrier réel (Cal.com / Google), CRM, RGPD, multi-agents/agences.
- Authentification de l'agent (RLS Supabase + policies) ; remplacer le polling par Supabase Realtime si besoin.
- Activer le streaming token-par-token (déjà supporté par l'AI SDK).
