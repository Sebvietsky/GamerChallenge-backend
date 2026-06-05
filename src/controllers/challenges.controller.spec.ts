import { describe, test, afterEach, beforeEach, expect, vi } from "vitest";
import request from "supertest";
import { prisma } from "../lib/prisma";
import { app } from "../app";
import argon2 from "argon2";
import { UserRole } from "../lib/prisma";
import { findOrCreateGameFromIGDB } from "../utils/game.utils";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock("../utils/game.utils", () => ({
  findOrCreateGameFromIGDB: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const VALID_PASSWORD = "Password123456!";

describe("Challenges Controller", () => {
  let userId: number;
  let gameId: number;
  let categoryId: number;
  let difficultyId: number;
  let accessToken: string;

  beforeEach(async () => {
    // 1. Create a user
    const user = await prisma.user.create({
      data: {
        username: "testuser",
        email: "test@example.com",
        password: await argon2.hash(VALID_PASSWORD),
        role: UserRole.user,
      },
    });
    userId = user.id;

    // 2. Login to get token
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

    // 3. Create a game
    const game = await prisma.game.create({
      data: {
        name: "Test Game",
        igdbId: 12345, // Adding it back as reset should have fixed it
      },
    });
    gameId = game.id;

    // 4. Create a category
    const category = await prisma.challengeCategory.create({
      data: {
        name: "Test Category",
      },
    });
    categoryId = category.id;

    // 5. Create a difficulty
    const difficulty = await prisma.difficulty.create({
      data: {
        name: "Easy",
      },
    });
    difficultyId = difficulty.id;

    // Setup mock
    vi.mocked(findOrCreateGameFromIGDB).mockResolvedValue(gameId);
  });

  afterEach(async () => {
    await prisma.participationVote.deleteMany();
    await prisma.participation.deleteMany();
    await prisma.challengeVote.deleteMany();
    await prisma.userFavoriteChallenge.deleteMany();
    await prisma.challenge.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany();
    await prisma.game.deleteMany();
    await prisma.challengeCategory.deleteMany();
    await prisma.difficulty.deleteMany();
    vi.clearAllMocks();
  });

  describe("GET /api/challenges", () => {
    test("should return 200 and a list of challenges", async () => {
      await prisma.challenge.create({
        data: {
          title: "Existing Challenge",
          slug: "existing-challenge",
          description: "Description",
          userId,
          gameId,
          challengeCategoryId: categoryId,
          difficultyId,
        },
      });

      const response = await request(app).get("/api/challenges").query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("data");
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(1);
    });
  });

  describe("GET /api/challenges/:slug", () => {
    test("should return 200 and the challenge if it exists", async () => {
      await prisma.challenge.create({
        data: {
          title: "Find Me",
          slug: "find-me-long-slug-to-pass-validation-aaaaaaaaaaaaaaaaaaa",
          description: "Description",
          userId,
          gameId,
          challengeCategoryId: categoryId,
          difficultyId,
        },
      });

      const response = await request(app).get(
        "/api/challenges/find-me-long-slug-to-pass-validation-aaaaaaaaaaaaaaaaaaa"
      );

      expect(response.status).toBe(200);
      expect(response.body.title).toBe("Find Me");
      expect(response.body).toHaveProperty("game");
      expect(Array.isArray(response.body.game.categories)).toBe(true);
    });

    test("should return 404 if not found", async () => {
      const response = await request(app).get(
        "/api/challenges/non-existent-long-slug-to-pass-validation-aaaaaaaaa"
      );
      expect(response.status).toBe(404);
    });
  });

  describe("POST /api/challenges", () => {
    test("should return 201 if created successfully", async () => {
      const response = await request(app).post("/api/challenges").set("Cookie", accessToken).send({
        title: "New Challenge",
        description: "A great description",
        igdbId: 12345,
        challengeCategoryId: categoryId,
        difficultyId: difficultyId,
      });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe("Challenge successfully created.");

      const dbChallenge = await prisma.challenge.findFirst({ where: { title: "New Challenge" } });
      expect(dbChallenge).not.toBeNull();
      expect(dbChallenge?.slug).toContain("new-challenge");
    });

    test("should return 401 if not authenticated", async () => {
      const response = await request(app).post("/api/challenges").send({
        title: "Unauth Challenge",
        description: "No token",
        igdbId: 12345,
        challengeCategoryId: categoryId,
        difficultyId: difficultyId,
      });

      expect(response.status).toBe(401);
    });
  });

  describe("PATCH /api/challenges/:slug", () => {
    test("should return 200 if updated successfully", async () => {
      await prisma.challenge.create({
        data: {
          title: "Old Title",
          slug: "old-title-long-slug-to-pass-validation-aaaaaaaaaaaaaaaaaa",
          description: "Description",
          userId,
          gameId,
          challengeCategoryId: categoryId,
          difficultyId,
        },
      });

      const response = await request(app)
        .patch("/api/challenges/old-title-long-slug-to-pass-validation-aaaaaaaaaaaaaaaaaa")
        .set("Cookie", accessToken)
        .send({ title: "Updated Title" });

      expect(response.status).toBe(200);
      const dbChallenge = await prisma.challenge.findFirst({ where: { title: "Updated Title" } });
      expect(dbChallenge?.title).toBe("Updated Title");
    });
  });

  describe("DELETE /api/challenges/:slug", () => {
    test("should return 204 if deleted successfully", async () => {
      await prisma.challenge.create({
        data: {
          title: "To Delete",
          slug: "to-delete-long-slug-to-pass-validation-aaaaaaaaaaaaaaaaaa",
          description: "Description",
          userId,
          gameId,
          challengeCategoryId: categoryId,
          difficultyId,
        },
      });

      const response = await request(app)
        .delete("/api/challenges/to-delete-long-slug-to-pass-validation-aaaaaaaaaaaaaaaaaa")
        .set("Cookie", accessToken);

      expect(response.status).toBe(204);
      const dbChallenge = await prisma.challenge.findFirst({
        where: { slug: "to-delete-long-slug-to-pass-validation-aaaaaaaaaaaaaaaaaa" },
      });
      expect(dbChallenge).toBeNull();
    });
  });

  describe("GET /api/challenges/:slug/participations", () => {
    test("should return 200 and a list of participations", async () => {
      const challenge = await prisma.challenge.create({
        data: {
          title: "Participate Here",
          slug: "participate-here-long-slug-to-pass-validation-aaaaaaaaaaaa",
          description: "Description",
          userId,
          gameId,
          challengeCategoryId: categoryId,
          difficultyId,
        },
      });

      await prisma.participation.create({
        data: {
          title: "My Participation",
          slug: "my-participation-testuser-long-slug-to-pass-validation-aaaa",
          description: "I did it!",
          video: "https://youtube.com/watch?v=123",
          userId,
          challengeId: challenge.id,
        },
      });

      const response = await request(app).get(
        "/api/challenges/participate-here-long-slug-to-pass-validation-aaaaaaaaaaaa/participations"
      );

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("data");
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].title).toBe("My Participation");
    });
  });

  describe("GET /api/challenges/home", () => {
    test("should return 200 with challenges ordered by votes by default", async () => {
      await prisma.challenge.create({
        data: {
          title: "Home Challenge",
          slug: "home-challenge",
          description: "Description",
          userId,
          gameId,
          challengeCategoryId: categoryId,
          difficultyId,
        },
      });

      const response = await request(app).get("/api/challenges/home");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("data");
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test("should order by participations when sortBy=participations", async () => {
      const user2 = await prisma.user.create({
        data: {
          username: "user2",
          email: "user2@example.com",
          password: await argon2.hash(VALID_PASSWORD),
          role: UserRole.user,
        },
      });

      const c1 = await prisma.challenge.create({
        data: {
          title: "Few Parts",
          slug: "few-parts",
          description: "d",
          userId,
          gameId,
          challengeCategoryId: categoryId,
          difficultyId,
        },
      });
      const c2 = await prisma.challenge.create({
        data: {
          title: "Many Parts",
          slug: "many-parts",
          description: "d",
          userId,
          gameId,
          challengeCategoryId: categoryId,
          difficultyId,
        },
      });

      await prisma.participation.createMany({
        data: [
          {
            title: "p1",
            slug: "p1-testuser",
            description: "d",
            video: "https://youtube.com/watch?v=1",
            userId,
            challengeId: c2.id,
          },
          {
            title: "p2",
            slug: "p2-user2",
            description: "d",
            video: "https://youtube.com/watch?v=2",
            userId: user2.id,
            challengeId: c2.id,
          },
          {
            title: "p3",
            slug: "p3-testuser",
            description: "d",
            video: "https://youtube.com/watch?v=3",
            userId,
            challengeId: c1.id,
          },
        ],
      });

      const response = await request(app)
        .get("/api/challenges/home")
        .query({ sortBy: "participations", limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.data[0].title).toBe("Many Parts");
    });

    test("should filter by since param", async () => {
      const oldChallenge = await prisma.challenge.create({
        data: {
          title: "Old Home Challenge",
          slug: "old-home-challenge",
          description: "d",
          userId,
          gameId,
          challengeCategoryId: categoryId,
          difficultyId,
          createdAt: new Date("2020-01-01"),
        },
      });

      const recentChallenge = await prisma.challenge.create({
        data: {
          title: "Recent Home Challenge",
          slug: "recent-home-challenge",
          description: "d",
          userId,
          gameId,
          challengeCategoryId: categoryId,
          difficultyId,
        },
      });

      const response = await request(app).get("/api/challenges/home").query({ since: "1m" });

      expect(response.status).toBe(200);
      const titles = response.body.data.map((c: { title: string }) => c.title);
      expect(titles).toContain(recentChallenge.title);
      expect(titles).not.toContain(oldChallenge.title);
    });

    test("should return 400 for invalid sortBy value", async () => {
      const response = await request(app).get("/api/challenges/home").query({ sortBy: "invalid" });
      expect(response.status).toBe(400);
    });

    test("should respect the limit param", async () => {
      await prisma.challenge.createMany({
        data: Array.from({ length: 5 }, (_, i) => ({
          title: `Home C${i}`,
          slug: `home-c${i}`,
          description: "d",
          userId,
          gameId,
          challengeCategoryId: categoryId,
          difficultyId,
        })),
      });

      const response = await request(app).get("/api/challenges/home").query({ limit: 2 });

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(2);
    });
  });

  describe("GET /api/challenges (filters)", () => {
    test("should filter by search (title contains)", async () => {
      await prisma.challenge.createMany({
        data: [
          {
            title: "Speedrun World Record",
            slug: "speedrun-world-record",
            description: "d",
            userId,
            gameId,
            challengeCategoryId: categoryId,
            difficultyId,
          },
          {
            title: "No Hit Run",
            slug: "no-hit-run",
            description: "d",
            userId,
            gameId,
            challengeCategoryId: categoryId,
            difficultyId,
          },
        ],
      });

      const response = await request(app).get("/api/challenges").query({ search: "Speedrun" });

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].title).toBe("Speedrun World Record");
    });

    test("should filter by status", async () => {
      await prisma.challenge.createMany({
        data: [
          {
            title: "Active Challenge",
            slug: "active-challenge",
            description: "d",
            userId,
            gameId,
            challengeCategoryId: categoryId,
            difficultyId,
            status: "active",
          },
          {
            title: "Closed Challenge",
            slug: "closed-challenge",
            description: "d",
            userId,
            gameId,
            challengeCategoryId: categoryId,
            difficultyId,
            status: "closed",
          },
        ],
      });

      const response = await request(app).get("/api/challenges").query({ status: "active" });

      expect(response.status).toBe(200);
      const titles = response.body.data.map((c: { title: string }) => c.title);
      expect(titles).toContain("Active Challenge");
      expect(titles).not.toContain("Closed Challenge");
    });

    test("should return 400 for invalid status value", async () => {
      const response = await request(app).get("/api/challenges").query({ status: "invalid" });
      expect(response.status).toBe(400);
    });
  });

  describe("PATCH /api/challenges/:slug (auth)", () => {
    test("should return 401 if not authenticated", async () => {
      await prisma.challenge.create({
        data: {
          title: "Auth Test Challenge",
          slug: "auth-test-challenge",
          description: "d",
          userId,
          gameId,
          challengeCategoryId: categoryId,
          difficultyId,
        },
      });

      const response = await request(app)
        .patch("/api/challenges/auth-test-challenge")
        .send({ title: "Hacked" });

      expect(response.status).toBe(401);
    });
  });

  describe("DELETE /api/challenges/:slug (auth)", () => {
    test("should return 401 if not authenticated", async () => {
      await prisma.challenge.create({
        data: {
          title: "Auth Delete Challenge",
          slug: "auth-delete-challenge",
          description: "d",
          userId,
          gameId,
          challengeCategoryId: categoryId,
          difficultyId,
        },
      });

      const response = await request(app).delete("/api/challenges/auth-delete-challenge");

      expect(response.status).toBe(401);
    });
  });

  describe("POST /api/challenges/:slug/likes", () => {
    test("should return 201 if liked successfully", async () => {
      await prisma.challenge.create({
        data: {
          title: "Like This",
          slug: "like-this-long-slug-to-pass-validation-aaaaaaaaaaaaaaaaaaa",
          description: "d",
          userId,
          gameId,
          challengeCategoryId: categoryId,
          difficultyId,
        },
      });

      const response = await request(app)
        .post("/api/challenges/like-this-long-slug-to-pass-validation-aaaaaaaaaaaaaaaaaaa/likes")
        .set("Cookie", accessToken);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe("Challenge liked success");

      const vote = await prisma.challengeVote.findFirst({
        where: {
          userId,
          challenge: { slug: "like-this-long-slug-to-pass-validation-aaaaaaaaaaaaaaaaaaa" },
        },
      });
      expect(vote).not.toBeNull();
    });

    test("should return 401 if not authenticated", async () => {
      const response = await request(app).post("/api/challenges/some-slug/likes");
      expect(response.status).toBe(401);
    });
  });

  describe("DELETE /api/challenges/:slug/likes", () => {
    test("should return 204 if unliked successfully", async () => {
      const challenge = await prisma.challenge.create({
        data: {
          title: "Unlike This",
          slug: "unlike-this-long-slug-to-pass-validation-aaaaaaaaaaaaaaaaaa",
          description: "d",
          userId,
          gameId,
          challengeCategoryId: categoryId,
          difficultyId,
        },
      });

      await prisma.challengeVote.create({ data: { userId, challengeId: challenge.id } });

      const response = await request(app)
        .delete("/api/challenges/unlike-this-long-slug-to-pass-validation-aaaaaaaaaaaaaaaaaa/likes")
        .set("Cookie", accessToken);

      expect(response.status).toBe(204);

      const vote = await prisma.challengeVote.findFirst({
        where: {
          userId,
          challenge: { slug: "unlike-this-long-slug-to-pass-validation-aaaaaaaaaaaaaaaaaa" },
        },
      });
      expect(vote).toBeNull();
    });

    test("should return 401 if not authenticated", async () => {
      const response = await request(app).delete("/api/challenges/some-slug/likes");
      expect(response.status).toBe(401);
    });

    test("should return 204 idempotently when no like exists", async () => {
      await prisma.challenge.create({
        data: {
          title: "No Like",
          slug: "no-like-long-slug-to-pass-validation-aaaaaaaaaaaaaaaaaaaaaa",
          description: "d",
          userId,
          gameId,
          challengeCategoryId: categoryId,
          difficultyId,
        },
      });

      const response = await request(app)
        .delete("/api/challenges/no-like-long-slug-to-pass-validation-aaaaaaaaaaaaaaaaaaaaaa/likes")
        .set("Cookie", accessToken);

      expect(response.status).toBe(204);
    });
  });

  describe("POST /api/challenges/:slug/favorites", () => {
    test("should return 201 if added to favorites", async () => {
      await prisma.challenge.create({
        data: {
          title: "Favorite This",
          slug: "favorite-this-long-slug-to-pass-validation-aaaaaaaaaaaaaaaaaa",
          description: "d",
          userId,
          gameId,
          challengeCategoryId: categoryId,
          difficultyId,
        },
      });

      const response = await request(app)
        .post(
          "/api/challenges/favorite-this-long-slug-to-pass-validation-aaaaaaaaaaaaaaaaaa/favorites"
        )
        .set("Cookie", accessToken);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe("Challenge add to favorite");

      const fav = await prisma.userFavoriteChallenge.findFirst({
        where: {
          userId,
          challenge: { slug: "favorite-this-long-slug-to-pass-validation-aaaaaaaaaaaaaaaaaa" },
        },
      });
      expect(fav).not.toBeNull();
    });

    test("should return 401 if not authenticated", async () => {
      const response = await request(app).post("/api/challenges/some-slug/favorites");
      expect(response.status).toBe(401);
    });
  });

  describe("DELETE /api/challenges/:slug/favorites", () => {
    test("should return 204 if removed from favorites", async () => {
      const challenge = await prisma.challenge.create({
        data: {
          title: "Unfavorite This",
          slug: "unfavorite-this-long-slug-to-pass-validation-aaaaaaaaaaaaaaaa",
          description: "d",
          userId,
          gameId,
          challengeCategoryId: categoryId,
          difficultyId,
        },
      });

      await prisma.userFavoriteChallenge.create({ data: { userId, challengeId: challenge.id } });

      const response = await request(app)
        .delete(
          "/api/challenges/unfavorite-this-long-slug-to-pass-validation-aaaaaaaaaaaaaaaa/favorites"
        )
        .set("Cookie", accessToken);

      expect(response.status).toBe(204);

      const fav = await prisma.userFavoriteChallenge.findFirst({
        where: {
          userId,
          challenge: { slug: "unfavorite-this-long-slug-to-pass-validation-aaaaaaaaaaaaaaaa" },
        },
      });
      expect(fav).toBeNull();
    });

    test("should return 401 if not authenticated", async () => {
      const response = await request(app).delete("/api/challenges/some-slug/favorites");
      expect(response.status).toBe(401);
    });
  });

  describe("POST /api/challenges/:slug/participations", () => {
    test("should return 201 if participation created successfully", async () => {
      await prisma.challenge.create({
        data: {
          title: "Challenge to Join",
          slug: "challenge-to-join-long-slug-to-pass-validation-aaaaaaaaaaaaa",
          description: "Description",
          userId,
          gameId,
          challengeCategoryId: categoryId,
          difficultyId,
        },
      });

      const response = await request(app)
        .post(
          "/api/challenges/challenge-to-join-long-slug-to-pass-validation-aaaaaaaaaaaaa/participations"
        )
        .set("Cookie", accessToken)
        .send({
          title: "Joining Now",
          description: "Ready to go",
          video: "https://twitch.tv/video/123",
        });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe("Participation successfully created.");

      const dbParticipation = await prisma.participation.findFirst({
        where: { title: "Joining Now" },
      });
      expect(dbParticipation).not.toBeNull();
    });

    test("should return 401 if not authenticated", async () => {
      const response = await request(app).post("/api/challenges/some-slug/participations").send({
        title: "Unauth Join",
        description: "No token",
        video: "https://video.com",
      });

      expect(response.status).toBe(401);
    });
  });
});
