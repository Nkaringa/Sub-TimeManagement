-- CreateTable
CREATE TABLE "RegisteredDevice" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "registeredBy" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegisteredDevice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RegisteredDevice_token_key" ON "RegisteredDevice"("token");

-- CreateIndex
CREATE INDEX "RegisteredDevice_storeId_idx" ON "RegisteredDevice"("storeId");

-- AddForeignKey
ALTER TABLE "RegisteredDevice" ADD CONSTRAINT "RegisteredDevice_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
