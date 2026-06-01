import { faker } from "@faker-js/faker";
import { hash } from "argon2";
import { prisma } from "../lib/prisma.js";

// ─── Config ───────────────────────────────────────────────────────────────────

const USERS_COUNT = 20;
const GAMES_COUNT = 10;
const CHALLENGES_PER_GAME = 5;

// ─── Reference data ───────────────────────────────────────────────────────────

const GAME_CATEGORIES = [
  "FPS",
  "RPG",
  "MMORPG",
  "Battle Royale",
  "Simulation",
  "Sport",
  "Plateforme",
  "Stratégie",
  "Horreur",
  "Combat",
];

const CHALLENGE_CATEGORIES = [
  { name: "Speedrun", colorCode: "#FF4500" },
  { name: "No Hit", colorCode: "#DC143C" },
  { name: "Score Attack", colorCode: "#FFD700" },
  { name: "Cosplay Run", colorCode: "#9370DB" },
  { name: "Créativité", colorCode: "#32CD32" },
  { name: "PvP", colorCode: "#1E90FF" },
  { name: "Coopératif", colorCode: "#FF69B4" },
  { name: "Low%", colorCode: "#FF8C00" },
];

const DIFFICULTIES = [
  { name: "Facile", colorCode: "#4CAF50" },
  { name: "Moyen", colorCode: "#FF9800" },
  { name: "Difficile", colorCode: "#F44336" },
  { name: "Expert", colorCode: "#9C27B0" },
  { name: "Légendaire", colorCode: "#000000" },
];

