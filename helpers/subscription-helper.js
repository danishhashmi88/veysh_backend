import subscription from "../models/subscription.js";
import userSubscription from "../models/user-subscription.js";
import { ACTIVE } from "../global-variable.js";
import Items from "../models/items.js";
import Posts from "../models/posts.js";
import Outfits from "../models/outfit.js";
import WardrobeChats from "../models/wardrobe-chats.js";

const normalizeAccessKey = (v = "") => v.toString().trim().toLowerCase().replace(/[\s-]+/g, "_");

const parseLimitValue = (raw) => {
  if (raw === null || raw === undefined || raw === "") return undefined;
  const normalized = raw.toString().trim().toLowerCase();
  if (normalized === "unlimited" || normalized === "infinite" || normalized === "infinity" || normalized === "no_limit") {
    return null;
  }
  const n = Number(raw);
  if (Number.isFinite(n) && n >= 0) return n;
  return undefined;
};

const getAccessValue = (subscriptionAccess = [], keys = []) => {
  if (!Array.isArray(subscriptionAccess) || !subscriptionAccess.length) return undefined;
  const wanted = keys.map(normalizeAccessKey);
  const row = subscriptionAccess.find((r) => {
    const candidates = [r?.key, r?.slug, r?.label].map(normalizeAccessKey);
    return candidates.some((k) => wanted.includes(k));
  });
  return row?.value;
};

const getLimitFromAccess = (subscriptionAccess = [], type = "") => {
  const map = {
    item: ["item", "item_limit", "items_limit", "items", "item_added_limit"],
    post: ["post", "post_limit", "posts_limit", "posts", "post_added_limit"],
    outfit: ["outfit", "outfit_limit", "outfits_limit", "outfits", "outfit_added_limit"],
    ai: ["ai_uses", "ai_used", "ai", "ai_usage_limit", "ai_limit", "bae_limit", "wardrobe_ai_limit", "ai_uses_limit"],
  };
  return parseLimitValue(getAccessValue(subscriptionAccess, map[type] || []));
};

const getLimitTypeFromAccess = (subscriptionAccess = [], type = "") => {
  const perType = getAccessValue(subscriptionAccess, [`${type}_limit_type`, `${type}_frequency_type`]);
  const globalType = getAccessValue(subscriptionAccess, ["limit_type", "frequency_type"]);
  const normalized = normalizeAccessKey(perType || globalType || "");
  if (normalized === "day" || normalized === "daily" || normalized === "per_day") return "day";
  if (normalized === "month" || normalized === "monthly" || normalized === "per_month") return "month";
  return "total";
};

