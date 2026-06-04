import { describe, test, afterEach, beforeEach, expect, vi } from "vitest";
import request from "supertest";
import { prisma } from "../lib/prisma";
import { app } from "../app";
import argon2 from "argon2";
import { UserRole } from "../lib/prisma";

const VALID_PASSWORD = "Password123456!";

describe("Participations Controller", () => {
  let userId: number;
  let otherUserId: number;
  let gameId: number;
  let categoryId: number;
  let difficultyId: number;
  let challengeId: number;
  let accessToken: string;
  let adminAccessToken: string;

  beforeEach(async () => {
    // 1. Create users
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

    const admin = await prisma.user.create({
      data: {
        username: "adminuser",
        email: "admin@example.com",
        password: await argon2.hash(VALID_PASSWORD),
        role: UserRole.admin,
      },
    });

    // 2. Login to get tokens
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

    const adminLoginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@example.com", password: VALID_PASSWORD });

    const adminRawCookies = adminLoginRes.headers["set-cookie"];
    const adminCookies: string[] = Array.isArray(adminRawCookies)
      ? adminRawCookies
      : adminRawCookies
        ? [adminRawCookies]
        : [];
    adminAccessToken = adminCookies.find((c: string) => c.startsWith("accessToken=")) || "";

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
        slug: "test-challenge-long-slug-to-pass-validation-aaaaaaaaaaaaaaaa",
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
          slug: "my-participation-long-slug-to-pass-validation-aaaaaaaaaa",
          video: "https://youtube.com/watch?v=123",
          userId,
          challengeId,
        },
      });

      const response = await request(app).get(
        "/api/participations/my-participation-long-slug-to-pass-validation-aaaaaaaaaa"
      );

      expect(response.status).toBe(200);
      expect(response.body.title).toBe("My Participation");
      expect(response.body).toHaveProperty("challenge");
      expect(response.body.challenge.title).toBe("Test Challenge");
      expect(response.body.challenge.game.categories).toContain("Action");
    });

    test("should return 404 if not found", async () => {
      const response = await request(app).get(
        "/api/participations/non-existent-but-long-enough-slug-to-pass-validation-aaaaaaaaaa"
      );
      expect(response.status).toBe(404);
    });
  });

  describe("POST /api/participations/:slug/vote", () => {
    test("should return 200 if liked successfully", async () => {
      await prisma.participation.create({
        data: {
          title: "To Like",
          slug: "to-like-long-slug-to-pass-validation-aaaaaaaaaaaaaaaaaa",
          video: "https://youtube.com/watch?v=like",
          userId: otherUserId,
          challengeId,
        },
      });

      const response = await request(app)
        .post("/api/participations/to-like-long-slug-to-pass-validation-aaaaaaaaaaaaaaaaaa/vote")
        .set("Cookie", accessToken);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Upvote successfully added to the participation.");

      const vote = await prisma.participationVote.findFirst({
        where: {
          userId,
          participation: { slug: "to-like-long-slug-to-pass-validation-aaaaaaaaaaaaaaaaaa" },
        },
      });
      expect(vote).not.toBeNull();
    });

    test("should return 401 if not authenticated", async () => {
      const response = await request(app).post(
        "/api/participations/some-slug-long-enough-to-pass-validation-aaaaaaaaaaaaaa/vote"
      );
      expect(response.status).toBe(401);
    });
  });

  describe("PATCH /api/participations/:slug", () => {
    test("should return 200 if updated successfully", async () => {
      await prisma.participation.create({
        data: {
          title: "Old Title",
          slug: "old-title-testuser-long-slug-to-pass-validation-aaaaaaaaa",
          video: "https://youtube.com/watch?v=old",
          userId,
          challengeId,
        },
      });

      const response = await request(app)
        .patch("/api/participations/old-title-testuser-long-slug-to-pass-validation-aaaaaaaaa")
        .set("Cookie", accessToken)
        .send({ title: "Updated Title" });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Participation successfully updated.");

      const dbParticipation = await prisma.participation.findFirst({
        where: { title: "Updated Title" },
      });
      // Title should be updated, slug now contains admin/user part (as before) or UUID (if not username)
      // The current controller logic for PATCH still uses username if provided
      expect(dbParticipation?.title).toBe("Updated Title");
      expect(dbParticipation?.slug).toBeTruthy();
    });

    test("should regenerate slug when title is updated", async () => {
      await prisma.participation.create({
        data: {
          title: "Initial Title",
          slug: "initial-title-testuser-long-slug-to-pass-validation-aaaaaa",
          video: "https://youtube.com/watch?v=init",
          userId,
          challengeId,
        },
      });

      const response = await request(app)
        .patch("/api/participations/initial-title-testuser-long-slug-to-pass-validation-aaaaaa")
        .set("Cookie", accessToken)
        .send({ title: "New Shiny Title" });

      expect(response.status).toBe(200);

      const dbParticipation = await prisma.participation.findFirst({
        where: { title: "New Shiny Title" },
      });
      expect(dbParticipation?.slug).toContain("new-shiny-title");
      expect(dbParticipation?.slug).toBeTruthy();
    });

    test("should return 401 if not authenticated", async () => {
      const response = await request(app)
        .patch("/api/participations/some-slug-long-enough-to-pass-validation-aaaaaaaaaaaaaa")
        .send({ title: "Updated Title" });

      expect(response.status).toBe(401);
    });

    test("should return 403 if trying to update someone else's participation", async () => {
      await prisma.participation.create({
        data: {
          title: "Other Participation",
          slug: "other-participation-long-slug-to-pass-validation-aaaaaaaa",
          video: "https://youtube.com/watch?v=other",
          userId: otherUserId,
          challengeId,
        },
      });

      const response = await request(app)
        .patch("/api/participations/other-participation-long-slug-to-pass-validation-aaaaaaaa")
        .set("Cookie", accessToken)
        .send({ title: "Hack Title" });

      expect(response.status).toBe(403);
    });

    test("should return 200 if admin updates someone else's participation", async () => {
      await prisma.participation.create({
        data: {
          title: "Other Participation",
          slug: "other-participation-otheruser-long-slug-to-pass-validation",
          video: "https://youtube.com/watch?v=other",
          userId: otherUserId,
          challengeId,
        },
      });

      const response = await request(app)
        .patch("/api/participations/other-participation-otheruser-long-slug-to-pass-validation")
        .set("Cookie", adminAccessToken)
        .send({ title: "Admin Update" });

      expect(response.status).toBe(200);
      const dbParticipation = await prisma.participation.findFirst({
        where: { title: "Admin Update" },
      });
      expect(dbParticipation?.slug).toContain("admin-update");
      expect(dbParticipation?.slug).toBeTruthy();
    });
  });

  describe("DELETE /api/participations/:slug", () => {
    test("should return 204 if deleted successfully", async () => {
      await prisma.participation.create({
        data: {
          title: "To Delete",
          slug: "to-delete-long-slug-to-pass-validation-aaaaaaaaaaaaaaaaaa",
          video: "https://youtube.com/watch?v=del",
          userId,
          challengeId,
        },
      });

      const response = await request(app)
        .delete("/api/participations/to-delete-long-slug-to-pass-validation-aaaaaaaaaaaaaaaaaa")
        .set("Cookie", accessToken);

      expect(response.status).toBe(204);
      const dbParticipation = await prisma.participation.findFirst({
        where: { slug: "to-delete-long-slug-to-pass-validation-aaaaaaaaaaaaaaaaaa" },
      });
      expect(dbParticipation).toBeNull();

      const dbChallenge = await prisma.challenge.findUnique({ where: { id: challengeId } });
      expect(dbChallenge).not.toBeNull();
    });

    test("should return 403 if trying to delete someone else's participation", async () => {
      await prisma.participation.create({
        data: {
          title: "Other Participation",
          slug: "other-participation-long-slug-to-pass-validation-aaaaaaaa",
          video: "https://youtube.com/watch?v=other",
          userId: otherUserId,
          challengeId,
        },
      });

      const response = await request(app)
        .delete("/api/participations/other-participation-long-slug-to-pass-validation-aaaaaaaa")
        .set("Cookie", accessToken);

      expect(response.status).toBe(403);
    });

    test("should return 204 if admin deletes someone else's participation", async () => {
      await prisma.participation.create({
        data: {
          title: "Other Participation",
          slug: "other-participation-otheruser-long-slug-to-pass-validation",
          video: "https://youtube.com/watch?v=other",
          userId: otherUserId,
          challengeId,
        },
      });

      const response = await request(app)
        .delete("/api/participations/other-participation-otheruser-long-slug-to-pass-validation")
        .set("Cookie", adminAccessToken);

      expect(response.status).toBe(204);
      const dbParticipation = await prisma.participation.findFirst({
        where: { slug: "other-participation-otheruser-long-slug-to-pass-validation" },
      });
      expect(dbParticipation).toBeNull();
    });
  });

  describe("DELETE /api/participations/:slug/vote", () => {
    test("should return 204 if unliked successfully", async () => {
      const participation = await prisma.participation.create({
        data: {
          title: "To Unlike",
          slug: "to-unlike-long-slug-to-pass-validation-aaaaaaaaaaaaaaaaaa",
          video: "https://youtube.com/watch?v=unlike",
          userId: otherUserId,
          challengeId,
        },
      });

      await prisma.participationVote.create({
        data: {
          userId,
          participationId: participation.id,
        },
      });

      const response = await request(app)
        .delete(
          "/api/participations/to-unlike-long-slug-to-pass-validation-aaaaaaaaaaaaaaaaaa/vote"
        )
        .set("Cookie", accessToken);

      expect(response.status).toBe(204);

      const vote = await prisma.participationVote.findFirst({
        where: {
          userId,
          participation: { slug: "to-unlike-long-slug-to-pass-validation-aaaaaaaaaaaaaaaaaa" },
        },
      });
      expect(vote).toBeNull();
    });

    test("should return 401 if not authenticated", async () => {
      const response = await request(app).delete(
        "/api/participations/some-slug-long-enough-to-pass-validation-aaaaaaaaaaaaaa/vote"
      );
      expect(response.status).toBe(401);
    });
  });
});
