import { faker } from "@faker-js/faker";
import { hash } from "argon2";
import { prisma } from "../lib/prisma.js";
import { findOrCreateGameFromIGDB } from "../utils/game.utils.js";

const USERS_COUNT = 20;

const GAME_TRAILER_URLS = [
  "https://www.youtube.com/watch?v=E3Huy2cdih0",
  "https://www.youtube.com/watch?v=IGdkA1mBqgI",
  "https://www.youtube.com/watch?v=zw47_q9wbBE",
  "https://www.youtube.com/watch?v=e_E9W2vsRbQ",
  "https://www.youtube.com/watch?v=2gUtfBmw86Y",
  "https://www.youtube.com/watch?v=MmB9b5njVbA",
  "https://www.youtube.com/watch?v=BKQMWMdQwEI",
  "https://www.youtube.com/watch?v=UAO2urG23S4",
  "https://www.youtube.com/watch?v=rXMX4YJ7Lks",
  "https://www.youtube.com/watch?v=AhN5npoJVfU",
];
const CHALLENGES_PER_GAME = 5;

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
  { igdbId: 119133 },
  { igdbId: 11133 },
  { igdbId: 7346 },
  { igdbId: 101606 },
  { igdbId: 36083 },
  { igdbId: 45691 },
  { igdbId: 121 },
  { igdbId: 1905 },
  { igdbId: 115 },
  { igdbId: 126459 },
];

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

function weightedPick<T>(weighted: { value: T; weight: number }[]): T {
  const total = weighted.reduce((sum, w) => sum + w.weight, 0);
  let rand = Math.random() * total;
  for (const w of weighted) {
    rand -= w.weight;
    if (rand <= 0) return w.value;
  }
  return weighted[weighted.length - 1]!.value;
}

async function main() {
  console.log("🌱 Démarrage du seeding...\n");

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

  const challengeCategories = await Promise.all(
    CHALLENGE_CATEGORIES.map((c) => prisma.challengeCategory.create({ data: c }))
  );
  console.log(`✅ ${challengeCategories.length} catégories de challenges créées`);

  const difficulties = await Promise.all(
    DIFFICULTIES.map((d) => prisma.difficulty.create({ data: d }))
  );
  console.log(`✅ ${difficulties.length} niveaux de difficulté créés`);

  const gameIds: number[] = [];
  for (const g of GAMES) {
    gameIds.push(await findOrCreateGameFromIGDB(g.igdbId));
  }
  const games = await prisma.game.findMany({ where: { id: { in: gameIds } } });
  console.log(`✅ ${games.length} jeux créés avec leurs catégories (IGDB)`);

  const hashedPassword = await hash("Password123!");

  const fixedUsers = await Promise.all([
    prisma.user.create({
      data: {
        username: "admin",
        email: "admin@gamerchallenge.dev",
        password: hashedPassword,
        country: "France",
        bio: "Administrateur de la plateforme GamerChallenges.",
        profilePicture: faker.image.avatar(),
        role: "admin",
        status: "active",
        visibility: true,
      },
    }),
    prisma.user.create({
      data: {
        username: "moderator",
        email: "moderator@gamerchallenge.dev",
        password: hashedPassword,
        country: "France",
        bio: "Modérateur de la plateforme GamerChallenges.",
        profilePicture: faker.image.avatar(),
        role: "moderator",
        status: "active",
        visibility: true,
      },
    }),
  ]);

  const fakerUsers = await Promise.all(
    Array.from({ length: USERS_COUNT - 2 }).map(() => {
      const username =
        faker.internet
          .username()
          .replace(/[^a-zA-Z0-9_]/g, "")
          .slice(0, 46) + faker.number.int({ min: 1, max: 999 });
      return prisma.user.create({
        data: {
          username: username.slice(0, 50),
          email: faker.internet.email(),
          password: hashedPassword,
          country: faker.location.country().slice(0, 50),
          bio: faker.lorem.sentences({ min: 1, max: 3 }),
          profilePicture: faker.image.avatar(),
          role: "user",
          status: "active",
          visibility: true,
        },
      });
    })
  );

  const allUsers = [...fixedUsers, ...fakerUsers];
  console.log(
    `✅ ${allUsers.length} utilisateurs créés (admin, moderator + ${fakerUsers.length} users)`
  );

  const challengeSlugs = new Set<string>();
  const challengeStatusWeights = [
    { value: "active" as const, weight: 75 },
    { value: "draft" as const, weight: 25 },
  ];

  const allChallenges = [];
  for (const game of games) {
    for (let i = 0; i < CHALLENGES_PER_GAME; i++) {
      const title = faker.helpers
        .fake("{{word.adjective}} {{word.noun}} Challenge sur " + game.name)
        .slice(0, 200);
      const status = weightedPick(challengeStatusWeights);
      const challenge = await prisma.challenge.create({
        data: {
          title,
          slug: uniqueSlug(title, challengeSlugs),
          description: faker.lorem.paragraphs({ min: 2, max: 4 }),
          hints: faker.lorem.sentences({ min: 1, max: 2 }),
          demo: faker.helpers.arrayElement(GAME_TRAILER_URLS),
          goals: faker.lorem.sentences({ min: 2, max: 4 }),
          closesAt:
            status === "active"
              ? (faker.helpers.maybe(() => faker.date.future({ years: 1 }), { probability: 0.5 }) ??
                null)
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

  const activeChallenges = allChallenges.filter((c) => c.status === "active");
  const participationSlugs = new Set<string>();
  const participationPairs = new Set<string>();
  const allParticipations = [];

  for (const challenge of activeChallenges) {
    const participantCount = faker.number.int({ min: 3, max: 8 });
    const shuffledUsers = faker.helpers.shuffle([...allUsers]);

    for (let i = 0; i < Math.min(participantCount, shuffledUsers.length); i++) {
      const user = shuffledUsers[i]!;
      const pairKey = `${user.id}-${challenge.id}`;
      if (participationPairs.has(pairKey)) continue;
      participationPairs.add(pairKey);

      const title = faker.helpers
        .fake("Ma run sur {{word.noun}} — " + challenge.title.slice(0, 80))
        .slice(0, 200);

      const participation = await prisma.participation.create({
        data: {
          title,
          slug: uniqueSlug(title, participationSlugs),
          description: faker.lorem.paragraphs({ min: 1, max: 2 }),
          video: faker.helpers.arrayElement(GAME_TRAILER_URLS),
          status: "approved",
          visibility: true,
          challengeId: challenge.id,
          userId: user.id,
        },
      });
      allParticipations.push(participation);
    }
  }
  console.log(`✅ ${allParticipations.length} participations créées`);

  const challengeVotePairs = new Set<string>();
  let challengeVotesCount = 0;

  for (const challenge of activeChallenges) {
    const voterCount = faker.number.int({ min: 2, max: 10 });
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

  const participationVotePairs = new Set<string>();
  let participationVotesCount = 0;

  for (const participation of allParticipations) {
    const voterCount = faker.number.int({ min: 1, max: 12 });
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

  const favoritePairs = new Set<string>();
  let favoritesCount = 0;

  for (const user of allUsers) {
    const favoriteCount = faker.number.int({ min: 1, max: 8 });
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
  console.log("  admin@gamerchallenge.dev     → admin      (Password123!)");
  console.log("  moderator@gamerchallenge.dev → moderator  (Password123!)");
}

main()
  .catch((e) => {
    console.error("❌ Erreur lors du seeding :", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
