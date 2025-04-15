-- CreateTable
CREATE TABLE "DiscountBarSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "backgroundColor" TEXT NOT NULL DEFAULT '#FF5733',
    "textColor" TEXT NOT NULL DEFAULT '#FFFFFF',
    "emoji" TEXT NOT NULL DEFAULT '🔥',
    "timerDuration" INTEGER NOT NULL DEFAULT 30,
    "discountPercentage" INTEGER NOT NULL DEFAULT 15,
    "barText" TEXT NOT NULL DEFAULT 'Limited time offer! Use code {code} for {discount}% off your order!',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "DiscountCode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "discountPercentage" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "DiscountBarSettings_shopId_idx" ON "DiscountBarSettings"("shopId");

-- CreateIndex
CREATE INDEX "DiscountCode_shopId_idx" ON "DiscountCode"("shopId");

-- CreateIndex
CREATE INDEX "DiscountCode_code_idx" ON "DiscountCode"("code");
