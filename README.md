# GamerChallenges — Backend

API REST du projet GamerChallenges, construite avec Express, Prisma et PostgreSQL.

---

## Prérequis

- [Node.js](https://nodejs.org/) >= 20
- [pnpm](https://pnpm.io/) >= 10
- [Docker](https://www.docker.com/) & Docker Compose

---

## Installation

### 1. Cloner le dépôt

```bash
git clone <url-du-repo>
cd projet-cda-GamerChallenges-backend
```

### 2. Installer les dépendances

```bash
pnpm install
```

### 3. Configurer les variables d'environnement

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

> **Important** : `ALLOWED_ORIGINS` doit être une URL stricte. Ne jamais utiliser `*` avec des cookies et `credentials: true`.

### 4. Générer le client Prisma

> **Cette étape est obligatoire avant de lancer Docker Compose.**

```bash
pnpm run db:generate
```

### 5. Lancer avec Docker Compose

```bash
pnpm run docker:dev
```

ou directement :

```bash
docker compose up --build
```

L'API sera disponible sur `http://localhost:<API_LOCAL_PORT>`.

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
