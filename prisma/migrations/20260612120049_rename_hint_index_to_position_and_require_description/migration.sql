-- Renommage de la colonne (préserve les 89 lignes existantes)
ALTER TABLE "hints" RENAME COLUMN "index" TO "position";

-- L'index unique garde son ancien nom après le RENAME COLUMN : on l'aligne sur
-- le nom attendu par Prisma (hints_challenge_id_position_key) pour éviter une dérive.
ALTER INDEX "hints_challenge_id_index_key" RENAME TO "hints_challenge_id_position_key";

-- description devient obligatoire. Sûr ici car toutes les lignes ont déjà une valeur ;
-- en présence de NULL il aurait fallu un backfill (UPDATE ... WHERE description IS NULL) avant.
ALTER TABLE "hints" ALTER COLUMN "description" SET NOT NULL;
