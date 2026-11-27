-- CreateTable
CREATE TABLE "VehicleModel" (
    "vehicleId" TEXT NOT NULL,
    "assetId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "VehicleModel_pkey" PRIMARY KEY ("vehicleId")
);

-- CreateIndex
CREATE INDEX "VehicleModel_assetId_idx" ON "VehicleModel"("assetId");

-- AddForeignKey
ALTER TABLE "VehicleModel" ADD CONSTRAINT "VehicleModel_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Same lockdown as 20261127000000_revoke_supabase_data_api: only the app (table owner) reads
-- it; default privileges already keep anon/authenticated grants off new tables
ALTER TABLE "VehicleModel" ENABLE ROW LEVEL SECURITY;
