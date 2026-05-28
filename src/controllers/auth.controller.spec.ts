import { describe, test, assert, afterEach, expect } from "vitest";
import request from "supertest";
import { prisma } from "../lib/prisma";
import { app } from "../app";

interface UserBody {
  username: string;
  email: string;
  password: string;
  confirm: string;
  bio: string;
  country: string;
  profilePicture: string;
}

interface User {
  id: number;
  username: string;
  email: string;
  password: string;
  confirm: string;
  bio: string;
  country: string;
  profilePicture: string;
}

describe("[POST] /auth/register", () => {
  // ARRANGE
  const USER: UserBody = {
    username: "carl",
    email: "carl@dungeoncrawl.com",
    password: "M0n ch@t s appelle D0nut",
    confirm: "M0n ch@t s appelle D0nut",
    bio: "Un type qui s'est retrouvé du jour au lendemain au coeur d'un donjon avec son chat...",
    country: "USA",
    profilePicture: "carl.png",
  };

  afterEach(async () => {
    // Nettoyage après chaque test
    await prisma.user.deleteMany({ where: { email: "carl@dungeoncrawl.com" } });
  });

  test("should register a new user in the database", async () => {
    // Act
    const response = await request(app).post("/api/auth/register").send(USER);

    // Assert (état de la BDD)
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
    assert.match(dbUser.password, /\$argon2id/); // on s'assure que le mot de passe est bien haché
  });

  test("should return the created user with the right properties", async () => {
    // Act
    const response = await request(app).post("/api/auth/register").send(USER);

    // Assert (état de la BDD)
    const retrievedUser: User = await response.body;

    expect(response.status).toBe(201);
    expect(retrievedUser).toHaveProperty("id");
    expect(retrievedUser.username).toBe(USER.username);
    expect(retrievedUser.email).toBe(USER.email);
    expect(retrievedUser.country).toBe(USER.country);
    expect(retrievedUser.profilePicture).toBe(USER.profilePicture);
    expect(retrievedUser.bio).toBe(USER.bio);
    assert.ok(retrievedUser.password === undefined);
  });

  test("should return 409 if email is already used", async () => {
    await prisma.user.create({
      data: {
        username: USER.username,
        email: USER.email,
        password: "alreadyhashed",
        bio: USER.bio,
        country: USER.country,
        profilePicture: USER.profilePicture,
      },
    });

    // ACT
    const response = await request(app).post("/api/auth/register").send(USER);

    // ASSERT
    expect(response.status).toBe(409);
  });

  test("should return 201 if optional properties are missing", async () => {
    // ARRANGE
    const MINIMAL_USER: Partial<UserBody> = {
      username: "princess_donut",
      email: "princessdonut@dungeoncrawl.com",
      password: "M0n l@qu@is s @ppelle C@rl",
      confirm: "M0n l@qu@is s @ppelle C@rl",
    };

    // ACT
    const response = await request(app).post("/api/auth/register").send(USER);

    // ASSERT
    expect(response.status).toBe(201);
  });

  test("should return 400 if password is too short", async () => {
    // ACT
    const response = await request(app)
      .post("/api/auth/register")
      .send({
        ...USER,
        password: "Short1!",
        confirm: "Short1!",
      });

    // ASSERT
    expect(response.status).toBe(400);
  });

  test("should return 400 if confirm does not match password", async () => {
    // ACT
    const response = await request(app)
      .post("/api/auth/register")
      .send({ ...USER, confirm: "DifferentPassword123!" });

    // ASSERT
    expect(response.status).toBe(400);
  });

  test("should return 400 if email is invalid", async () => {
    // ACT
    const response = await request(app)
      .post("/api/auth/register")
      .send({ ...USER, email: "not-an-email" });

    // ASSERT
    expect(response.status).toBe(400);
  });
});
