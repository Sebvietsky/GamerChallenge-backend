import { describe, test, afterEach, beforeEach, expect, vi } from "vitest";
import request from "supertest";
import { prisma } from "../lib/prisma";
import { app } from "../app";
import argon2 from "argon2";
import { UserRole } from "../lib/prisma";

const VALID_PASSWORD = "Password123456!";

describe("Participations Controller", () => {
  let userId: number;
  let gameId: number;
  let categoryId: number;
  let difficultyId: number;
  let challengeId: number;
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

    // 3. Create a game and category
    const gameCategory = await prisma.gameCategory.create({
      data: { name: "Action" },
    });

    const game = await prisma.game.create({
      data: {
        name: "Test Game",
        igdbId: 12345,
        categories: {
          create: {
            gameCategoryId: gameCategory.id,
          },
        },
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

    // 6. Create a challenge
    const challenge = await prisma.challenge.create({
      data: {
        title: "Test Challenge",
        slug: "test-challenge",
        description: "Description",
        userId,
        gameId,
        challengeCategoryId: categoryId,
        difficultyId,
      },
    });
    challengeId = challenge.id;
  });

  afterEach(async () => {
    // Clean up in reverse order of dependencies
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

  describe("GET /api/participations/:slug", () => {
    test("should return 200 and the participation if it exists", async () => {
      await prisma.participation.create({
        data: {
          title: "My Participation",
          slug: "my-participation",
          video: "https://youtube.com/watch?v=123",
          userId,
          challengeId,
        },
      });

      const response = await request(app).get("/api/participations/my-participation");

      expect(response.status).toBe(200);
      expect(response.body.title).toBe("My Participation");
      expect(response.body).toHaveProperty("challenge");
      expect(response.body.challenge.title).toBe("Test Challenge");
      expect(response.body.challenge.game.categories).toContain("Action");
    });

    test("should return 404 if not found", async () => {
      const response = await request(app).get("/api/participations/non-existent");
      expect(response.status).toBe(404);
    });
  });

  describe("PATCH /api/participations/:slug", () => {
    test("should return 200 if updated successfully", async () => {
      await prisma.participation.create({
        data: {
          title: "Old Title",
          slug: "old-title",
          video: "https://youtube.com/watch?v=old",
          userId,
          challengeId,
        },
      });

      const response = await request(app)
        .patch("/api/participations/old-title")
        .set("Cookie", accessToken)
        .send({ title: "Updated Title" });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Participation successfully updated.");

      const dbParticipation = await prisma.participation.findFirst({
        where: { slug: "old-title" },
      });
      expect(dbParticipation?.title).toBe("Updated Title");
    });

    test("should return 401 if not authenticated", async () => {
      const response = await request(app)
        .patch("/api/participations/some-slug")
        .send({ title: "Updated Title" });

      expect(response.status).toBe(401);
    });
  });

  describe("DELETE /api/participations/:slug", () => {
    test("should return 204 if deleted successfully", async () => {
      await prisma.participation.create({
        data: {
          title: "To Delete",
          slug: "to-delete",
          video: "https://youtube.com/watch?v=del",
          userId,
          challengeId,
        },
      });

      const response = await request(app)
        .delete("/api/participations/to-delete")
        .set("Cookie", accessToken);

      expect(response.status).toBe(204);
      const dbParticipation = await prisma.participation.findFirst({
        where: { slug: "to-delete" },
      });
      expect(dbParticipation).toBeNull();

      // Ensure the challenge still exists (to check against the suspected bug)
      const dbChallenge = await prisma.challenge.findUnique({ where: { id: challengeId } });
      expect(dbChallenge).not.toBeNull();
    });
  });
});