const GAMES = [
  { name: "Elden Ring", studio: "FromSoftware", platform: "PC / PS5 / Xbox" },
  { name: "Dark Souls III", studio: "FromSoftware", platform: "PC / PS4 / Xbox" },
  { name: "The Legend of Zelda: Breath of the Wild", studio: "Nintendo", platform: "Switch" },
  { name: "Sekiro: Shadows Die Twice", studio: "FromSoftware", platform: "PC / PS4 / Xbox" },
  { name: "Hollow Knight", studio: "Team Cherry", platform: "PC / Switch / PS4" },
  { name: "Celeste", studio: "Maddy Makes Games", platform: "PC / Switch / PS4" },
  { name: "Minecraft", studio: "Mojang", platform: "PC / Console / Mobile" },
  { name: "Fortnite", studio: "Epic Games", platform: "PC / Console / Mobile" },
  { name: "League of Legends", studio: "Riot Games", platform: "PC" },
  { name: "Valorant", studio: "Riot Games", platform: "PC" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function uniqueSlug(base: string, existing: Set<string>): string {
  const slug = slugify(base);
  let candidate = slug;
  let i = 2;
  while (existing.has(candidate)) {
    candidate = `${slug}-${i++}`;
  }
  existing.add(candidate);
  return candidate;
}

// Distribue les statuts selon une pondération
function weightedPick<T>(weighted: { value: T; weight: number }[]): T {
  const total = weighted.reduce((sum, w) => sum + w.weight, 0);
  let rand = Math.random() * total;
  for (const w of weighted) {
    rand -= w.weight;
    if (rand <= 0) return w.value;
  }
  return weighted[weighted.length - 1]!.value;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Démarrage du seeding...\n");

  // Nettoyage dans l'ordre des dépendances
  await prisma.participationVote.deleteMany();
  await prisma.challengeVote.deleteMany();
  await prisma.userFavoriteChallenge.deleteMany();
  await prisma.participation.deleteMany();
  await prisma.challenge.deleteMany();
  await prisma.gameHasGameCategory.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.game.deleteMany();
  await prisma.challengeCategory.deleteMany();
  await prisma.difficulty.deleteMany();
  await prisma.gameCategory.deleteMany();
  console.log("🧹 Base de données nettoyée");

  // ── Catégories de jeux ──────────────────────────────────────────────────────
  const gameCategories = await Promise.all(
    GAME_CATEGORIES.map((name) => prisma.gameCategory.create({ data: { name } }))
  );
  console.log(`✅ ${gameCategories.length} catégories de jeux créées`);

  // ── Catégories de challenges ─────────────────────────────────────────────────
  const challengeCategories = await Promise.all(
    CHALLENGE_CATEGORIES.map((c) => prisma.challengeCategory.create({ data: c }))
  );
  console.log(`✅ ${challengeCategories.length} catégories de challenges créées`);

  // ── Difficultés ──────────────────────────────────────────────────────────────
  const difficulties = await Promise.all(
    DIFFICULTIES.map((d) => prisma.difficulty.create({ data: d }))
  );
  console.log(`✅ ${difficulties.length} niveaux de difficulté créés`);

  // ── Jeux ─────────────────────────────────────────────────────────────────────
  const games = await Promise.all(
    GAMES.slice(0, GAMES_COUNT).map((g) =>
      prisma.game.create({
        data: {
          ...g,
          coverUrl: faker.image.urlPicsumPhotos({ width: 400, height: 600 }),
          visibility: true,
        },
      })
    )
  );

  // Associe 1 à 3 catégories par jeu
  for (const game of games) {
    const shuffled = faker.helpers.shuffle([...gameCategories]);
    const picked = shuffled.slice(0, faker.number.int({ min: 1, max: 3 }));
    for (const cat of picked) {
      await prisma.gameHasGameCategory.create({
        data: { gameId: game.id, gameCategoryId: cat.id },
      });
    }
  }
  console.log(`✅ ${games.length} jeux créés avec leurs catégories`);

  // ── Utilisateurs ─────────────────────────────────────────────────────────────
  const hashedPassword = await hash("Password123!");

  // Comptes fixes avec des rôles garantis (utiles pour les tests manuels)
  const fixedUsers = await Promise.all([
    prisma.user.create({
      data: {
        username: "admin",
        email: "admin@gamerchallenge.dev",
        password: hashedPassword,
        country: "France",
        bio: "Administrateur de la plateforme.",
        role: "admin",
        status: "active",
      },
    }),
    prisma.user.create({
      data: {
        username: "moderator",
        email: "moderator@gamerchallenge.dev",
        password: hashedPassword,
        country: "France",
        bio: "Modérateur de la plateforme.",
        role: "moderator",
        status: "active",
      },
    }),
    prisma.user.create({
      data: {
        username: "inactive_user",
        email: "inactive@gamerchallenge.dev",
        password: hashedPassword,
        country: "Belgium",
        bio: faker.lorem.sentence(),
        role: "user",
        status: "inactive",
      },
    }),
  ]);

  // Utilisateurs générés par Faker (tous active)
  const fakerUsers = await Promise.all(
    Array.from({ length: USERS_COUNT - 3 }).map(() => {
      const username =
        faker.internet
          .username()
          .replace(/[^a-zA-Z0-9_]/g, "")
          .slice(0, 50) + faker.number.int({ min: 1, max: 999 });
      return prisma.user.create({
        data: {
          username: username.slice(0, 50),
          email: faker.internet.email(),
          password: hashedPassword,
          country: faker.location.country().slice(0, 50),
          bio:
            faker.helpers.maybe(() => faker.lorem.sentences({ min: 1, max: 3 }), {
              probability: 0.7,
            }) ?? null,
          profilePicture:
            faker.helpers.maybe(() => faker.image.avatar(), { probability: 0.6 }) ?? null,
          role: "user",
          status: "active",
        },
      });
    })
  );

  const allUsers = [...fixedUsers, ...fakerUsers];
  console.log(
    `✅ ${allUsers.length} utilisateurs créés (admin, moderator, inactive + ${fakerUsers.length} users)`
  );

  // ── Challenges ───────────────────────────────────────────────────────────────
  const challengeSlugs = new Set<string>();
  const challengeStatusWeights = [
    { value: "active" as const, weight: 60 },
    { value: "draft" as const, weight: 20 },
    { value: "closed" as const, weight: 20 },
  ];

  const allChallenges = [];
  for (const game of games) {
    for (let i = 0; i < CHALLENGES_PER_GAME; i++) {
      const title = faker.helpers.fake(
        "{{word.adjective}} {{word.noun}} Challenge sur " + game.name
      );
      const status = weightedPick(challengeStatusWeights);
      const challenge = await prisma.challenge.create({
        data: {
          title,
          slug: uniqueSlug(title, challengeSlugs),
          description: faker.lorem.paragraphs({ min: 1, max: 3 }),
          hints:
            faker.helpers.maybe(() => faker.lorem.sentences({ min: 1, max: 2 }), {
              probability: 0.5,
            }) ?? null,
          demo: faker.helpers.maybe(() => faker.internet.url(), { probability: 0.4 }) ?? null,
          goals:
            faker.helpers.maybe(() => faker.lorem.sentences({ min: 1, max: 3 }), {
              probability: 0.6,
            }) ?? null,
          closesAt:
            status === "active"
              ? (faker.helpers.maybe(() => faker.date.future({ years: 1 }), { probability: 0.4 }) ??
                null)
              : status === "closed"
                ? faker.date.past({ years: 1 })
                : null,
          status,
          visibility: true,
          gameId: game.id,
          challengeCategoryId: faker.helpers.arrayElement(challengeCategories).id,
          difficultyId: faker.helpers.arrayElement(difficulties).id,
          userId: faker.helpers.arrayElement(allUsers).id,
        },
      });
      allChallenges.push(challenge);
    }
  }
  console.log(`✅ ${allChallenges.length} challenges créés`);

  // ── Participations (uniquement sur les challenges active) ────────────────────
  const activeChallenges = allChallenges.filter((c) => c.status === "active");
  const participationSlugs = new Set<string>();
  const participationStatusWeights = [
    { value: "approved" as const, weight: 70 },
    { value: "pending" as const, weight: 30 },
  ];

  const allParticipations = [];
  // Suivi des paires (userId, challengeId) pour respecter la contrainte @@unique
  const participationPairs = new Set<string>();

  for (const challenge of activeChallenges) {
    const participantCount = faker.number.int({ min: 2, max: 6 });
    const shuffledUsers = faker.helpers.shuffle([...allUsers]);

    for (let i = 0; i < Math.min(participantCount, shuffledUsers.length); i++) {
      const user = shuffledUsers[i]!;
      const pairKey = `${user.id}-${challenge.id}`;
      if (participationPairs.has(pairKey)) continue;
      participationPairs.add(pairKey);

      const title = faker.helpers.fake(
        "Ma run sur {{word.noun}} — " + challenge.title.slice(0, 80)
      );
      const status = weightedPick(participationStatusWeights);
      const participation = await prisma.participation.create({
        data: {
          title: title.slice(0, 200),
          slug: uniqueSlug(title, participationSlugs),
          description:
            faker.helpers.maybe(() => faker.lorem.paragraphs({ min: 1, max: 2 }), {
              probability: 0.6,
            }) ?? null,
          video: faker.internet.url(),
          status,
          visibility: true,
          challengeId: challenge.id,
          userId: user.id,
        },
      });
      allParticipations.push(participation);
    }
  }
  console.log(`✅ ${allParticipations.length} participations créées`);

  // ── Votes sur challenges ──────────────────────────────────────────────────────
  const challengeVotePairs = new Set<string>();
  let challengeVotesCount = 0;

  for (const challenge of activeChallenges) {
    const voterCount = faker.number.int({ min: 0, max: 8 });
    const shuffledUsers = faker.helpers.shuffle([...allUsers]).slice(0, voterCount);
    for (const user of shuffledUsers) {
      const key = `${user.id}-${challenge.id}`;
      if (challengeVotePairs.has(key)) continue;
      challengeVotePairs.add(key);
      await prisma.challengeVote.create({ data: { userId: user.id, challengeId: challenge.id } });
      challengeVotesCount++;
    }
  }
  console.log(`✅ ${challengeVotesCount} votes sur challenges créés`);

  // ── Votes sur participations (uniquement approved) ───────────────────────────
  const approvedParticipations = allParticipations.filter((p) => p.status === "approved");
  const participationVotePairs = new Set<string>();
  let participationVotesCount = 0;

  for (const participation of approvedParticipations) {
    const voterCount = faker.number.int({ min: 0, max: 10 });
    const shuffledUsers = faker.helpers.shuffle([...allUsers]).slice(0, voterCount);
    for (const user of shuffledUsers) {
      const key = `${user.id}-${participation.id}`;
      if (participationVotePairs.has(key)) continue;
      participationVotePairs.add(key);
      await prisma.participationVote.create({
        data: { userId: user.id, participationId: participation.id },
      });
      participationVotesCount++;
    }
  }
  console.log(`✅ ${participationVotesCount} votes sur participations créés`);

  // ── Favoris ───────────────────────────────────────────────────────────────────
  const favoritePairs = new Set<string>();
  let favoritesCount = 0;

  for (const user of allUsers) {
    const favoriteCount = faker.number.int({ min: 0, max: 5 });
    const shuffledChallenges = faker.helpers.shuffle([...activeChallenges]).slice(0, favoriteCount);
    for (const challenge of shuffledChallenges) {
      const key = `${user.id}-${challenge.id}`;
      if (favoritePairs.has(key)) continue;
      favoritePairs.add(key);
      await prisma.userFavoriteChallenge.create({
        data: { userId: user.id, challengeId: challenge.id },
      });
      favoritesCount++;
    }
  }
  console.log(`✅ ${favoritesCount} favoris créés`);

  console.log("\n🎮 Seeding terminé avec succès !");
  console.log("─────────────────────────────────────");
  console.log("Comptes de test :");
  console.log("  admin@gamerchallenge.dev     → admin       (Password123!)");
  console.log("  moderator@gamerchallenge.dev → moderator   (Password123!)");
  console.log("  inactive@gamerchallenge.dev  → inactive    (Password123!)");
}

main()
  .catch((e) => {
    console.error("❌ Erreur lors du seeding :", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
