-- CreateTable
CREATE TABLE "PaymentLog" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "employeeName" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "hoursWorked" DOUBLE PRECISION NOT NULL,
    "hourlyRate" DOUBLE PRECISION NOT NULL,
    "totalPaid" DOUBLE PRECISION NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidByManager" TEXT NOT NULL,

    CONSTRAINT "PaymentLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PaymentLog_storeId_paidAt_idx" ON "PaymentLog"("storeId", "paidAt");

-- CreateIndex
CREATE INDEX "PaymentLog_userId_paidAt_idx" ON "PaymentLog"("userId", "paidAt");
