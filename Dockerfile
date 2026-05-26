# Définition de l'image de base depuis laquelle on créé notre image
FROM node:latest-alpine

# Définition d'un espace de travail
WORKDIR /app

# Copie du package.json dans le futur conteneur
COPY package.json ./

# Copie du pnpm-lock.yaml dans le futur conteneur
COPY pnpm-lock.yaml ./

# Intallation des dépendances de Node
RUN pnpm install

# Copie du reste du code dans le conteneur
COPY ./ ./

# Génération du client prisma capable de se connecter à la DB
RUN pnpm run db:generate

# Création du dossier dist contenant le code JS compilé qui sera exécuté
RUN pnpm run build

CMD ["pnpm", "run", "docker:start"]
