-- Replace MeasurementType enum: drop 'ms' and 'points', add 'distance_m', 'minutes', 'kg'.
-- Existing rows with removed values are converted: ms -> seconds, points -> kg.

CREATE TYPE "MeasurementType_new" AS ENUM ('seconds', 'distance_km', 'distance_m', 'minutes', 'kg');

ALTER TABLE "LeaderboardCategory" ALTER COLUMN "measurementType" TYPE text;

UPDATE "LeaderboardCategory" SET "measurementType" = 'seconds' WHERE "measurementType" = 'ms';
UPDATE "LeaderboardCategory" SET "measurementType" = 'kg' WHERE "measurementType" = 'points';

ALTER TABLE "LeaderboardCategory"
  ALTER COLUMN "measurementType" TYPE "MeasurementType_new"
  USING "measurementType"::"MeasurementType_new";

DROP TYPE "MeasurementType";
ALTER TYPE "MeasurementType_new" RENAME TO "MeasurementType";
