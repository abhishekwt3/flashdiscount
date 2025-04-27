-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" TIMESTAMP(3),
    "accessToken" TEXT NOT NULL,
    "userId" BIGINT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "accountOwner" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT,
    "collaborator" BOOLEAN DEFAULT false,
    "emailVerified" BOOLEAN DEFAULT false,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscountBarSettings" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "backgroundColor" TEXT NOT NULL DEFAULT '#FF5733',
    "textColor" TEXT NOT NULL DEFAULT '#FFFFFF',
    "emoji" TEXT NOT NULL DEFAULT '🔥',
    "timerDuration" INTEGER NOT NULL DEFAULT 15,
    "discountPercentage" INTEGER NOT NULL DEFAULT 15,
    "barText" TEXT NOT NULL DEFAULT 'Limited time offer! {discount}% off your entire order automatically applied!',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscountBarSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscountCode" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "discountPercentage" INTEGER NOT NULL,
    "isAutomatic" BOOLEAN NOT NULL DEFAULT true,
    "discountId" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiscountCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DiscountBarSettings_shopId_idx" ON "DiscountBarSettings"("shopId");

-- CreateIndex
CREATE INDEX "DiscountCode_shopId_idx" ON "DiscountCode"("shopId");

-- CreateIndex
CREATE INDEX "DiscountCode_code_idx" ON "DiscountCode"("code");
