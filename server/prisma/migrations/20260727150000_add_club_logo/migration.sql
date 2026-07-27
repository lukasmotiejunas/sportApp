-- Optional club logo (base64 data URL). NULL = fall back to platform logo.

ALTER TABLE "Club"
  ADD COLUMN "logoUrl" TEXT;
