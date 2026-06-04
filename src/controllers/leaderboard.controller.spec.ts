import { describe, test, afterEach, beforeAll, beforeEach, expect } from "vitest";
import request from "supertest";
import { prisma } from "../lib/prisma";
import { app } from "../app";
import argon2 from "argon2";
import { UserRole } from "../lib/prisma";

const VALID_PASSWORD = "Password123456!";

describe("Leaderboard Controller", () => {
  let userId: number;
  let gameId: number;
  let categoryId: number;
  let difficultyId: number;

  beforeAll(async () => {
    await prisma.participationVote.deleteMany();
    await prisma.participation.deleteMany();
    await prisma.challenge.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany();
    await prisma.game.deleteMany();
    await prisma.challengeCategory.deleteMany();
    await prisma.difficulty.deleteMany();
  });

  beforeEach(async () => {
    const user = await prisma.user.create({
      data: {
        username: "testuser",
        email: "test@example.com",
        password: await argon2.hash(VALID_PASSWORD),
        role: UserRole.user,
      },
    });
    userId = user.id;

    const game = await prisma.game.create({
      data: { name: "Test Game", igdbId: 99999 },
    });
    gameId = game.id;

    const category = await prisma.challengeCategory.create({
      data: { name: "Test Category" },
    });
    categoryId = category.id;

    const difficulty = await prisma.difficulty.create({
      data: { name: "Easy" },
    });
    difficultyId = difficulty.id;
  });

  afterEach(async () => {
    await prisma.participationVote.deleteMany();
    await prisma.participation.deleteMany();
    await prisma.challenge.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany();
    await prisma.game.deleteMany();
    await prisma.challengeCategory.deleteMany();
    await prisma.difficulty.deleteMany();
  });

  // ---------------------------------------------------------------------------
  // GET /api/leaderboard/bestChallenges
  // ---------------------------------------------------------------------------

  describe("GET /api/leaderboard/bestChallenges", () => {
    test("should return 200 with paginated response", async () => {
      await prisma.challenge.create({
        data: {
          title: "Popular Challenge",
          slug: "popular-challenge",
          description: "desc",
          userId,
          gameId,
          challengeCategoryId: categoryId,
          difficultyId,
        },
      });

      const res = await request(app).get("/api/leaderboard/bestChallenges");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("data");
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body).toHaveProperty("page");
      expect(res.body).toHaveProperty("limit");
      expect(res.body).toHaveProperty("total");
      expect(res.body).toHaveProperty("totalPages");
    });

    test("should order challenges by participation count desc", async () => {
      const challenge1 = await prisma.challenge.create({
        data: {
          title: "Few Participations",
          slug: "few-participations",
          description: "desc",
          userId,
          gameId,
          challengeCategoryId: categoryId,
          difficultyId,
        },
      });

      const challenge2 = await prisma.challenge.create({
        data: {
          title: "Many Participations",
          slug: "many-participations",
          description: "desc",
          userId,
          gameId,
          challengeCategoryId: categoryId,
          difficultyId,
        },
      });

      const user2 = await prisma.user.create({
        data: {
          username: "user2",
          email: "user2@example.com",
          password: await argon2.hash(VALID_PASSWORD),
          role: UserRole.user,
        },
      });

      await prisma.participation.createMany({
        data: [
          {
            title: "Part 1",
            slug: "part-1-testuser",
            description: "d",
            video: "https://youtube.com/watch?v=1",
            userId,
            challengeId: challenge2.id,
          },
          {
            title: "Part 2",
            slug: "part-2-user2",
            description: "d",
            video: "https://youtube.com/watch?v=2",
            userId: user2.id,
            challengeId: challenge2.id,
          },
          {
            title: "Part 3",
            slug: "part-3-testuser",
            description: "d",
            video: "https://youtube.com/watch?v=3",
            userId,
            challengeId: challenge1.id,
          },
        ],
      });

      const res = await request(app)
        .get("/api/leaderboard/bestChallenges")
        .query({ page: 1, limit: 10 });

      expect(res.status).toBe(200);
      expect(res.body.data[0].title).toBe("Many Participations");
      expect(res.body.data[0]._count.participations).toBe(2);
    });

    test("should filter by since param", async () => {
      const oldChallenge = await prisma.challenge.create({
        data: {
          title: "Old Challenge",
          slug: "old-challenge",
          description: "desc",
          userId,
          gameId,
          challengeCategoryId: categoryId,
          difficultyId,
          createdAt: new Date("2020-01-01"),
        },
      });

      const recentChallenge = await prisma.challenge.create({
        data: {
          title: "Recent Challenge",
          slug: "recent-challenge",
          description: "desc",
          userId,
          gameId,
          challengeCategoryId: categoryId,
          difficultyId,
        },
      });

      const res = await request(app).get("/api/leaderboard/bestChallenges").query({ since: "1m" });

      expect(res.status).toBe(200);
      const titles = res.body.data.map((c: { title: string }) => c.title);
      expect(titles).toContain(recentChallenge.title);
      expect(titles).not.toContain(oldChallenge.title);
    });

    test("should return 400 for invalid since value", async () => {
      const res = await request(app)
        .get("/api/leaderboard/bestChallenges")
        .query({ since: "invalid" });

      expect(res.status).toBe(400);
    });

    test("should respect page and limit params", async () => {
      await prisma.challenge.createMany({
        data: Array.from({ length: 5 }, (_, i) => ({
          title: `Challenge ${i + 1}`,
          slug: `challenge-${i + 1}`,
          description: "desc",
          userId,
          gameId,
          challengeCategoryId: categoryId,
          difficultyId,
        })),
      });

      const res = await request(app)
        .get("/api/leaderboard/bestChallenges")
        .query({ page: 1, limit: 2 });

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
      expect(res.body.limit).toBe(2);
      expect(res.body.total).toBe(5);
      expect(res.body.totalPages).toBe(3);
    });

    test("should return correct shape per challenge item", async () => {
      await prisma.challenge.create({
        data: {
          title: "Shape Check",
          slug: "shape-check",
          description: "desc",
          userId,
          gameId,
          challengeCategoryId: categoryId,
          difficultyId,
        },
      });

      const res = await request(app).get("/api/leaderboard/bestChallenges");

      expect(res.status).toBe(200);
      const item = res.body.data[0];
      expect(item).toHaveProperty("id");
      expect(item).toHaveProperty("title");
      expect(item).toHaveProperty("slug");
      expect(item).toHaveProperty("game");
      expect(item).toHaveProperty("_count");
      expect(item._count).toHaveProperty("participations");
    });
  });

  // ---------------------------------------------------------------------------
  // GET /api/leaderboard/bestParticipations
  // ---------------------------------------------------------------------------

  describe("GET /api/leaderboard/bestParticipations", () => {
    test("should return 200 with paginated response", async () => {
      const challenge = await prisma.challenge.create({
        data: {
          title: "A Challenge",
          slug: "a-challenge",
          description: "desc",
          userId,
          gameId,
          challengeCategoryId: categoryId,
          difficultyId,
        },
      });

      await prisma.participation.create({
        data: {
          title: "Voted Part",
          slug: "voted-part-testuser",
          description: "desc",
          video: "https://youtube.com/watch?v=1",
          userId,
          challengeId: challenge.id,
        },
      });

      const res = await request(app).get("/api/leaderboard/bestParticipations");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("data");
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body).toHaveProperty("total");
      expect(res.body).toHaveProperty("totalPages");
    });

    test("should order participations by vote count desc", async () => {
      const user2 = await prisma.user.create({
        data: {
          username: "voter",
          email: "voter@example.com",
          password: await argon2.hash(VALID_PASSWORD),
          role: UserRole.user,
        },
      });

      const challenge = await prisma.challenge.create({
        data: {
          title: "Challenge Votes",
          slug: "challenge-votes",
          description: "desc",
          userId,
          gameId,
          challengeCategoryId: categoryId,
          difficultyId,
        },
      });

      const part1 = await prisma.participation.create({
        data: {
          title: "Few Votes",
          slug: "few-votes-testuser",
          description: "d",
          video: "https://youtube.com/watch?v=1",
          userId,
          challengeId: challenge.id,
        },
      });

      const part2 = await prisma.participation.create({
        data: {
          title: "Many Votes",
          slug: "many-votes-voter",
          description: "d",
          video: "https://youtube.com/watch?v=2",
          userId: user2.id,
          challengeId: challenge.id,
        },
      });

      await prisma.participationVote.createMany({
        data: [
          { userId, participationId: part2.id },
          { userId: user2.id, participationId: part2.id },
          { userId, participationId: part1.id },
        ],
      });

      const res = await request(app)
        .get("/api/leaderboard/bestParticipations")
        .query({ page: 1, limit: 10 });

      expect(res.status).toBe(200);
      expect(res.body.data[0].title).toBe("Many Votes");
      expect(res.body.data[0]._count.votes).toBe(2);
    });

    test("should filter by since (votes within period)", async () => {
      const challenge = await prisma.challenge.create({
        data: {
          title: "Filter Challenge",
          slug: "filter-challenge",
          description: "desc",
          userId,
          gameId,
          challengeCategoryId: categoryId,
          difficultyId,
        },
      });

      const part = await prisma.participation.create({
        data: {
          title: "Recent Voted Part",
          slug: "recent-voted-testuser",
          description: "d",
          video: "https://youtube.com/watch?v=1",
          userId,
          challengeId: challenge.id,
        },
      });

      await prisma.participationVote.create({
        data: { userId, participationId: part.id },
      });

      const res = await request(app)
        .get("/api/leaderboard/bestParticipations")
        .query({ since: "1w" });

      expect(res.status).toBe(200);
      const titles = res.body.data.map((p: { title: string }) => p.title);
      expect(titles).toContain("Recent Voted Part");
    });

    test("should return correct shape per participation item", async () => {
      const challenge = await prisma.challenge.create({
        data: {
          title: "Shape Challenge",
          slug: "shape-challenge",
          description: "desc",
          userId,
          gameId,
          challengeCategoryId: categoryId,
          difficultyId,
        },
      });

      const part = await prisma.participation.create({
        data: {
          title: "Shape Part",
          slug: "shape-part-testuser",
          description: "d",
          video: "https://youtube.com/watch?v=1",
          userId,
          challengeId: challenge.id,
        },
      });

      await prisma.participationVote.create({ data: { userId, participationId: part.id } });

      const res = await request(app).get("/api/leaderboard/bestParticipations");

      expect(res.status).toBe(200);
      const item = res.body.data[0];
      expect(item).toHaveProperty("title");
      expect(item).toHaveProperty("slug");
      expect(item).toHaveProperty("video");
      expect(item).toHaveProperty("user");
      expect(item).toHaveProperty("challenge");
      expect(item.challenge).toHaveProperty("game");
      expect(item).toHaveProperty("_count");
      expect(item._count).toHaveProperty("votes");
    });

    test("should return 400 for invalid since value", async () => {
      const res = await request(app)
        .get("/api/leaderboard/bestParticipations")
        .query({ since: "bad" });

      expect(res.status).toBe(400);
    });
  });

  // ---------------------------------------------------------------------------
  // GET /api/leaderboard/bestActivUsers
  // ---------------------------------------------------------------------------

  describe("GET /api/leaderboard/bestActivUsers", () => {
    test("should return 200 with paginated response", async () => {
      await prisma.challenge.create({
        data: {
          title: "User Challenge",
          slug: "user-challenge",
          description: "desc",
          userId,
          gameId,
          challengeCategoryId: categoryId,
          difficultyId,
        },
      });

      const res = await request(app).get("/api/leaderboard/bestActivUsers");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("data");
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body).toHaveProperty("total");
      expect(res.body).toHaveProperty("totalPages");
    });

    test("should order users by total activity (challenges + participations) desc", async () => {
      const user2 = await prisma.user.create({
        data: {
          username: "lessactive",
          email: "lessactive@example.com",
          password: await argon2.hash(VALID_PASSWORD),
          role: UserRole.user,
        },
      });

      // testuser: 2 challenges + 1 participation = 3 total
      const c1 = await prisma.challenge.create({
        data: {
          title: "Challenge A",
          slug: "challenge-a",
          description: "d",
          userId,
          gameId,
          challengeCategoryId: categoryId,
          difficultyId,
        },
      });
      await prisma.challenge.create({
        data: {
          title: "Challenge B",
          slug: "challenge-b",
          description: "d",
          userId,
          gameId,
          challengeCategoryId: categoryId,
          difficultyId,
        },
      });
      await prisma.participation.create({
        data: {
          title: "Part A",
          slug: "part-a-testuser",
          description: "d",
          video: "https://youtube.com/watch?v=1",
          userId,
          challengeId: c1.id,
        },
      });

      // lessactive: 1 challenge = 1 total
      await prisma.challenge.create({
        data: {
          title: "Challenge C",
          slug: "challenge-c",
          description: "d",
          userId: user2.id,
          gameId,
          challengeCategoryId: categoryId,
          difficultyId,
        },
      });

      const res = await request(app)
        .get("/api/leaderboard/bestActivUsers")
        .query({ page: 1, limit: 10 });

      expect(res.status).toBe(200);
      expect(res.body.data[0].username).toBe("testuser");
      expect(res.body.data[0].totalActivity).toBe(3);
    });

    test("should not include users with zero activity", async () => {
      // activeuser has activity, testuser does not
      const activeUser = await prisma.user.create({
        data: {
          username: "activeuser",
          email: "activeuser@example.com",
          password: "hash",
          role: UserRole.user,
        },
      });
      await prisma.challenge.create({
        data: {
          title: "Active Challenge",
          slug: "active-challenge",
          description: "d",
          userId: activeUser.id,
          gameId,
          challengeCategoryId: categoryId,
          difficultyId,
        },
      });

      const res = await request(app)
        .get("/api/leaderboard/bestActivUsers")
        .query({ page: 1, limit: 10 });

      expect(res.status).toBe(200);
      const usernames = res.body.data.map((u: { username: string }) => u.username);
      expect(usernames).toContain("activeuser");
      expect(usernames).not.toContain("testuser");
    });

    test("should return correct shape per user item", async () => {
      await prisma.challenge.create({
        data: {
          title: "Shape User Challenge",
          slug: "shape-user-challenge",
          description: "d",
          userId,
          gameId,
          challengeCategoryId: categoryId,
          difficultyId,
        },
      });

      const res = await request(app).get("/api/leaderboard/bestActivUsers");

      expect(res.status).toBe(200);
      const item = res.body.data[0];
      expect(item).toHaveProperty("id");
      expect(item).toHaveProperty("username");
      expect(item).toHaveProperty("country");
      expect(item).toHaveProperty("profilePicture");
      expect(item).toHaveProperty("participationCount");
      expect(item).toHaveProperty("challengeCount");
      expect(item).toHaveProperty("totalActivity");
    });

    test("should filter activity by since param", async () => {
      const user2 = await prisma.user.create({
        data: {
          username: "oldactive",
          email: "oldactive@example.com",
          password: await argon2.hash(VALID_PASSWORD),
          role: UserRole.user,
        },
      });

      // testuser: recent challenge
      await prisma.challenge.create({
        data: {
          title: "Recent Challenge",
          slug: "recent-challenge-user",
          description: "d",
          userId,
          gameId,
          challengeCategoryId: categoryId,
          difficultyId,
        },
      });

      // oldactive: old challenge only
      await prisma.challenge.create({
        data: {
          title: "Old Challenge",
          slug: "old-challenge-user",
          description: "d",
          userId: user2.id,
          gameId,
          challengeCategoryId: categoryId,
          difficultyId,
          createdAt: new Date("2020-01-01"),
        },
      });

      const res = await request(app).get("/api/leaderboard/bestActivUsers").query({ since: "1m" });

      expect(res.status).toBe(200);
      const usernames = res.body.data.map((u: { username: string }) => u.username);
      expect(usernames).toContain("testuser");
      expect(usernames).not.toContain("oldactive");
    });

    test("should return 400 for invalid since value", async () => {
      const res = await request(app).get("/api/leaderboard/bestActivUsers").query({ since: "bad" });

      expect(res.status).toBe(400);
    });

    test("should respect page and limit params", async () => {
      const users = await Promise.all(
        Array.from({ length: 4 }, (_, i) =>
          prisma.user.create({
            data: {
              username: `activeuser${i}`,
              email: `activeuser${i}@example.com`,
              password: "hash",
              role: UserRole.user,
            },
          })
        )
      );

      await Promise.all(
        users.map((u, i) =>
          prisma.challenge.create({
            data: {
              title: `Challenge ${i}`,
              slug: `challenge-active-${i}`,
              description: "d",
              userId: u.id,
              gameId,
              challengeCategoryId: categoryId,
              difficultyId,
            },
          })
        )
      );

      const res = await request(app)
        .get("/api/leaderboard/bestActivUsers")
        .query({ page: 1, limit: 2 });

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
      expect(res.body.limit).toBe(2);
    });
  });
});
