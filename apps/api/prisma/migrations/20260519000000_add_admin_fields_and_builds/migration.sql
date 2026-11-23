-- AlterTable: add password and isAdmin columns to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "password" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isAdmin" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable: VehicleBuild
CREATE TABLE IF NOT EXISTS "VehicleBuild" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "configJson" JSONB NOT NULL,
    "thumbnail" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VehicleBuild_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "VehicleBuild_userId_idx" ON "VehicleBuild"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "VehicleBuild_isPublic_idx" ON "VehicleBuild"("isPublic");

-- AddForeignKey
ALTER TABLE "VehicleBuild" ADD CONSTRAINT "VehicleBuild_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
