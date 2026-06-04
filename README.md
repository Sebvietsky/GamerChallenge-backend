# GamerChallenges — Backend

API REST du projet GamerChallenges, construite avec Express, Prisma et PostgreSQL.

---

## Prérequis

- [Docker](https://www.docker.com/) & Docker Compose
- [pnpm](https://pnpm.io/) >= 10 — uniquement pour le setup de l'IDE (types TypeScript et Prisma)

---

## Installation

### 1. Cloner le dépôt

```bash
git clone <url-du-repo>
cd projet-cda-GamerChallenges-backend
```

### 2. Configurer les variables d'environnement

```bash
cp .env.example .env
```

Éditer `.env` et renseigner les valeurs :

| Variable | Description |
|---|---|
| `POSTGRES_USER` | Nom d'utilisateur PostgreSQL |
| `POSTGRES_PASSWORD` | Mot de passe PostgreSQL |
| `POSTGRES_DB` | Nom de la base de données |
| `POSTGRES_LOCAL_PORT` | Port exposé localement (ex: `5432`) |
| `PORT` | Port de l'API (ex: `3000`) |
| `API_LOCAL_PORT` | Port exposé localement pour l'API |
| `NODE_ENV` | Environnement (`development` / `production`) |
| `JWT_SECRET` | Clé secrète pour la signature des JWT |
| `ALLOWED_ORIGINS` | Origine autorisée pour CORS (ex: `http://localhost:5173`) |
| `IGDB_CLIENT_ID` | Client ID Twitch/IGDB (console : https://dev.twitch.tv/console) |
| `IGDB_CLIENT_SECRET` | Client Secret Twitch/IGDB |

> **Important** : `ALLOWED_ORIGINS` doit être une URL stricte. Ne jamais utiliser `*` avec des cookies et `credentials: true`.

### 3. Lancer avec Docker Compose

```bash
docker compose up --build
```

L'API sera disponible sur `http://localhost:<API_LOCAL_PORT>`.

### 4. Alimenter la base de données (optionnel)

Une fois les conteneurs démarrés et les migrations appliquées, deux approches sont possibles :

**Via Docker (sans pnpm local) :**
```bash
docker exec gamer_challenge_api pnpm run db:seed
```

**Via pnpm en local (si le setup IDE est fait) :**
```bash
pnpm run db:seed
```

Les deux sont équivalentes. La version locale fonctionne car Docker expose le port PostgreSQL sur `localhost` — Prisma lit le `DATABASE_URL` du `.env` local et se connecte directement à la base.

Cela insère des données de test réalistes (jeux, challenges, utilisateurs, participations, votes).

Comptes créés avec le mot de passe `Password123!` :

| Email | Role |
|---|---|
| `admin@gamerchallenge.dev` | admin |
| `moderator@gamerchallenge.dev` | moderator |

> Pour repartir d'une base vide et re-seeder en une commande : `docker exec gamer_challenge_api pnpm run db:reset` ou `pnpm run db:reset` en local.

---

## Setup IDE (optionnel)

Par défaut, Docker se suffit à lui-même. Le client Prisma est généré dans le conteneur au moment du build et isolé via un volume anonyme — rien n'est requis en local pour que l'application fonctionne.

Si tu veux l'autocomplétion TypeScript et les types Prisma dans ton éditeur, installe les dépendances localement :

```bash
pnpm install
pnpm run db:generate
```

> `pnpm install` installe les types TypeScript (`node_modules`) pour l'IDE. `db:generate` produit le client Prisma dans `generated/prisma/` pour que l'éditeur connaisse les types de tes modèles. Ces deux commandes n'ont aucun impact sur Docker.

---

## Scripts disponibles

| Commande | Description |
|---|---|
| `pnpm run dev` | Démarrage en mode développement (sans Docker) |
| `pnpm run build` | Compilation TypeScript |
| `pnpm run start` | Démarrage du build compilé |
| `pnpm run docker:dev` | Lance l'environnement complet via Docker Compose |
| `pnpm run docker:prod` | Lance en mode production (détaché) |
| `pnpm run docker:down` | Arrête les conteneurs |
| `pnpm run db:generate` | Génère le client Prisma |
| `pnpm run db:migrate:dev` | Crée et applique une migration (développement) |
| `pnpm run db:migrate:deploy` | Applique les migrations (production) |
| `pnpm run db:migrate:reset` | Réinitialise la base de données |
| `pnpm run db:seed` | Alimente la base avec des données de test |
| `pnpm run db:reset` | Reset + seed |
| `pnpm run db:studio` | Ouvre Prisma Studio |
| `pnpm run test` | Lance les tests (Vitest) |
