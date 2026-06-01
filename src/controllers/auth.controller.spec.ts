import { describe, test, assert, afterEach, beforeEach, expect } from "vitest";
import request from "supertest";
import argon2 from "argon2";
import { prisma } from "../lib/prisma";
import { app } from "../app";

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const VALID_PASSWORD = "M0n ch@t s appelle D0nut";

interface UserBody {
  username: string;
  email: string;
  password: string;
  confirm: string;
  bio: string;
  country: string;
  profilePicture: string;
}

// ---------------------------------------------------------------------------
// [POST] /auth/register
// ---------------------------------------------------------------------------

describe("[POST] /auth/register", () => {
  const USER: UserBody = {
    username: "carl",
    email: "carl@dungeoncrawl.com",
    password: VALID_PASSWORD,
    confirm: VALID_PASSWORD,
    bio: "Un type qui s'est retrouvé du jour au lendemain au coeur d'un donjon avec son chat...",
    country: "USA",
    profilePicture: "carl.png",
  };

  afterEach(async () => {
    await prisma.user.deleteMany({
      where: {
        email: {
          in: ["carl@dungeoncrawl.com", "princessdonut@dungeoncrawl.com", "other@dungeoncrawl.com"],
        },
      },
    });
  });

  test("should register a new user in the database", async () => {
    const response = await request(app).post("/api/auth/register").send(USER);

    const dbUser = await prisma.user.findFirstOrThrow({
      where: { email: USER.email },
    });

    expect(response.status).toBe(201);
    expect(dbUser).toHaveProperty("id");
    expect(dbUser.username).toBe(USER.username);
    expect(dbUser.email).toBe(USER.email);
    expect(dbUser.country).toBe(USER.country);
    expect(dbUser.profilePicture).toBe(USER.profilePicture);
    expect(dbUser.bio).toBe(USER.bio);
    assert.match(dbUser.password, /\$argon2id/);
  });

  test("should return a success message on register", async () => {
    const response = await request(app).post("/api/auth/register").send(USER);

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty("message");
  });

  test("should return 409 if email is already used", async () => {
    await prisma.user.create({
      data: {
        username: "other_carl",
        email: USER.email,
        password: "alreadyhashed",
      },
    });

    const response = await request(app).post("/api/auth/register").send(USER);

    expect(response.status).toBe(409);
  });

  test("should return 409 if username is already used", async () => {
    await prisma.user.create({
      data: {
        username: USER.username,
        email: "other@dungeoncrawl.com",
        password: "alreadyhashed",
      },
    });

    const response = await request(app).post("/api/auth/register").send(USER);

    expect(response.status).toBe(409);
  });

  test("should return 201 if optional fields are missing", async () => {
    const MINIMAL_USER = {
      username: "princess_donut",
      email: "princessdonut@dungeoncrawl.com",
      password: "M0n l@qu@is s @ppelle C@rl",
      confirm: "M0n l@qu@is s @ppelle C@rl",
    };

    const response = await request(app).post("/api/auth/register").send(MINIMAL_USER);

    expect(response.status).toBe(201);
  });

  test("should return 400 if username is missing", async () => {
    const { username: _omitted, ...body } = USER;
    const response = await request(app).post("/api/auth/register").send(body);

    expect(response.status).toBe(400);
  });

  test("should return 400 if username is too short (< 2 chars)", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({ ...USER, username: "x" });

    expect(response.status).toBe(400);
  });

  test("should return 400 if email is missing", async () => {
    const { email: _omitted, ...body } = USER;
    const response = await request(app).post("/api/auth/register").send(body);

    expect(response.status).toBe(400);
  });

  test("should return 400 if email is invalid", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({ ...USER, email: "not-an-email" });

    expect(response.status).toBe(400);
  });

  test("should return 400 if password is too short (< 12 chars)", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({ ...USER, password: "Short1!", confirm: "Short1!" });

    expect(response.status).toBe(400);
  });

  test("should return 400 if password is too long (> 100 chars)", async () => {
    const longPassword = "Ab1" + "x".repeat(99);
    const response = await request(app)
      .post("/api/auth/register")
      .send({ ...USER, password: longPassword, confirm: longPassword });

    expect(response.status).toBe(400);
  });

  test("should return 400 if password has no uppercase letter", async () => {
    const password = "m0n ch@t s appelle d0nut";
    const response = await request(app)
      .post("/api/auth/register")
      .send({ ...USER, password, confirm: password });

    expect(response.status).toBe(400);
  });

  test("should return 400 if password has no lowercase letter", async () => {
    const password = "M0N CH@T S APPELLE D0NUT";
    const response = await request(app)
      .post("/api/auth/register")
      .send({ ...USER, password, confirm: password });

    expect(response.status).toBe(400);
  });

  test("should return 400 if password has no digit", async () => {
    const password = "Mon ch@t s appelle Donut";
    const response = await request(app)
      .post("/api/auth/register")
      .send({ ...USER, password, confirm: password });

    expect(response.status).toBe(400);
  });

  test("should return 400 if confirm does not match password", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({ ...USER, confirm: "DifferentPassword123!" });

    expect(response.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// [POST] /auth/login
// ---------------------------------------------------------------------------

describe("[POST] /auth/login", () => {
  const USER_EMAIL = "carl@dungeoncrawl.com";

  beforeEach(async () => {
    await prisma.user.create({
      data: {
        username: "carl",
        email: USER_EMAIL,
        password: await argon2.hash(VALID_PASSWORD),
      },
    });
  });

  afterEach(async () => {
    await prisma.user.deleteMany({ where: { email: USER_EMAIL } });
  });

  test("should return 200 with accessToken and refreshToken in body", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: USER_EMAIL, password: VALID_PASSWORD });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("accessToken");
    expect(response.body).toHaveProperty("refreshToken");
  });

  test("should set accessToken and refreshToken cookies", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: USER_EMAIL, password: VALID_PASSWORD });

    const rawCookies = response.headers["set-cookie"];
    const cookies: string[] = Array.isArray(rawCookies)
      ? rawCookies
      : rawCookies
        ? [rawCookies]
        : [];
    const cookieNames = cookies.map((c: string) => c.split("=")[0]);

    expect(cookieNames).toContain("accessToken");
    expect(cookieNames).toContain("refreshToken");
  });

  test("should store the refresh token in the database", async () => {
    const user = await prisma.user.findFirstOrThrow({
      where: { email: USER_EMAIL },
    });

    await request(app)
      .post("/api/auth/login")
      .send({ email: USER_EMAIL, password: VALID_PASSWORD });

    const dbToken = await prisma.refreshToken.findFirst({
      where: { userId: user.id },
    });

    expect(dbToken).not.toBeNull();
  });

  test("should return 401 if email does not exist", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "unknown@dungeoncrawl.com", password: VALID_PASSWORD });

    expect(response.status).toBe(401);
  });

  test("should return 401 if password does not match", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: USER_EMAIL, password: "Wr0ng p@ssword here" });

    expect(response.status).toBe(401);
  });

  test("should return 400 if email is missing", async () => {
    const response = await request(app).post("/api/auth/login").send({ password: VALID_PASSWORD });

    expect(response.status).toBe(400);
  });

  test("should return 400 if password is missing", async () => {
    const response = await request(app).post("/api/auth/login").send({ email: USER_EMAIL });

    expect(response.status).toBe(400);
  });

  test("should return 400 if email format is invalid", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "not-an-email", password: VALID_PASSWORD });

    expect(response.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// [POST] /auth/refresh
// ---------------------------------------------------------------------------

describe("[POST] /auth/refresh", () => {
  const USER_EMAIL = "carl@dungeoncrawl.com";

  beforeEach(async () => {
    await prisma.user.create({
      data: {
        username: "carl",
        email: USER_EMAIL,
        password: await argon2.hash(VALID_PASSWORD),
      },
    });
  });

  afterEach(async () => {
    await prisma.user.deleteMany({ where: { email: USER_EMAIL } });
  });

  /** Helper: login and return the refreshToken cookie string */
  async function loginAndGetRefreshCookie(): Promise<string> {
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: USER_EMAIL, password: VALID_PASSWORD });

    const rawCookies = loginRes.headers["set-cookie"];
    const cookies: string[] = Array.isArray(rawCookies)
      ? rawCookies
      : rawCookies
        ? [rawCookies]
        : [];
    const refreshCookie = cookies.find((c: string) => c.startsWith("refreshToken="));
    if (!refreshCookie) throw new Error("refreshToken cookie not found");
    return refreshCookie;
  }

  test("should return 200 with new accessToken and refreshToken in body", async () => {
    const refreshCookie = await loginAndGetRefreshCookie();

    const response = await request(app).post("/api/auth/refresh").set("Cookie", refreshCookie);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("accessToken");
    expect(response.body).toHaveProperty("refreshToken");
  });

  test("should set new accessToken and refreshToken cookies", async () => {
    const refreshCookie = await loginAndGetRefreshCookie();

    const response = await request(app).post("/api/auth/refresh").set("Cookie", refreshCookie);

    const rawCookies = response.headers["set-cookie"];
    const cookies: string[] = Array.isArray(rawCookies)
      ? rawCookies
      : rawCookies
        ? [rawCookies]
        : [];
    const cookieNames = cookies.map((c: string) => c.split("=")[0]);

    expect(cookieNames).toContain("accessToken");
    expect(cookieNames).toContain("refreshToken");
  });

  test("should rotate the refresh token in the database", async () => {
    const user = await prisma.user.findFirstOrThrow({
      where: { email: USER_EMAIL },
    });
    const refreshCookie = await loginAndGetRefreshCookie();

    const tokenBefore = await prisma.refreshToken.findFirst({
      where: { userId: user.id },
    });

    await request(app).post("/api/auth/refresh").set("Cookie", refreshCookie);

    const tokenAfter = await prisma.refreshToken.findFirst({
      where: { userId: user.id },
    });

    expect(tokenBefore).not.toBeNull();
    expect(tokenAfter).not.toBeNull();
    expect(tokenAfter?.token).not.toBe(tokenBefore?.token);
  });

  test("should return 401 if no refresh token cookie is provided", async () => {
    const response = await request(app).post("/api/auth/refresh");

    expect(response.status).toBe(401);
  });

  test("should return 401 if refresh token does not exist in the database", async () => {
    const response = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", "refreshToken=invalidtoken000");

    expect(response.status).toBe(401);
  });

  test("should return 401 and delete the token if it is expired", async () => {
    const user = await prisma.user.findFirstOrThrow({
      where: { email: USER_EMAIL },
    });

    const expiredToken = await prisma.refreshToken.create({
      data: {
        token: "expiredtoken123",
        userId: user.id,
        issuedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
        expiresAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      },
    });

    const response = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", `refreshToken=${expiredToken.token}`);

    const deletedToken = await prisma.refreshToken.findFirst({
      where: { id: expiredToken.id },
    });

    expect(response.status).toBe(401);
    expect(deletedToken).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// [POST] /auth/resetPassword
// ---------------------------------------------------------------------------

describe("[POST] /auth/resetPassword", () => {
  const USER_EMAIL = "reset@dungeoncrawl.com";
  const NEW_PASSWORD = "NouveauM0tDeP@sse123!";

  beforeEach(async () => {
    await prisma.user.create({
      data: {
        username: "reset_user",
        email: USER_EMAIL,
        password: await argon2.hash(VALID_PASSWORD),
      },
    });
  });

  afterEach(async () => {
    await prisma.user.deleteMany({ where: { email: USER_EMAIL } });
  });

  /** Helper: login and return the accessToken cookie string */
  async function loginAndGetAccessCookie(): Promise<string> {
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: USER_EMAIL, password: VALID_PASSWORD });

    const rawCookies = loginRes.headers["set-cookie"];
    const cookies: string[] = Array.isArray(rawCookies)
      ? rawCookies
      : rawCookies
        ? [rawCookies]
        : [];
    const accessCookie = cookies.find((c: string) =>
      c.startsWith("accessToken="),
    );
    if (!accessCookie) throw new Error("accessToken cookie not found");
    return accessCookie;
  }

  test("should return 200 and update password if current password is correct", async () => {
    const accessCookie = await loginAndGetAccessCookie();

    const response = await request(app)
      .post("/api/auth/resetPassword")
      .set("Cookie", accessCookie)
      .send({
        currentPassword: VALID_PASSWORD,
        newPassword: NEW_PASSWORD,
        confirm: NEW_PASSWORD,
      });

    const user = await prisma.user.findFirstOrThrow({
      where: { email: USER_EMAIL },
    });
    const isMatching = await argon2.verify(user.password, NEW_PASSWORD);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Password successfully updated.");
    expect(isMatching).toBe(true);
  });

  test("should return 401 if current password is incorrect", async () => {
    const accessCookie = await loginAndGetAccessCookie();

    const response = await request(app)
      .post("/api/auth/resetPassword")
      .set("Cookie", accessCookie)
      .send({
        currentPassword: "WrongPassword123!",
        newPassword: NEW_PASSWORD,
        confirm: NEW_PASSWORD,
      });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("The current password is not matching.");
  });

  test("should return 400 if new password does not meet complexity requirements", async () => {
    const accessCookie = await loginAndGetAccessCookie();

    const response = await request(app)
      .post("/api/auth/resetPassword")
      .set("Cookie", accessCookie)
      .send({
        currentPassword: VALID_PASSWORD,
        newPassword: "short",
        confirm: "short",
      });

    expect(response.status).toBe(400);
  });

  test("should return 400 if confirm does not match new password", async () => {
    const accessCookie = await loginAndGetAccessCookie();

    const response = await request(app)
      .post("/api/auth/resetPassword")
      .set("Cookie", accessCookie)
      .send({
        currentPassword: VALID_PASSWORD,
        newPassword: NEW_PASSWORD,
        confirm: "DifferentPassword123!",
      });

    expect(response.status).toBe(400);
  });

  test("should return 401 if not authenticated", async () => {
    const response = await request(app).post("/api/auth/resetPassword").send({
      currentPassword: VALID_PASSWORD,
      newPassword: NEW_PASSWORD,
      confirm: NEW_PASSWORD,
    });

    expect(response.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// [POST] /auth/logout
// ---------------------------------------------------------------------------

describe("[POST] /auth/logout", () => {
  const USER_EMAIL = "carl@dungeoncrawl.com";

  beforeEach(async () => {
    await prisma.user.create({
      data: {
        username: "carl",
        email: USER_EMAIL,
        password: await argon2.hash(VALID_PASSWORD),
      },
    });
  });

  afterEach(async () => {
    await prisma.user.deleteMany({ where: { email: USER_EMAIL } });
  });

  /** Helper: login and return the accessToken cookie string */
  async function loginAndGetAccessCookie(): Promise<string> {
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: USER_EMAIL, password: VALID_PASSWORD });

    const rawCookies = loginRes.headers["set-cookie"];
    const cookies: string[] = Array.isArray(rawCookies)
      ? rawCookies
      : rawCookies
        ? [rawCookies]
        : [];
    const accessCookie = cookies.find((c: string) => c.startsWith("accessToken="));
    if (!accessCookie) throw new Error("accessToken cookie not found");
    return accessCookie;
  }

  test("should return 204", async () => {
    const accessCookie = await loginAndGetAccessCookie();

    const response = await request(app).post("/api/auth/logout").set("Cookie", accessCookie);

    expect(response.status).toBe(204);
  });

  test("should delete the refresh token from the database", async () => {
    const user = await prisma.user.findFirstOrThrow({
      where: { email: USER_EMAIL },
    });
    const accessCookie = await loginAndGetAccessCookie();

    const tokenBefore = await prisma.refreshToken.findFirst({
      where: { userId: user.id },
    });

    await request(app).post("/api/auth/logout").set("Cookie", accessCookie);

    const tokenAfter = await prisma.refreshToken.findFirst({
      where: { userId: user.id },
    });

    expect(tokenBefore).not.toBeNull();
    expect(tokenAfter).toBeNull();
  });

  test("should clear the accessToken and refreshToken cookies", async () => {
    const accessCookie = await loginAndGetAccessCookie();

    const response = await request(app).post("/api/auth/logout").set("Cookie", accessCookie);

    const rawCookies = response.headers["set-cookie"];
    const cookies: string[] = Array.isArray(rawCookies)
      ? rawCookies
      : rawCookies
        ? [rawCookies]
        : [];

    const accessCleared = cookies.some(
      (c) =>
        c.startsWith("accessToken=") && c.includes("Expires=Thu, 01 Jan 1970"),
    );
    const refreshCleared = cookies.some(
      (c) =>
        c.startsWith("refreshToken=") && c.includes("Expires=Thu, 01 Jan 1970"),
    );

    expect(accessCleared).toBe(true);
    expect(refreshCleared).toBe(true);
  });

  test("should return 401 if no access token is provided", async () => {
    const response = await request(app).post("/api/auth/logout");

    expect(response.status).toBe(401);
  });

  test("should return 401 if access token is invalid", async () => {
    const response = await request(app)
      .post("/api/auth/logout")
      .set("Cookie", "accessToken=invalidtoken000");

    expect(response.status).toBe(401);
  });
});
