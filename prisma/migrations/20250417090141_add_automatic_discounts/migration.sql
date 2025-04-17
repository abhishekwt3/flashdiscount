-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DiscountBarSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "backgroundColor" TEXT NOT NULL DEFAULT '#FF5733',
    "textColor" TEXT NOT NULL DEFAULT '#FFFFFF',
    "emoji" TEXT NOT NULL DEFAULT '🔥',
    "timerDuration" INTEGER NOT NULL DEFAULT 15,
    "discountPercentage" INTEGER NOT NULL DEFAULT 15,
    "barText" TEXT NOT NULL DEFAULT 'Limited time offer! {discount}% off your entire order automatically applied!',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_DiscountBarSettings" ("backgroundColor", "barText", "createdAt", "discountPercentage", "emoji", "id", "isActive", "shopId", "textColor", "timerDuration", "updatedAt") SELECT "backgroundColor", "barText", "createdAt", "discountPercentage", "emoji", "id", "isActive", "shopId", "textColor", "timerDuration", "updatedAt" FROM "DiscountBarSettings";
DROP TABLE "DiscountBarSettings";
ALTER TABLE "new_DiscountBarSettings" RENAME TO "DiscountBarSettings";
CREATE INDEX "DiscountBarSettings_shopId_idx" ON "DiscountBarSettings"("shopId");
CREATE TABLE "new_DiscountCode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "discountPercentage" INTEGER NOT NULL,
    "isAutomatic" BOOLEAN NOT NULL DEFAULT true,
    "discountId" TEXT,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_DiscountCode" ("code", "createdAt", "discountPercentage", "id", "shopId") SELECT "code", "createdAt", "discountPercentage", "id", "shopId" FROM "DiscountCode";
DROP TABLE "DiscountCode";
ALTER TABLE "new_DiscountCode" RENAME TO "DiscountCode";
CREATE INDEX "DiscountCode_shopId_idx" ON "DiscountCode"("shopId");
CREATE INDEX "DiscountCode_code_idx" ON "DiscountCode"("code");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
