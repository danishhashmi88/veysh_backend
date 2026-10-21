import axios from "axios";
import { ACTIVE } from "../global-variable.js";
import Users from "../models/users.js";
import items from "../models/items.js";
import Category from "../models/category.js";
import SubCategory from "../models/subCategory.js";
import WardrobeChats from "../models/wardrobe-chats.js";
import global from "./global-functions.js";

const getDayRange = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

const buildItemImageUrl = (rawImage) => {
  if (!rawImage) return null;
  if (rawImage.startsWith("http://") || rawImage.startsWith("https://")) return rawImage;
  const clean = rawImage.startsWith("uploads/items/") ? rawImage.replace("uploads/items/", "") : rawImage;
  return `${process.env.BASE_URL}/uploads/items/${clean}`;
};

const getValidOutfitCategories = async () => {
  const allOutfitCategories = await Category.find({ type: "outfit", status: ACTIVE }).select("_id title");
  const validCategoriesWithSub = await Promise.all(
    allOutfitCategories.map(async (cat) => {
      const subExists = await SubCategory.findOne({ categoryId: cat._id, status: ACTIVE }).select("_id");
      return subExists ? { id: cat._id.toString(), title: cat.title } : null;
    }),
  );
  return validCategoriesWithSub.filter(Boolean);
};

const generateOutfitForUser = async (user, validCategories) => {
  const userId = user._id;
  const { start, end } = getDayRange();

  const existingToday = await WardrobeChats.findOne({
    user_id: userId,
    is_daily_suggestion: true,
    createdAt: { $gte: start, $lte: end },
  }).select("_id");
  if (existingToday) return { skipped: true, reason: "already_generated" };

  const userItems = await items.find({ createdBy: userId, status: ACTIVE }).limit(20).select("name category colors images");
  if (!userItems.length) return { skipped: true, reason: "no_items" };

  const userGender = user.gender || "not specified";
  const todayText = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const prompt = `
You are a friendly fashion stylist.
USER PROFILE: Gender is ${userGender}.
Today is ${todayText}.

VALID OUTFIT CATEGORY IDs (Strictly use ONLY these ObjectIDs):
${JSON.stringify(validCategories)}

USER CLOSET ITEMS:
${JSON.stringify(userItems.map((i) => ({ id: i._id, name: i.name, category: i.category })))}

TASK: Suggest ONE great outfit for today using ONLY items from the closet above.

OUTPUT FORMAT (STRICT JSON):
{
  "answer": "A warm morning message and why this outfit works for today (2-3 lines).",
  "suggested_outfit_ids": [],
  "suggested_new_outfits": [
    {
      "name": "Outfit Name",
      "item_ids": [],
      "category_id": "STRICT_MONGO_ID_FROM_LIST",
      "description": "Style notes"
    }
  ]
}
`;

  const openaiRes = await axios.post(
    process.env.OPENAI_URL,
    {
      model: process.env.OPENAI_MODEL,
      messages: [
        {
          role: "system",
          content: "You are a warm fashion stylist. Always reply in JSON. Only use the provided category ObjectIDs for outfits.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    },
    { headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` } },
  );

  const structuredResponse = JSON.parse(openaiRes.data.choices[0].message.content || "{}");
  const allItemIds = (structuredResponse.suggested_new_outfits || []).flatMap((o) => o.item_ids || []);
  const populatedItems = await items.find({ _id: { $in: allItemIds }, createdBy: userId, status: ACTIVE }).select("name category colors images");
  const itemMap = {};
  populatedItems.forEach((i) => {
    itemMap[i._id.toString()] = i;
  });

  const newOutfitSuggestions = await Promise.all(
    (structuredResponse.suggested_new_outfits || []).map(async (out) => {
      const outfitItems = (Array.isArray(out.item_ids) ? out.item_ids : []).map((id) => itemMap[id?.toString()]).filter(Boolean);
      const imagesForCollage = outfitItems.map((item) => buildItemImageUrl(item.images?.[0])).filter(Boolean);

      let outfit_image = "";
      try {
        const collageFile = await global.createOutfitCollage(imagesForCollage);
        outfit_image = collageFile ? `${process.env.BASE_URL}/uploads/items/${collageFile}` : imagesForCollage[0] || "";
      } catch (err) {
        outfit_image = imagesForCollage[0] || "";
      }

      return {
        name: out.name,
        category_id: out.category_id,
        description: out.description,
        item_ids: outfitItems.map((x) => x._id),
        items: outfitItems.map((item) => ({
          _id: item._id,
          name: item.name,
          images: (item.images || []).map(buildItemImageUrl).filter(Boolean),
        })),
        outfit_image,
        is_saved: false,
      };
    }),
  );

  const finalResponse = {
    answer: structuredResponse.answer || "",
    suggested_outfits: [],
    suggested_new_outfits: newOutfitSuggestions,
    is_daily_suggestion: true,
    generated_at: new Date(),
  };

  await WardrobeChats.create({
    user_id: userId,
    question: "Daily outfit suggestion",
    response: finalResponse,
    is_greeting: false,
    is_daily_suggestion: true,
  });

  return { skipped: false };
};

export const runDailyOutfitSuggestionJob = async () => {
  const startedAt = new Date();
  const allUsers = await Users.find({ status: ACTIVE, role: "user" }).select("_id gender");
  const validCategories = await getValidOutfitCategories();
  let generated = 0;
  let skipped = 0;
  let failed = 0;
  const skippedByReason = {};
  const failedUsers = [];

  console.log(
    `[DailyOutfit] Job start | users=${allUsers.length} | validCategories=${validCategories.length} | at=${startedAt.toISOString()}`,
  );

  for (const user of allUsers) {
    try {
      const result = await generateOutfitForUser(user, validCategories);
      if (result.skipped) {
        skipped += 1;
        const reason = result.reason || "unknown";
        skippedByReason[reason] = (skippedByReason[reason] || 0) + 1;
      } else {
        generated += 1;
      }
    } catch (err) {
      failed += 1;
      failedUsers.push({ user_id: user._id.toString(), error: err.message });
      console.error(`❌ DailyOutfit failed for user=${user._id}:`, err.message);
    }
  }

  const endedAt = new Date();
  return {
    totalUsers: allUsers.length,
    generated,
    skipped,
    failed,
    skippedByReason,
    failedUsers: failedUsers.slice(0, 20),
    startedAt: startedAt.toISOString(),
    endedAt: endedAt.toISOString(),
  };
};