const subscriptionHelper = {
  /**
   * Assigns a Basic (free) subscription to a user.
   * If a Basic subscription already exists, it ensures it's the only one activated.
   */
  assignBasicSubscription: async (userId) => {
    try {
      // 1. Find the Basic plan (price 0)
      const basicPlan = await subscription.findOne({ price: 0, status: ACTIVE });
      if (!basicPlan) {
        console.error("[SubscriptionHelper] No Basic plan found in DB.");
        return null;
      }

      // 2. Check if the user already has a Basic subscription
      let existingUserSub = await userSubscription.findOne({
        user_id: userId,
        subscription_id: basicPlan._id,
      });

      if (existingUserSub) {
        // If it exists, just ensure it's activated correctly (if needed)
        // But the requirement is likely to only call this when no premium exists or at signup.
        // We'll activate it.
        return await subscriptionHelper.activateSubscription(userId, existingUserSub._id);
      }

      // 3. Deactivate current active ones first (safety)
      await userSubscription.updateMany({ user_id: userId }, { $set: { activated: false } });

      // 4. Create new Basic subscription snapshot
      // Basic plan usually doesn't expire or has a very long duration.
      // We'll set it to 10 years for now as "lifetime".
      const startDate = new Date();
      const endDate = new Date();
      endDate.setFullYear(startDate.getFullYear() + 10);

      const newUserSub = await userSubscription.create({
        title: basicPlan.title,
        price: basicPlan.price,
        subscription_id: basicPlan._id,
        user_id: userId,
        duration_type: basicPlan.duration_type || "year",
        start_date: startDate,
        end_date: endDate,
        paid_amount: 0,
        subscription_access: basicPlan.subscription_access || [],
        description: basicPlan.description || null,
        status: ACTIVE,
        activated: true,
        createdBy: userId,
        updatedBy: userId,
      });

      return newUserSub;
    } catch (err) {
      console.error("[SubscriptionHelper] assignBasicSubscription Error:", err);
      return null;
    }
  },

  /**
   * Activates a specific subscription and deactivates all others for that user.
   */
  activateSubscription: async (userId, userSubId) => {
    try {
      // Deactivate all
      await userSubscription.updateMany(
        { user_id: userId },
        { $set: { activated: false } }
      );

      // Activate specific one
      const activatedSub = await userSubscription.findByIdAndUpdate(
        userSubId,
        { $set: { activated: true } },
        { new: true }
      );

      return activatedSub;
    } catch (err) {
      console.error("[SubscriptionHelper] activateSubscription Error:", err);
      return null;
    }
  },

  /**
   * Ensures the user has an activated subscription.
   * If none are activated, it tries to activate the Basic one.
   */
  ensureActivated: async (userId) => {
    const currentActive = await userSubscription.findOne({ user_id: userId, activated: true }).populate("subscription_id");
    if (!currentActive) {
      return await subscriptionHelper.assignBasicSubscription(userId);
    }
    return currentActive;
  },

  /**
   * Checks if the user has reached their subscription limit for a specific type.
   * @param {String} userId - User ID
   * @param {String} type - 'item', 'post', 'outfit', or 'ai'
   * @returns {Object} { limitReached: Boolean, limit: Number, currentUsage: Number, message: String }
   */
  checkLimit: async (userId, type) => {
    try {
      const activeSub = await subscriptionHelper.ensureActivated(userId);
      console.log('activeSubactiveSub',activeSub)
  
      if (!activeSub) {
        return {
          limitReached: true,
          limit: 0,
          currentUsage: 0,
          message: "No active subscription found.",
        };
      }
  
      const plan = activeSub.subscription_id;
  
      const planAccess = plan?.subscription_access || [];
      const activeAccess = activeSub.subscription_access || [];
  
      // ----------------------------------------
      // LIMIT (Plan -> User Snapshot -> Legacy)
      // ----------------------------------------
      let limit =
        getLimitFromAccess(planAccess, type) ??
        getLimitFromAccess(activeAccess, type);
  
      if (limit === undefined) {
        switch (type) {
          case "item":
            limit = plan?.item_limit ?? activeSub.item_limit;
            break;
  
          case "post":
            limit = plan?.post_limit ?? activeSub.post_limit;
            break;
  
          case "outfit":
            limit = plan?.outfit_limit ?? activeSub.outfit_limit;
            break;
  
          case "ai":
            limit = plan?.ai_usage_limit ?? activeSub.ai_usage_limit;
            break;
        }
      }
  
      // ----------------------------------------
      // LIMIT TYPE (Plan -> User Snapshot -> Legacy)
      // ----------------------------------------
      let limitType =
        getLimitTypeFromAccess(planAccess, type) ||
        getLimitTypeFromAccess(activeAccess, type) ||
        plan?.limit_type ||
        activeSub.limit_type ||
        "total";
  
      if (!["day", "month", "total"].includes(limitType)) {
        limitType = "total";
      }
  
      // ----------------------------------------
      // DEFAULT LIMITS
      // ----------------------------------------
      if (limit === undefined) {
        limit = activeSub.price > 0 ? 5 : 1;
      }
  
      // ----------------------------------------
      // UNLIMITED
      // ----------------------------------------
      if (limit === null) {
        if (activeSub.price > 0) {
          return {
            limitReached: false,
            limit: null,
            currentUsage: 0,
            message: "Unlimited",
          };
        }
  
        // Never allow unlimited for free plan
        limit = 1;
      }
  
      // ----------------------------------------
      // BUILD QUERY
      // ----------------------------------------
      const ownerField = type === "ai" ? "user_id" : "createdBy";
  
      const limitQuery = {
        [ownerField]: userId,
      };
  
      if (type === "ai") {
        limitQuery.is_greeting = { $ne: true };
      }
  
      if (limitType === "day") {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
  
        limitQuery.createdAt = {
          $gte: startOfDay,
        };
      } else if (limitType === "month") {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
  
        limitQuery.createdAt = {
          $gte: startOfMonth,
        };
      }
  
      // ----------------------------------------
      // MODEL
      // ----------------------------------------
      let model;
  
      switch (type) {
        case "item":
          model = Items;
          break;
  
        case "post":
          model = Posts;
          break;
  
        case "outfit":
          model = Outfits;
          break;
  
        case "ai":
          model = WardrobeChats;
          break;
  
        default:
          return {
            limitReached: true,
            limit: 0,
            currentUsage: 0,
            message: "Invalid limit type.",
          };
      }
  
      // ----------------------------------------
      // COUNT USAGE
      // ----------------------------------------
      const usageCount = await model.countDocuments(limitQuery);
  
      if (usageCount >= limit) {
        const isPremium = activeSub.price > 0;
  
        return {
          limitReached: true,
          limit,
          currentUsage: usageCount,
          message: isPremium
            ? `You have reached the limit of ${limit} ${type}s for your premium subscription.`
            : `To continue with more ${type}s you have to switch to premium subscription.`,
        };
      }
  
      return {
        limitReached: false,
        limit,
        currentUsage: usageCount,
      };
    } catch (err) {
      console.error(`[SubscriptionHelper] checkLimit Error for ${type}:`, err);
  
      return {
        limitReached: false,
        limit: 5,
        currentUsage: 0,
      };
    }
  },
};

export default subscriptionHelper;
