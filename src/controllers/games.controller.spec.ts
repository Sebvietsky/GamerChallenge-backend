import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import request from "supertest";
import { prisma } from "../lib/prisma";
import { app } from "../app";
import type { IGDBGame } from "../lib/interface";

vi.mock("../utils/igdb.utils", () => ({
  queryIGDB: vi.fn(),
  buildCoverUrl: (url: string, size = "cover_big") =>
    `https:${url.replace("t_thumb", `t_${size}`)}`,
  buildImageUrl: (url: string, size = "t_1080p") => `https:${url.replace("t_thumb", size)}`,
}));

import { queryIGDB } from "../utils/igdb.utils";
const mockQueryIGDB = vi.mocked(queryIGDB);

const GAME_A = { igdbId: 99001, name: "Test Game A", studio: "Studio A", platform: "PC" };
const GAME_B = { igdbId: 99002, name: "Test Game B", studio: "Studio B", platform: "Switch" };

const IGDB_RESULTS: IGDBGame[] = [
  {
    id: 119133,
    name: "Elden Ring",
    summary: "An open world action RPG.",
    cover: { url: "//images.igdb.com/igdb/image/upload/t_thumb/co4jni.jpg" },
    platforms: [{ name: "PC" }, { name: "PlayStation 5" }],
    involved_companies: [{ developer: true, company: { name: "FromSoftware" } }],
  },
  {
    id: 11133,
    name: "Dark Souls III",
    cover: { url: "//images.igdb.com/igdb/image/upload/t_thumb/co1wcx.jpg" },
    platforms: [{ name: "PC" }],
    involved_companies: [{ developer: true, company: { name: "FromSoftware" } }],
  },
];

