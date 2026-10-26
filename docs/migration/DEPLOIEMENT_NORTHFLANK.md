# Déploiement gratuit — Northflank Sandbox

Objectif : remettre le site en ligne sur une offre **0 € durable**, sans carte
bancaire. Northflank Sandbox inclut **20 $/mois de ressources**, 1 service web,
1 base PostgreSQL, 2 jobs, sans mise en veille.

> **État constaté le 2026-10-26** : Railway ne sert plus rien. Le domaine **et**
> l'URL Railway (`nqxyte3f.up.railway.app`) répondent tous les deux **404**.
> Le service n'existe plus : il n'y a rien à « réparer » sur Railway.

---

## Ce qui est déjà prêt dans le dépôt

| Élément | État |
|---|---|
| `Dockerfile` multi-étapes (Node 22 + ffmpeg) | ✅ |
| Démarrage `npm run start` compatible (`output: standalone` retiré) | ✅ |
| `/api/health` pour vérifier la base | ✅ |
| CI verte sur `master` (lint, typecheck, test, build) | ✅ |
| Aucun secret dans le dépôt | ✅ |

Il ne reste donc **que la création du compte et du projet**.

---

## Étape 1 — Créer le compte (2 min)

1. https://northflank.com → **Sign up**
2. Utiliser `atlasdepeche@gmail.com`
3. Vérifier l'e-mail
4. **Aucune carte bancaire ne doit être demandée.** Si un écran de facturation
   apparaît, arrêter et revenir ici : on passera sur le plan B (Render + Neon).

---

## Étape 2 — Créer la base PostgreSQL (3 min)

1. Dans le projet : **Addons → Create addon → PostgreSQL**
2. Version : la version par défaut proposée
3. Ressources (rester dans les 20 $) :
   - vCPU : **0,1**
   - Mémoire : **256 Mo**
   - Stockage : **10 Go**
4. Nom : `atlas-db`
5. Créer, puis copier la chaîne de connexion (`DATABASE_URL`).
   Elle ressemble à `postgres://user:motdepasse@host:5432/base`.

**Ne jamais coller cette chaîne dans un fichier du dépôt.**

---

## Étape 3 — Créer le service web (5 min)

1. **Services → Create service → Build from repository**
2. Connecter GitHub, choisir `atlasdepeche/atlas---depeche`, branche `master`
3. Type de build : **Dockerfile** (détecté automatiquement)
4. Ressources :
   - vCPU : **0,2**
   - Mémoire : **512 Mo**
   - Instances : **1** (pas d'autoscaling sur Sandbox)
5. Port : **3000**
6. Variables d'environnement (onglet *Environment*) :

| Variable | Valeur |
|---|---|
| `DATABASE_URL` | la chaîne copiée à l'étape 2 |
| `NODE_ENV` | `production` |
| `SITE_URL` | `https://www.atlasdépêche.com` |
| `PUBLICATION_MODE` | `shadow` |
| `ADMIN_USER` | au choix, ex. `admin` |
| `ADMIN_PASSWORD_HASH` | voir ci-dessous |
| `ADMIN_SECRET_KEY` | voir ci-dessous |

### Générer les deux secrets admin (sur votre PC)

```powershell
# 1) empreinte du mot de passe admin
node -e "crypto.subtle.digest('SHA-256',new TextEncoder().encode(process.argv[1])).then(b=>console.log(Buffer.from(b).toString('hex')))" "VOTRE_MOT_DE_PASSE_ADMIN"

# 2) clé de signature des sessions (32 octets aléatoires)
node -e "console.log(crypto.randomBytes(32).toString('hex'))"
```

- La première sortie va dans `ADMIN_PASSWORD_HASH`
- La seconde dans `ADMIN_SECRET_KEY`
- Le mot de passe en clair **ne va nulle part** (il sert seulement à vous connecter)

Utilisez un mot de passe **différent** de celui de la boîte Gmail.

---

## Étape 4 — Migrer le schéma (une seule fois)

Sans dump Railway (base perdue), on recrée la structure :

```powershell
$env:DATABASE_URL="postgres://...la nouvelle base..."
npm run db:migrate
npm run db:seed
```

Les 12 migrations créent les 20 tables ; le seed ajoute les sources et le
gazetteer. Les articles historiques ne sont pas récupérables.

**Alternative si la base Railway revient** : faire un `pg_dump` d'abord, puis
`pg_restore` sur la nouvelle base. Voir `PLAN_MIGRATION.md`.

---

## Étape 5 — Brancher le domaine

1. Northflank → service → **Domains → Add domain** → `www.atlasdépêche.com`
2. Northflank affiche une cible (CNAME ou ALIAS)
3. Chez GoDaddy : remplacer le CNAME `www` qui pointe vers `nqxyte3f.up.railway.app`
   par celui fourni par Northflank
4. Attendre le certificat TLS (quelques minutes)

⚠️ **Ne pas toucher au DNS sans accord explicite.** C'est la seule opération qui
peut faire perdre le domaine.

---

## Étape 6 — Rebrancher GitHub Actions

Les 5 crons tournent déjà dans GitHub, mais avec l'ancienne `DATABASE_URL`.

**Settings → Secrets and variables → Actions → `DATABASE_URL`** → remplacer par la
nouvelle chaîne.

Ne pas toucher aux secrets Facebook/Instagram : ils sont toujours valides.

---

## Étape 7 — Vérifier

| Test | Attendu |
|---|---|
| `https://<domaine>/api/health` | 200 + base OK |
| `https://<domaine>/fr` | 200 avec articles |
| `https://<domaine>/ar` | 200, texte RTL |
| `https://<domaine>/admin/login` | 200 |
| `https://<domaine>/admin/events` sans cookie | redirection vers login |
| Cookie forgé `admin_session=authenticated` | **refusé** |
| Actions → `radar.yml` (manuel) | run vert, nouvelles lignes |

---

## Plan B — si Northflank demande une carte

**Render (web) + Neon (base)** :

1. Base : https://neon.tech → Free → projet `atlas` → copier la chaîne
   (ajouter `?sslmode=require`)
2. Web : https://render.com → New → Web Service → dépôt GitHub → Dockerfile
   → plan **Free**
3. Variables identiques à l'étape 3
4. Domaine `*.onrender.com` d'abord, domaine perso ensuite

**Limites à accepter** : mise en veille après 15 min d'inactivité (réveil ~1 min),
et Render déconseille officiellement la production sur son plan gratuit.

**Ne jamais utiliser le PostgreSQL gratuit de Render** : il expire au bout de
30 jours.

---

## Ce qui coûte 0 € et ce qui n'est pas inclus

| Poste | Coût |
|---|---|
| Service web Northflank (0,2 vCPU / 512 Mo) | ≈ 5,47 $/mois (dans les 20 $) |
| PostgreSQL (0,1 vCPU / 256 Mo / 10 Go) | ≈ 3,91 $/mois (dans les 20 $) |
| **Total** | **≈ 9,40 $/mois → 0 € facturé** |
| GitHub Actions (dépôt public) | 0 €, illimité |
| Domaine GoDaddy | déjà payé, à renouveler |
