// app/models/DiscountBarSettings.server.js
import { PrismaClient } from '@prisma/client';

// Initialize Prisma client
let prisma;

// Handle development vs production environments
if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  // Prevent multiple instances during development
  if (!global.prisma) {
    global.prisma = new PrismaClient();
  }
  prisma = global.prisma;
}

/**
 * Save discount bar settings to the database
 */
export async function saveSettings(shopId, settings) {
  if (!shopId) {
    console.error("saveSettings called without a shopId");
    throw new Error("Shop ID is required");
  }

  // Ensure shopId is properly formatted as a string
  const normalizedShopId = String(shopId).trim();

  console.log(`Saving settings for shop: ${normalizedShopId}`, settings);

  try {
    const existingSettings = await prisma.discountBarSettings.findFirst({
      where: { shopId: normalizedShopId },
    });

    console.log(`Existing settings found: ${!!existingSettings}`);

    let result;
    if (existingSettings) {
      // Update existing settings
      result = await prisma.discountBarSettings.update({
        where: { id: existingSettings.id },
        data: {
          backgroundColor: settings.backgroundColor,
          textColor: settings.textColor,
          emoji: settings.emoji,
          timerDuration: parseInt(settings.timerDuration, 10) || 15,
          discountPercentage: parseInt(settings.discountPercentage, 10) || 15,
          barText: settings.barText,
          isActive: settings.isActive !== undefined ? Boolean(settings.isActive) : true,
          updatedAt: new Date()
        },
      });
      console.log(`Settings updated successfully for shop: ${normalizedShopId}`);
    } else {
      // Create new settings
      result = await prisma.discountBarSettings.create({
        data: {
          shopId: normalizedShopId,
          backgroundColor: settings.backgroundColor || "#FF5733",
          textColor: settings.textColor || "#FFFFFF",
          emoji: settings.emoji || "🔥",
          timerDuration: parseInt(settings.timerDuration, 10) || 15,
          discountPercentage: parseInt(settings.discountPercentage, 10) || 15,
          barText: settings.barText || "Limited time offer! {discount}% off your entire order automatically applied!",
          isActive: settings.isActive !== undefined ? Boolean(settings.isActive) : true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
      });
      console.log(`New settings created for shop: ${normalizedShopId}`);
    }

    return result;
  } catch (error) {
    console.error(`Error saving settings for shop ${normalizedShopId}:`, error);
    throw error;
  }
}

/**
 * Get discount bar settings for a shop
 */
export async function getSettings(shopId) {
  if (!shopId) {
    console.error("getSettings called without a shopId");
    throw new Error("Shop ID is required");
  }

  // Ensure shopId is properly formatted as a string
  const normalizedShopId = String(shopId).trim();

  console.log(`Fetching settings for shop: ${normalizedShopId}`);

  try {
    const settings = await prisma.discountBarSettings.findFirst({
      where: { shopId: normalizedShopId },
    });

    console.log(`Settings found for shop ${normalizedShopId}: ${!!settings}`);

    // Default settings if none exist
    return (
      settings || {
        backgroundColor: "#FF5733",
        textColor: "#FFFFFF",
        emoji: "🔥",
        timerDuration: 15,
        discountPercentage: 15,
        barText: "Limited time offer! {discount}% off your entire order automatically applied!",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    );
  } catch (error) {
    console.error(`Error fetching settings for shop ${normalizedShopId}:`, error);

    // Return default settings in case of error
    return {
      backgroundColor: "#FF5733",
      textColor: "#FFFFFF",
      emoji: "🔥",
      timerDuration: 15,
      discountPercentage: 15,
      barText: "Limited time offer! {discount}% off your entire order automatically applied!",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }
}

/**
 * Toggle the active status of discount bar settings
 */
export async function toggleActive(shopId, isActive) {
  if (!shopId) {
    console.error("toggleActive called without a shopId");
    throw new Error("Shop ID is required");
  }

  // Ensure shopId is properly formatted as a string
  const normalizedShopId = String(shopId).trim();

  console.log(`Toggling active status to ${isActive} for shop: ${normalizedShopId}`);

  try {
    const existingSettings = await prisma.discountBarSettings.findFirst({
      where: { shopId: normalizedShopId },
    });

    let result;
    if (existingSettings) {
      result = await prisma.discountBarSettings.update({
        where: { id: existingSettings.id },
        data: {
          isActive: Boolean(isActive),
          updatedAt: new Date()
        },
      });
      console.log(`Active status updated to ${isActive} for shop: ${normalizedShopId}`);
    } else {
      // Create default settings with the specified active status
      result = await saveSettings(normalizedShopId, { isActive: Boolean(isActive) });
      console.log(`Created new settings with active status ${isActive} for shop: ${normalizedShopId}`);
    }

    return result;
  } catch (error) {
    console.error(`Error toggling active status for shop ${normalizedShopId}:`, error);
    throw error;
  }
}

/**
 * Get recent discount codes for a shop
 */
export async function getRecentDiscountCodes(shopId, limit = 10) {
  if (!shopId) {
    console.error("getRecentDiscountCodes called without a shopId");
    return [];
  }

  // Ensure shopId is properly formatted as a string
  const normalizedShopId = String(shopId).trim();

  try {
    const codes = await prisma.discountCode.findMany({
      where: { shopId: normalizedShopId },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    return codes || []; // Ensure we return an empty array if no codes exist
  } catch (error) {
    console.error(`Error fetching recent discount codes for shop ${normalizedShopId}:`, error);
    return []; // Return an empty array in case of error
  }
}

/**
 * Get a specific discount code by ID
 */
export async function getDiscountCode(id) {
  if (!id) {
    console.error("getDiscountCode called without an id");
    return null;
  }

  try {
    return await prisma.discountCode.findUnique({
      where: { id }
    });
  } catch (error) {
    console.error(`Error fetching discount code with ID ${id}:`, error);
    return null;
  }
}

/**
 * Delete expired discount codes
 */
export async function cleanupExpiredDiscountCodes() {
  try {
    const now = new Date();
    const result = await prisma.discountCode.deleteMany({
      where: {
        expiresAt: {
          not: null,
          lt: now
        }
      }
    });

    console.log(`Cleaned up ${result.count} expired discount codes`);
    return result.count; // Return number of deleted records
  } catch (error) {
    console.error("Error cleaning up expired discount codes:", error);
    return 0;
  }
}