describe("[GET] /games", () => {
  beforeEach(async () => {
    await prisma.game.createMany({ data: [GAME_A, GAME_B] });
  });

  afterEach(async () => {
    await prisma.game.deleteMany({ where: { igdbId: { in: [GAME_A.igdbId, GAME_B.igdbId] } } });
  });

  test("should return 200 with a paginated list of games", async () => {
    const response = await request(app).get("/api/games");

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("data");
    expect(response.body).toHaveProperty("total");
    expect(response.body).toHaveProperty("page");
    expect(response.body).toHaveProperty("limit");
    expect(response.body).toHaveProperty("totalPages");
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  test("should include the seeded test games in the response", async () => {
    const response = await request(app).get("/api/games");

    const names = response.body.data.map((g: { name: string }) => g.name);
    expect(names).toContain(GAME_A.name);
    expect(names).toContain(GAME_B.name);
  });

  test("should respect the limit query param", async () => {
    const response = await request(app).get("/api/games?limit=1");

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.limit).toBe(1);
  });

  test("should return correct totalPages", async () => {
    const response = await request(app).get("/api/games?limit=1");

    expect(response.body.totalPages).toBe(response.body.total);
  });

  test("should return 400 if limit is 0", async () => {
    const response = await request(app).get("/api/games?limit=0");

    expect(response.status).toBe(400);
  });

  test("should return 400 if page is negative", async () => {
    const response = await request(app).get("/api/games?page=-1");

    expect(response.status).toBe(400);
  });

  test("should expose igdbId in the response", async () => {
    const response = await request(app).get("/api/games");

    const gameA = response.body.data.find((g: { igdbId: number }) => g.igdbId === GAME_A.igdbId);
    expect(gameA).toBeDefined();
    expect(gameA.igdbId).toBe(GAME_A.igdbId);
  });

  test("should not return games with visibility: false", async () => {
    await prisma.game.create({ data: { igdbId: 99003, name: "Hidden Game", visibility: false } });

    const response = await request(app).get("/api/games");

    const names = response.body.data.map((g: { name: string }) => g.name);
    expect(names).not.toContain("Hidden Game");

    await prisma.game.deleteMany({ where: { igdbId: 99003 } });
  });
});

describe("[GET] /games/search", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  test("should return 200 with results from IGDB", async () => {
    mockQueryIGDB.mockResolvedValue(IGDB_RESULTS);

    const response = await request(app).get("/api/games/search?q=Souls");

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data).toHaveLength(IGDB_RESULTS.length);
  });

  test("should shape each result with igdbId, name, studio, platform, coverUrl", async () => {
    mockQueryIGDB.mockResolvedValue(IGDB_RESULTS);

    const response = await request(app).get("/api/games/search?q=Elden Ring");
    const first = response.body.data[0];

    expect(first).toHaveProperty("igdbId", 119133);
    expect(first).toHaveProperty("name", "Elden Ring");
    expect(first).toHaveProperty("studio", "FromSoftware");
    expect(first).toHaveProperty("platform", "PC, PlayStation 5");
    expect(first.coverUrl).toMatch(
      /^https:\/\/images.igdb.com\/igdb\/image\/upload\/t_cover_big\/.*\.jpg$/
    );
  });

  test("should set studio to null if no developer company", async () => {
    mockQueryIGDB.mockResolvedValue([{ id: 1, name: "Unknown Game" }]);

    const response = await request(app).get("/api/games/search?q=Unknown");
    const first = response.body.data[0];

    expect(first.studio).toBeNull();
    expect(first.platform).toBeNull();
    expect(first.coverUrl).toBeNull();
  });

  test("should include bannerUrl from artworks when available", async () => {
    mockQueryIGDB.mockResolvedValue([
      {
        id: 2,
        name: "Banner Game",
        artworks: [{ url: "//images.igdb.com/igdb/image/upload/t_thumb/art001.jpg" }],
      },
    ]);

    const response = await request(app).get("/api/games/search?q=Banner");
    const first = response.body.data[0];

    expect(first.bannerUrl).not.toBeNull();
    expect(first.bannerUrl).toMatch(
      /^https:\/\/images.igdb.com\/igdb\/image\/upload\/t_screenshot_huge\/.*\.jpg$/
    );
  });

  test("should fallback bannerUrl to screenshot if no artwork", async () => {
    mockQueryIGDB.mockResolvedValue([
      {
        id: 3,
        name: "Screenshot Game",
        screenshots: [{ url: "//images.igdb.com/igdb/image/upload/t_thumb/sc001.jpg" }],
      },
    ]);

    const response = await request(app).get("/api/games/search?q=Screenshot");
    const first = response.body.data[0];

    expect(first.bannerUrl).not.toBeNull();
  });

  test("should set bannerUrl to null if no artwork or screenshot", async () => {
    mockQueryIGDB.mockResolvedValue([{ id: 4, name: "No Banner Game" }]);

    const response = await request(app).get("/api/games/search?q=NoBanner");
    const first = response.body.data[0];

    expect(first.bannerUrl).toBeNull();
  });

  test("should return 400 if q is missing", async () => {
    const response = await request(app).get("/api/games/search");

    expect(response.status).toBe(400);
  });

  test("should return 400 if q is empty", async () => {
    const response = await request(app).get("/api/games/search?q=");

    expect(response.status).toBe(400);
  });

  test("should return 400 if limit exceeds 50", async () => {
    const response = await request(app).get("/api/games/search?q=test&limit=51");

    expect(response.status).toBe(400);
  });

  test("should default to limit 10 if not specified", async () => {
    mockQueryIGDB.mockResolvedValue(IGDB_RESULTS);

    await request(app).get("/api/games/search?q=test");

    const callBody = mockQueryIGDB.mock.calls[0]?.[1] ?? "";
    expect(callBody).toContain("limit 10");
  });
});

describe("[GET] /games/:igdbId", () => {
  beforeEach(async () => {
    await prisma.game.create({ data: GAME_A });
  });

  afterEach(async () => {
    await prisma.game.deleteMany({ where: { igdbId: GAME_A.igdbId } });
  });

  test("should return 200 with the game and its challenges", async () => {
    const response = await request(app).get(`/api/games/${GAME_A.igdbId}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveProperty("name", GAME_A.name);
    expect(response.body.data).toHaveProperty("igdbId", GAME_A.igdbId);
    expect(Array.isArray(response.body.data.challenges)).toBe(true);
  });

  test("should return an empty challenges array if no challenges exist", async () => {
    const response = await request(app).get(`/api/games/${GAME_A.igdbId}`);

    expect(response.body.data.challenges).toHaveLength(0);
  });

  test("should return 404 if the game does not exist in DB", async () => {
    const response = await request(app).get("/api/games/99999");

    expect(response.status).toBe(404);
  });

  test("should expose igdbId, name, studio, platform, coverUrl", async () => {
    const response = await request(app).get(`/api/games/${GAME_A.igdbId}`);
    const game = response.body.data;

    expect(game.igdbId).toBe(GAME_A.igdbId);
    expect(game.name).toBe(GAME_A.name);
    expect(game.studio).toBe(GAME_A.studio);
    expect(game.platform).toBe(GAME_A.platform);
  });
});
