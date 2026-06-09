import { describe, test, afterEach, beforeEach, expect, vi } from "vitest";
import request from "supertest";
import { prisma } from "../lib/prisma";
import { app } from "../app";
import argon2 from "argon2";
import { UserRole } from "../lib/prisma";

const VALID_PASSWORD = "Password123456!";

describe("User Controller", () => {
  let userId: number;
  let otherUserId: number;
  let gameId: number;
  let categoryId: number;
  let difficultyId: number;
  let challengeId: number;
  let participationId: number;
  let accessToken: string;

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

    const otherUser = await prisma.user.create({
      data: {
        username: "otheruser",
        email: "other@example.com",
        password: await argon2.hash(VALID_PASSWORD),
        role: UserRole.user,
      },
    });
    otherUserId = otherUser.id;

    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "test@example.com", password: VALID_PASSWORD });

    const rawCookies = loginRes.headers["set-cookie"];
    const cookies: string[] = Array.isArray(rawCookies)
      ? rawCookies
      : rawCookies
        ? [rawCookies]
        : [];
    accessToken = cookies.find((c: string) => c.startsWith("accessToken=")) || "";

    const gameCategory = await prisma.gameCategory.create({
      data: { name: "Action" },
    });

    const game = await prisma.game.create({
      data: {
        name: "Test Game",
        igdbId: 99999,
        categories: { create: { gameCategoryId: gameCategory.id } },
      },
    });
    gameId = game.id;

    const category = await prisma.challengeCategory.create({
      data: { name: "Speedrun" },
    });
    categoryId = category.id;

    const difficulty = await prisma.difficulty.create({
      data: { name: "Easy" },
    });
    difficultyId = difficulty.id;

    const challenge = await prisma.challenge.create({
      data: {
        title: "Test Challenge",
        slug: "test-challenge-long-slug-to-pass-validation-aaaaaaaaaaaaaaaa",
        description: "Description",
        status: "active",
        userId,
        gameId,
        challengeCategoryId: categoryId,
        difficultyId,
      },
    });
    challengeId = challenge.id;

    const participation = await prisma.participation.create({
      data: {
        title: "Test Participation",
        slug: "test-participation-long-slug-to-pass-validation-aaaaaaaaaaaa",
        video: "https://youtube.com/watch?v=test",
        userId: otherUserId,
        challengeId,
      },
    });
    participationId = participation.id;
  });

  afterEach(async () => {
    await prisma.participationVote.deleteMany();
    await prisma.challengeVote.deleteMany();
    await prisma.userFavoriteChallenge.deleteMany();
    await prisma.participation.deleteMany();
    await prisma.challenge.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany();
    await prisma.game.deleteMany();
    await prisma.gameCategory.deleteMany();
    await prisma.challengeCategory.deleteMany();
    await prisma.difficulty.deleteMany();
    vi.clearAllMocks();
  });

  describe("GET /api/user/isFavorite", () => {
    test("should return 200 with slugs when user has favorites", async () => {
      await prisma.userFavoriteChallenge.create({
        data: { userId, challengeId },
      });

      const response = await request(app).get("/api/user/isFavorite").set("Cookie", accessToken);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toHaveProperty("slug");
      expect(response.body[0]).toHaveProperty("id");
      expect(response.body[0]).toHaveProperty("visibility");
    });

    test("should return 200 with empty array when user has no favorites", async () => {
      const response = await request(app).get("/api/user/isFavorite").set("Cookie", accessToken);

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    test("should return 401 if not authenticated", async () => {
      const response = await request(app).get("/api/user/isFavorite");
      expect(response.status).toBe(401);
    });
  });

  describe("GET /api/user/getFavorites", () => {
    test("should return 200 with full challenge data", async () => {
      await prisma.userFavoriteChallenge.create({
        data: { userId, challengeId },
      });

      const response = await request(app).get("/api/user/getFavorites").set("Cookie", accessToken);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toHaveProperty("title", "Test Challenge");
      expect(response.body[0].game.categories).toContain("Action");
    });

    test("should return 404 if user has no favorites", async () => {
      const response = await request(app).get("/api/user/getFavorites").set("Cookie", accessToken);

      expect(response.status).toBe(404);
    });

    test("should return 401 if not authenticated", async () => {
      const response = await request(app).get("/api/user/getFavorites");
      expect(response.status).toBe(401);
    });

    test("should respect pagination", async () => {
      const [c2, c3] = await Promise.all([
        prisma.challenge.create({
          data: {
            title: "Challenge 2",
            slug: "challenge-2-long-slug-to-pass-validation-aaaaaaaaaaaaaaaa",
            description: "Desc",
            status: "active",
            userId,
            gameId,
            challengeCategoryId: categoryId,
            difficultyId,
          },
        }),
        prisma.challenge.create({
          data: {
            title: "Challenge 3",
            slug: "challenge-3-long-slug-to-pass-validation-aaaaaaaaaaaaaaaa",
            description: "Desc",
            status: "active",
            userId,
            gameId,
            challengeCategoryId: categoryId,
            difficultyId,
          },
        }),
      ]);

      await prisma.userFavoriteChallenge.createMany({
        data: [
          { userId, challengeId },
          { userId, challengeId: c2.id },
          { userId, challengeId: c3.id },
        ],
      });

      const response = await request(app)
        .get("/api/user/getFavorites?page=1&limit=2")
        .set("Cookie", accessToken);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
    });
  });

  describe("GET /api/user/isLikedChallenge", () => {
    test("should return 200 with slugs when user has liked challenges", async () => {
      await prisma.challengeVote.create({
        data: { userId, challengeId },
      });

      const response = await request(app)
        .get("/api/user/isLikedChallenge")
        .set("Cookie", accessToken);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toHaveProperty("slug");
      expect(response.body[0]).toHaveProperty("id");
      expect(response.body[0]).toHaveProperty("visibility");
    });

    test("should return 200 with empty array when user has no liked challenges", async () => {
      const response = await request(app)
        .get("/api/user/isLikedChallenge")
        .set("Cookie", accessToken);

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    test("should return 401 if not authenticated", async () => {
      const response = await request(app).get("/api/user/isLikedChallenge");
      expect(response.status).toBe(401);
    });
  });

  describe("GET /api/user/getLikedChallenges", () => {
    test("should return 200 with full challenge data", async () => {
      await prisma.challengeVote.create({
        data: { userId, challengeId },
      });

      const response = await request(app)
        .get("/api/user/getLikedChallenges")
        .set("Cookie", accessToken);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toHaveProperty("title", "Test Challenge");
      expect(response.body[0].game.categories).toContain("Action");
    });

    test("should return 404 if user has no liked challenges", async () => {
      const response = await request(app)
        .get("/api/user/getLikedChallenges")
        .set("Cookie", accessToken);

      expect(response.status).toBe(404);
    });

    test("should return 401 if not authenticated", async () => {
      const response = await request(app).get("/api/user/getLikedChallenges");
      expect(response.status).toBe(401);
    });
  });

  describe("GET /api/user/isLikedParticipation", () => {
    test("should return 200 with slugs when user has liked participations", async () => {
      await prisma.participationVote.create({
        data: { userId, participationId },
      });

      const response = await request(app)
        .get("/api/user/isLikedParticipation")
        .set("Cookie", accessToken);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toHaveProperty("slug");
      expect(response.body[0]).toHaveProperty("id");
      expect(response.body[0]).toHaveProperty("visibility");
    });

    test("should return 200 with empty array when user has no liked participations", async () => {
      const response = await request(app)
        .get("/api/user/isLikedParticipation")
        .set("Cookie", accessToken);

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    test("should return 401 if not authenticated", async () => {
      const response = await request(app).get("/api/user/isLikedParticipation");
      expect(response.status).toBe(401);
    });
  });

  describe("GET /api/user/getLikedParticipations", () => {
    test("should return 200 with full participation data", async () => {
      await prisma.participationVote.create({
        data: { userId, participationId },
      });

      const response = await request(app)
        .get("/api/user/getLikedParticipations")
        .set("Cookie", accessToken);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toHaveProperty("title", "Test Participation");
    });

    test("should return 404 if user has no liked participations", async () => {
      const response = await request(app)
        .get("/api/user/getLikedParticipations")
        .set("Cookie", accessToken);

      expect(response.status).toBe(404);
    });

    test("should return 401 if not authenticated", async () => {
      const response = await request(app).get("/api/user/getLikedParticipations");
      expect(response.status).toBe(401);
    });
  });

  describe("GET /api/user/dashboard", () => {
    test("should return 200 with correct counts", async () => {
      await prisma.participation.create({
        data: {
          title: "My Participation",
          slug: "my-participation-long-slug-to-pass-validation-aaaaaaaaaaaa",
          video: "https://youtube.com/watch?v=mine",
          userId,
          challengeId,
        },
      });

      await prisma.challengeVote.create({
        data: { userId, challengeId },
      });

      const response = await request(app).get("/api/user/dashboard").set("Cookie", accessToken);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("totalParticipation", 1);
      expect(response.body).toHaveProperty("totalChallengeCreated", 1);
      expect(response.body).toHaveProperty("totalChallengeUserVoted", 1);
      expect(response.body).toHaveProperty("totalParticipationUserVoted", 0);
      expect(response.body).toHaveProperty("totalVote", 1);
      expect(response.body).toHaveProperty("totalVoteReceivedOnChallenge", 1);
      expect(response.body).toHaveProperty("totalVoteReceivedOnParticipation", 0);
    });

    test("should return mostLikedChallenge as the challenge with the most votes", async () => {
      const popular = await prisma.challenge.create({
        data: {
          title: "Popular Challenge",
          slug: "popular-challenge-long-slug-to-pass-validation-aaaaaaaaaaaaaa",
          description: "Desc",
          status: "active",
          userId,
          gameId,
          challengeCategoryId: categoryId,
          difficultyId,
        },
      });

      await prisma.challengeVote.create({
        data: { userId: otherUserId, challengeId: popular.id },
      });

      const response = await request(app).get("/api/user/dashboard").set("Cookie", accessToken);

      expect(response.status).toBe(200);
      expect(response.body.mostLikedChallenge).toHaveProperty("title", "Popular Challenge");
    });

    test("should return null for mostLikedChallenge and mostLikedParticipation when user has no data", async () => {
      await prisma.challenge.deleteMany({ where: { userId } });

      const response = await request(app).get("/api/user/dashboard").set("Cookie", accessToken);

      expect(response.status).toBe(200);
      expect(response.body.mostLikedChallenge).toBeNull();
      expect(response.body.mostLikedParticipation).toBeNull();
    });

    test("should only count data belonging to the authenticated user", async () => {
      const response = await request(app).get("/api/user/dashboard").set("Cookie", accessToken);

      expect(response.status).toBe(200);
      expect(response.body.totalParticipation).toBe(0);
    });

    test("should return 401 if not authenticated", async () => {
      const response = await request(app).get("/api/user/dashboard");
      expect(response.status).toBe(401);
    });
  });
});
