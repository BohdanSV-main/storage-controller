-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'WORKER');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'ISSUED');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" SERIAL NOT NULL,
    "articleCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "desc" TEXT NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stock" (
    "productId" INTEGER NOT NULL,
    "onHand" INTEGER NOT NULL DEFAULT 0,
    "reserved" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Stock_pkey" PRIMARY KEY ("productId")
);

-- CreateTable
CREATE TABLE "Reservation" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" "ReservationStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMPTZ(3),
    "issuedById" INTEGER,

    CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReservationIdempotencyKey" (
    "userId" INTEGER NOT NULL,
    "key" VARCHAR(128) NOT NULL,
    "productId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reservationId" INTEGER NOT NULL,

    CONSTRAINT "ReservationIdempotencyKey_pkey" PRIMARY KEY ("userId","key")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Product_articleCode_key" ON "Product"("articleCode");

-- CreateIndex
CREATE INDEX "Reservation_userId_createdAt_id_idx" ON "Reservation"("userId", "createdAt" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "Reservation_status_createdAt_id_idx" ON "Reservation"("status", "createdAt" DESC, "id" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "ReservationIdempotencyKey_reservationId_key" ON "ReservationIdempotencyKey"("reservationId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- AddForeignKey
ALTER TABLE "Stock" ADD CONSTRAINT "Stock_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReservationIdempotencyKey" ADD CONSTRAINT "ReservationIdempotencyKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReservationIdempotencyKey" ADD CONSTRAINT "ReservationIdempotencyKey_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReservationIdempotencyKey" ADD CONSTRAINT "ReservationIdempotencyKey_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- Stock must remain consistent
ALTER TABLE "Stock"
ADD CONSTRAINT "Stock_quantities_check"
CHECK (
    "onHand" >= 0
    AND "reserved" >= 0
    AND "reserved" <= "onHand"
);

-- Reservation quantity must be positive
ALTER TABLE "Reservation"
ADD CONSTRAINT "Reservation_quantity_check"
CHECK ("quantity" > 0);

-- Reservation status must match its closing data
ALTER TABLE "Reservation"
ADD CONSTRAINT "Reservation_status_fields_check"
CHECK (
    (
        "status" = 'ACTIVE'
        AND "closedAt" IS NULL
        AND "issuedById" IS NULL
    )
    OR
    (
        "status" = 'CANCELLED'
        AND "closedAt" IS NOT NULL
        AND "issuedById" IS NULL
    )
    OR
    (
        "status" = 'ISSUED'
        AND "closedAt" IS NOT NULL
        AND "issuedById" IS NOT NULL
    )
);

-- Stored request quantity must be positive
ALTER TABLE "ReservationIdempotencyKey"
ADD CONSTRAINT "ReservationIdempotencyKey_quantity_check"
CHECK ("quantity" > 0);