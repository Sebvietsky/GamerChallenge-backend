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
    // Clean up
    await prisma.participation.deleteMany();
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
          slug: "find-me",
          description: "Description",
          userId,
          gameId,
          challengeCategoryId: categoryId,
          difficultyId,
        },
      });

      const response = await request(app).get("/api/challenges/find-me");

      expect(response.status).toBe(200);
      expect(response.body.title).toBe("Find Me");
      expect(response.body).toHaveProperty("game");
      expect(Array.isArray(response.body.game.categories)).toBe(true);
    });

    test("should return 404 if not found", async () => {
      const response = await request(app).get("/api/challenges/non-existent");
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
      expect(dbChallenge?.slug).toBe("new-challengetestuser");
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
          slug: "old-title",
          description: "Description",
          userId,
          gameId,
          challengeCategoryId: categoryId,
          difficultyId,
        },
      });

      const response = await request(app)
        .patch("/api/challenges/old-title")
        .set("Cookie", accessToken)
        .send({ title: "Updated Title" });

      expect(response.status).toBe(200);
      const dbChallenge = await prisma.challenge.findFirst({ where: { slug: "old-title" } });
      expect(dbChallenge?.title).toBe("Updated Title");
    });
  });

  describe("DELETE /api/challenges/:slug", () => {
    test("should return 204 if deleted successfully", async () => {
      await prisma.challenge.create({
        data: {
          title: "To Delete",
          slug: "to-delete",
          description: "Description",
          userId,
          gameId,
          challengeCategoryId: categoryId,
          difficultyId,
        },
      });

      const response = await request(app)
        .delete("/api/challenges/to-delete")
        .set("Cookie", accessToken);

      expect(response.status).toBe(204);
      const dbChallenge = await prisma.challenge.findFirst({ where: { slug: "to-delete" } });
      expect(dbChallenge).toBeNull();
    });
  });

  describe("GET /api/challenges/:slug/participations", () => {
    test("should return 200 and a list of participations", async () => {
      const challenge = await prisma.challenge.create({
        data: {
          title: "Participate Here",
          slug: "participate-here",
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
          slug: "my-participation-testuser",
          description: "I did it!",
          video: "https://youtube.com/watch?v=123",
          userId,
          challengeId: challenge.id,
        },
      });

      const response = await request(app).get("/api/challenges/participate-here/participations");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("data");
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].title).toBe("My Participation");
    });
  });

  describe("POST /api/challenges/:slug/participations", () => {
    test("should return 201 if participation created successfully", async () => {
      await prisma.challenge.create({
        data: {
          title: "Challenge to Join",
          slug: "challenge-to-join",
          description: "Description",
          userId,
          gameId,
          challengeCategoryId: categoryId,
          difficultyId,
        },
      });

      const response = await request(app)
        .post("/api/challenges/challenge-to-join/participations")
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
