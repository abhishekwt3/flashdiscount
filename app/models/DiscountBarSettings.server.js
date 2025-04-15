import { prisma } from "../db.server";

/**
 * Save discount bar settings to the database
 */
export async function saveSettings(shopId, settings) {
  const existingSettings = await prisma.discountBarSettings.findFirst({
    where: { shopId },
  });

  if (existingSettings) {
    return prisma.discountBarSettings.update({
      where: { id: existingSettings.id },
      data: settings,
    });
  } else {
    return prisma.discountBarSettings.create({
      data: {
        shopId,
        ...settings,
      },
    });
  }
}

/**
 * Get discount bar settings for a shop
 */
export async function getSettings(shopId) {
  const settings = await prisma.discountBarSettings.findFirst({
    where: { shopId },
  });

  // Default settings if none exist
  return (
    settings || {
      backgroundColor: "#FF5733",
      textColor: "#FFFFFF",
      emoji: "🔥",
      timerDuration: 30,
      discountPercentage: 15,
      barText: "Limited time offer! Use code {code} for {discount}% off your order!",
    }
  );
}
