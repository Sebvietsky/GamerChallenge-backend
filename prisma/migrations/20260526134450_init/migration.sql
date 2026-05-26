-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('user', 'moderator', 'admin');

-- CreateEnum
CREATE TYPE "user_status" AS ENUM ('active', 'banned', 'inactive');

-- CreateEnum
CREATE TYPE "challenge_status" AS ENUM ('draft', 'active', 'closed', 'rejected');

-- CreateEnum
CREATE TYPE "participation_status" AS ENUM ('pending', 'approved', 'rejected');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "country" VARCHAR(50),
    "bio" TEXT,
    "profile_picture" VARCHAR(255),
    "role" "user_role" NOT NULL DEFAULT 'user',
    "visibility" BOOLEAN NOT NULL DEFAULT true,
    "status" "user_status" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "games" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "studio" VARCHAR(150),
    "platform" VARCHAR(100),
    "cover_url" VARCHAR(255),
    "visibility" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "games_categories" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "games_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "games_has_games_categories" (
    "game_id" INTEGER NOT NULL,
    "game_category_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "games_has_games_categories_pkey" PRIMARY KEY ("game_id","game_category_id")
);

-- CreateTable
CREATE TABLE "challenges_categories" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "color_code" VARCHAR(7),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "challenges_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "difficulty" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "color_code" VARCHAR(7),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "difficulty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenges" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "slug" VARCHAR(250) NOT NULL,
    "description" TEXT NOT NULL,
    "hints" TEXT,
    "demo" VARCHAR(255),
    "goals" TEXT,
    "closes_at" TIMESTAMPTZ,
    "status" "challenge_status" NOT NULL DEFAULT 'active',
    "rejected_reason" TEXT,
    "visibility" BOOLEAN NOT NULL DEFAULT true,
    "game_id" INTEGER NOT NULL,
    "challenge_category_id" INTEGER NOT NULL,
    "difficulty_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "participations" (
    "id" SERIAL NOT NULL,
    "video" VARCHAR(255) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "slug" VARCHAR(250),
    "description" TEXT,
    "status" "participation_status" NOT NULL DEFAULT 'pending',
    "rejected_reason" TEXT,
    "visibility" BOOLEAN NOT NULL DEFAULT true,
    "challenge_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "participations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_has_favorite_challenge" (
    "user_id" INTEGER NOT NULL,
    "challenge_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_has_favorite_challenge_pkey" PRIMARY KEY ("user_id","challenge_id")
);

-- CreateTable
CREATE TABLE "challenge_has_vote" (
    "user_id" INTEGER NOT NULL,
    "challenge_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "challenge_has_vote_pkey" PRIMARY KEY ("user_id","challenge_id")
);

-- CreateTable
CREATE TABLE "participation_has_vote" (
    "user_id" INTEGER NOT NULL,
    "participation_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "participation_has_vote_pkey" PRIMARY KEY ("user_id","participation_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "games_categories_name_key" ON "games_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "challenges_categories_name_key" ON "challenges_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "difficulty_name_key" ON "difficulty"("name");

-- CreateIndex
CREATE UNIQUE INDEX "challenges_slug_key" ON "challenges"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "participations_slug_key" ON "participations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "participations_challenge_id_user_id_key" ON "participations"("challenge_id", "user_id");

-- AddForeignKey
ALTER TABLE "games_has_games_categories" ADD CONSTRAINT "games_has_games_categories_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "games_has_games_categories" ADD CONSTRAINT "games_has_games_categories_game_category_id_fkey" FOREIGN KEY ("game_category_id") REFERENCES "games_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_challenge_category_id_fkey" FOREIGN KEY ("challenge_category_id") REFERENCES "challenges_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_difficulty_id_fkey" FOREIGN KEY ("difficulty_id") REFERENCES "difficulty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participations" ADD CONSTRAINT "participations_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participations" ADD CONSTRAINT "participations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_has_favorite_challenge" ADD CONSTRAINT "user_has_favorite_challenge_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_has_favorite_challenge" ADD CONSTRAINT "user_has_favorite_challenge_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_has_vote" ADD CONSTRAINT "challenge_has_vote_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_has_vote" ADD CONSTRAINT "challenge_has_vote_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participation_has_vote" ADD CONSTRAINT "participation_has_vote_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participation_has_vote" ADD CONSTRAINT "participation_has_vote_participation_id_fkey" FOREIGN KEY ("participation_id") REFERENCES "participations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
