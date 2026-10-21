import mongoose from "mongoose";
const ObjectId = mongoose.Types.ObjectId;
import { MESSAGE, ACTIVE, UPLOAD_FILE_PATH } from "../../../../../global-variable.js";
import global from "../../../../../helpers/global-functions.js";
import axios from "axios";
import fs from "fs";
import path from "path";
import Items from "../../../../../models/items.js";
import Outfits from "../../../../../models/outfit.js";
import Planner from "../../../../../models/planner.js";
import Users from "../../../../../models/users.js";
import sharp from "sharp";
import Category from "../../../../../models/category.js";
import SubCategory from "../../../../../models/subCategory.js";
import RentPurchase from "../../../../../models/rent-purchase.js";

const normalizeItemImages = (images = []) => {
  const list = Array.isArray(images) ? images : images ? [images] : [];
  return list
    .filter(Boolean)
    .map((img) => {
      if (typeof img !== "string") return null;
      if (img.startsWith("http://") || img.startsWith("https://") || img.startsWith("uploads/")) return img;
      return `uploads/items/${img}`;
    })
    .filter(Boolean);
};

const normalizeOutfitImages = (images = []) => {
  const list = Array.isArray(images) ? images : images ? [images] : [];
  return list
    .filter(Boolean)
    .map((img) => {
      if (typeof img !== "string") return null;
      if (img.startsWith("http://") || img.startsWith("https://") || img.startsWith("uploads/")) return img;
      return `uploads/outfits/${img}`;
    })
    .filter(Boolean);
};

const resolveRentImages = (rentImages, fallbackImages = []) => {
  const primary = Array.isArray(rentImages) ? rentImages.filter(Boolean) : rentImages ? [rentImages] : [];
  if (primary.length) {
    return global.buildUploadUrls(primary);
  }
  return global.buildUploadUrls(fallbackImages);
};

const CommonController = {
  contactQuery: async (req, res) => {
    try {
      const { target_user_id, item_id, outfit_id, email, detail, phone } = req.body;

      console.log("[contact-query] req.body:", JSON.stringify(req.body));

      const finalPhone = phone;
      let finalTargetUserId = target_user_id;
      let productDetails = "";

      if (item_id) {
        const result = await Items.aggregate([
          { $match: { _id: new ObjectId(item_id) } },
          {
            $project: {
              name: 1,
              price: 1,
              purchase_rent_price: 1,
              description: 1,
              createdBy: 1,
            },
          },
        ]);

        const item = result[0];
        console.log("[contact-query] item found:", !!item, item?._id?.toString(), "name:", item?.name);

        if (item) {
          if (!finalTargetUserId) finalTargetUserId = item.createdBy;

          productDetails = `
        <div style="border:1px solid #eee;padding:15px;border-radius:8px;margin:10px 0;">
          <h3>Item Details:</h3>
          <p><strong>Name:</strong> ${item.name || 'N/A'}</p>
          <p><strong>Price:</strong> ${item.price || 'N/A'}</p>
          <p><strong>Purchase/Rent Price:</strong> ${item.purchase_rent_price}</p>
        </div>`;
        }

      } else if (outfit_id) {
        const result = await Outfits.aggregate([
          { $match: { _id: new ObjectId(outfit_id) } },
          {
            $project: {
              name: 1,
              purchase_rent_price: 1,
              description: 1,
              createdBy: 1,
            },
          },
        ]);

        const outfit = result[0];
        console.log("[contact-query] outfit found:", !!outfit, outfit?._id?.toString(), "name:", outfit?.name);

        if (outfit) {
          if (!finalTargetUserId) finalTargetUserId = outfit.createdBy;

          productDetails = `
        <div style="border:1px solid #eee;padding:15px;border-radius:8px;margin:10px 0;">
          <h3>Outfit Details:</h3>
          <p><strong>Name:</strong> ${outfit.name || 'N/A'}</p>
          <p><strong>Purchase/Rent Price:</strong> ${outfit.purchase_rent_price}</p>
          <p><strong>Description:</strong> ${outfit.description || 'N/A'}</p>
        </div>`;
        }
      }

      if (!finalTargetUserId) {
        console.log("[contact-query] FAIL: no finalTargetUserId");
        return global.failResponse(res, "Target user not found", {});
      }

      const targetUser = await Users.findById(finalTargetUserId).lean();
      console.log("[contact-query] targetUser:", {
        id: finalTargetUserId?.toString?.() || finalTargetUserId,
        found: !!targetUser,
        email: targetUser?.email || null,
      });

      if (!targetUser) return global.failResponse(res, "Target user not found", {});
      if (!targetUser.email) return global.failResponse(res, "Target user email not found", {});

      const dynamicStrings = {
        email,
        detail,
        phone: finalPhone,
        productDetails,
      };

      console.log("[contact-query] dynamicStrings:", {
        email,
        detail,
        phone: finalPhone,
        productDetails_length: productDetails?.length || 0,
        productDetails_preview: (productDetails || "").slice(0, 200),
      });

      const template = await global.attachEmailTemplate({ slug: "contact_query", dynamicStrings });

      console.log("[contact-query] template:", {
        hasTemplate: !!template,
        subject: template?.subject,
        title: template?.title,
        body_length: template?.body?.length || 0,
        body_preview: (template?.body || "").slice(0, 500),
        body_is_null: template?.body == null,
        body_is_empty: !template?.body,
      });

      if (template?.body) {
        console.log("[contact-query] sending email →", targetUser.email, "| subject:", template.subject);
        global.sendEmail(template.subject, targetUser.email, template.body);
        return global.successResponse(res, "Contact query sent successfully", {});
      } else {
        console.log("[contact-query] FAIL: template missing or body empty", template);
        return global.failResponse(res, "Email template not found", {});
      }

    } catch (err) {
      console.log("[contact-query] ERROR:", err?.message, err);
      return global.failResponse(res, err.message, err);
    }
  },

  rentList: async (req, res) => {
    try {
      const records = await RentPurchase.aggregate([
        { $match: { purchase_rent_toggle: true } },
        {
          $lookup: {
            from: "items",
            localField: "item_id",
            foreignField: "_id",
            as: "item",
          },
        },
        {
          $lookup: {
            from: "outfits",
            localField: "outfit_id",
            foreignField: "_id",
            as: "outfit",
          },
        },
        {
          $project: {
            item_id: 1,
            outfit_id: 1,
            purchase_rent_toggle: 1,
            purchase_rent_price: 1,
            images: 1,
            createdAt: 1,
            item: { $arrayElemAt: ["$item", 0] },
            outfit: { $arrayElemAt: ["$outfit", 0] },
          },
        },
        { $sort: { createdAt: -1 } },
      ]);

      const itemCategoryIds = records
        .map((r) => r.item?.category)
        .filter((id) => ObjectId.isValid(id));
      const itemSubCategoryIds = records
        .map((r) => r.item?.sub_category)
        .filter((id) => ObjectId.isValid(id));
      const outfitCategoryIds = records
        .flatMap((r) => (Array.isArray(r.outfit?.category) ? r.outfit.category : []))
        .filter((id) => ObjectId.isValid(id));

      const [categories, subCategories] = await Promise.all([
        Category.find({ _id: { $in: [...itemCategoryIds, ...outfitCategoryIds] } }).lean(),
        SubCategory.find({ _id: { $in: itemSubCategoryIds } }).lean(),
      ]);

      const categoryMap = new Map(categories.map((c) => [c._id.toString(), c]));
      const subCategoryMap = new Map(subCategories.map((s) => [s._id.toString(), s]));

      const items = records
        .filter((r) => r.item && r.item._id)
        .map((r) => ({
          _id: r.item._id,
          name: r.item.name,
          brand_name: r.item.brand_name,
          price: r.item.price,
          purchase_rent_toggle: r.purchase_rent_toggle,
          purchase_rent_price: r.purchase_rent_price,
          images: resolveRentImages(r.images, normalizeItemImages(r.item.images)),
          category: r.item.category ? categoryMap.get(r.item.category.toString()) || null : null,
          sub_category: r.item.sub_category ? subCategoryMap.get(r.item.sub_category.toString()) || null : null,
          createdAt: r.createdAt,
        }));

      const processedOutfits = records
        .filter((r) => r.outfit && r.outfit._id)
        .map((r) => ({
          _id: r.outfit._id,
          name: r.outfit.name,
          description: r.outfit.description,
          purchase_rent_toggle: r.purchase_rent_toggle,
          purchase_rent_price: r.purchase_rent_price,
          images: resolveRentImages(r.images, normalizeOutfitImages(r.outfit.images)),
          category: Array.isArray(r.outfit.category) && r.outfit.category.length
            ? categoryMap.get(r.outfit.category[0].toString()) || null
            : null,
          occasion: r.outfit.occasion,
          suitable: r.outfit.suitable,
          createdAt: r.createdAt,
        }));

      return global.successResponse(res, MESSAGE.OPR_SUCCESS, {
        rent_items: items,
        rent_outfits: processedOutfits,
      });

    } catch (err) {
      return global.failResponse(res, err.message, err);
    }
  },

  removeBgItemPicture: async (req, res) => {
    try {
      if (!req.files || !req.files.image) {
        return global.failResponse(res, "Image is required", {});
      }
      const imageUrl = await global.removeBgAndReturnUrl(req.files.image);
      return global.successResponse(res, MESSAGE.OPR_SUCCESS, { image: imageUrl });
    } catch (err) {
      return global.failResponse(res, err.message, err);
    }
  },

  rentDetails: async (req, res) => {
    try {
      const { o_id } = req.query;
      if (!o_id || !ObjectId.isValid(o_id)) {
        return global.failResponse(res, "Invalid o_id", {});
      }

      const inputId = new ObjectId(o_id);

      const userObjectId = new ObjectId(req.user._id);
      const rentRecord =
        (await RentPurchase.findOne({ _id: inputId, purchase_rent_toggle: true }).lean()) ||
        (await RentPurchase.findOne({ item_id: inputId, purchase_rent_toggle: true }).lean()) ||
        (await RentPurchase.findOne({ outfit_id: inputId, purchase_rent_toggle: true }).lean());

      if (!rentRecord) {
        return global.failResponse(res, MESSAGE.RECORD_NOT_FOUND, {});
      }

      const recordId = rentRecord.item_id ? new ObjectId(rentRecord.item_id) : new ObjectId(rentRecord.outfit_id);

      const itemCheck = rentRecord.item_id
        ? await Items.findOne({ _id: recordId, purchase_rent_toggle: true })
        : null;

      if (itemCheck) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const result = await Items.aggregate([
          { $match: { _id: recordId, purchase_rent_toggle: true } },
          {
            $lookup: {
              from: "categories",
              localField: "category",
              foreignField: "_id",
              as: "category",
            },
          },
          {
            $lookup: {
              from: "subcategories",
              localField: "sub_category",
              foreignField: "_id",
              as: "sub_category",
            },
          },
          {
            $lookup: {
              from: "outfits",
              let: { itemId: "$_id" },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $cond: {
                        if: { $isArray: "$item_id" },
                        then: { $in: ["$$itemId", "$item_id"] },
                        else: { $eq: ["$$itemId", "$item_id"] },
                      },
                    },
                  },
                },
                { $project: { name: 1 } },
              ],
              as: "outfits",
            },
          },
          { $addFields: { outfit_count: { $size: "$outfits" } } },
          global.userDataQuery("createdBy", "createdBy"),
          {
            $project: {
              name: 1,
              brand_name: 1,
              price: 1,
              purchased_on: 1,
              occasion: 1,
              mood: 1,
              season: 1,
              status: 1,
              statuses: 1,
              care: 1,
              size: 1,
              match_with_my_size: 1,
              measurements: 1,
              colors: 1,
              fabric: 1,
              notes: 1,
              tags: 1,
              images: global.itemMultiImageQuery("images"),
              category: { $arrayElemAt: ["$category", 0] },
              sub_category: { $arrayElemAt: ["$sub_category", 0] },
              outfit_count: 1,
              outfits: 1,
              wear_count: 1,
              purchase_rent_toggle: 1,
              purchase_rent_price: 1,
              createdAt: 1,
              updatedAt: 1,
              createdBy: { $arrayElemAt: ["$createdBy", 0] },
              // createdBy: 1,
            },
          },
        ]);

        const item = result[0] || null;
        if (!item || !item._id) return global.failResponse(res, MESSAGE.RECORD_NOT_FOUND, {});

        const userId = item.createdBy?._id ? new ObjectId(item.createdBy._id) : new ObjectId(item.createdBy);
        const wearCountResult = await Planner.aggregate([
          {
            $match: {
              createdBy: userId,
              outfit_id: { $exists: true, $ne: null },
              event_date: { $lt: today },
            },
          },
          {
            $lookup: {
              from: "outfits",
              localField: "outfit_id",
              foreignField: "_id",
              as: "outfit",
            },
          },
          { $unwind: "$outfit" },
          { $match: { "outfit.item_id": recordId } },
          { $count: "totalItemWearCount" },
        ]);

        item.totalItemWearCount = wearCountResult[0]?.totalItemWearCount ?? 0;
        if (item.createdBy?.profile_image) {
          item.createdBy.profile_image = global.buildUserImageUrl(item.createdBy.profile_image);
        }

        item.images = resolveRentImages(rentRecord.images, normalizeItemImages(item.images));
        item.purchase_rent_toggle = rentRecord.purchase_rent_toggle;
        item.purchase_rent_price = rentRecord.purchase_rent_price;
        return global.successResponse(res, MESSAGE.OPR_SUCCESS, item);
      }
      const result = await Outfits.aggregate([
        { $match: { _id: recordId, purchase_rent_toggle: true } },
        {
          $lookup: {
            from: "categories",
            localField: "category",
            foreignField: "_id",
            as: "category",
          },
        },
        {
          $lookup: {
            from: "items",
            let: { itemId: "$item_id" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $cond: {
                      if: { $isArray: "$$itemId" },
                      then: { $in: ["$_id", "$$itemId"] },
                      else: { $eq: ["$_id", "$$itemId"] },
                    },
                  },
                },
              },
              { $project: { _id: 1, name: 1, images: global.itemMultiImageQuery("images") } },
            ],
            as: "items",
          },
        },
        {
          $lookup: {
            from: "lookbooks",
            localField: "_id",
            foreignField: "outfit_id",
            pipeline: [
              { $match: { type: "outfit", status: ACTIVE } },
              { $project: { _id: 1, createdBy: 1 } },
            ],
            as: "lookbookEntries",
          },
        },
        global.userDataQuery("createdBy", "createdBy"),
        {
          $project: {
            name: 1,
            description: 1,
            suitable: 1,
            occasion: 1,
            status: 1,
            notes: 1,
            tags: 1,
            images: 1,
            purchase_rent_toggle: 1,
            purchase_rent_price: 1,
            category: { $arrayElemAt: ["$category", 0] },
            items: 1,
            lookbookBy: {
              $map: {
                input: { $ifNull: ["$lookbookEntries", []] },
                as: "lb",
                in: "$$lb.createdBy",
              },
            },
            createdAt: 1,
            updatedAt: 1,
            createdBy: { $arrayElemAt: ["$createdBy", 0] },
            // createdBy: 1,
          },
        },
      ]);

      const outfit = result[0] || null;
      if (!outfit || !outfit._id) return global.failResponse(res, MESSAGE.RECORD_NOT_FOUND, {});

      outfit.isLookbok = (outfit.lookbookBy || []).some(
        (id) => id && id.toString() === userObjectId.toString()
      );
      outfit.images = resolveRentImages(rentRecord.images, normalizeOutfitImages(outfit.images));
      outfit.purchase_rent_toggle = rentRecord.purchase_rent_toggle;
      outfit.purchase_rent_price = rentRecord.purchase_rent_price;
      if (outfit.createdBy?.profile_image) {
        outfit.createdBy.profile_image = global.buildUserImageUrl(outfit.createdBy.profile_image);
      }

      return global.successResponse(res, MESSAGE.OPR_SUCCESS, outfit);

    } catch (err) {
      return global.failResponse(res, err.message, err);
    }
  },
  removeBgAndAutoTag: async (req, res) => {
    try {
      if (!req.files || !req.files.image) {
        return global.failResponse(res, "Image is required", {});
      }

      const originalBuffer = req.files.image.data;
      const mimeType = req.files.image.mimetype;

      // ─── Step 1: Categories (ONLY type: item) + SubCategories ─────────────
      const allCategories = await Category.find({
        status: 1,
        type: "item",
      })
        .select("_id title")
        .lean();

      const allSubCategories = await SubCategory.find({ status: 1 })
        .select("_id title categoryId")
        .lean();

      if (!allCategories.length) {
        return global.failResponse(res, "No item categories found", {});
      }

      const categoryListForAI = allCategories.map((c) => ({
        id: c._id.toString(),
        name: c.title,
      }));

      const subCategoryListForAI = allSubCategories.map((s) => ({
        id: s._id.toString(),
        name: s.title,
        categoryId: s.categoryId.toString(),
      }));

      // ─── Step 2: Image resize ─────────────────────────────────────────────
      const resizedBuffer = await sharp(originalBuffer)
        .resize(512)
        .jpeg({ quality: 70 })
        .toBuffer();

      const base64Image = resizedBuffer.toString("base64");

      // ─── Step 3: AI ───────────────────────────────────────────────────────
      const ALLOWED_BRANDS = ["Zara", "Gucci", "H&M", "Prada", "Nike", "Adidas", "Chanel", "Uniqlo", "Louis Vuitton", "Puma"];
      const ALLOWED_SIZES = ["XS", "S", "M", "L", "XL"];

      const systemPrompt = `
You are a professional fashion AI.

Analyze the clothing image and return STRICT JSON ONLY.

⚠️ RULES (VERY IMPORTANT):
- NEVER return null for fields unless absolutely impossible
- You MUST fill all fields with best guess
- ALWAYS infer details from image (even if unsure)
- DO NOT leave arrays empty — always add at least 1 value
- DO NOT return empty strings

FIELD RULES:
- name: always generate a realistic clothing name
- brand_name: only if clearly visible, else null
- occasion: must be one of [party, casual, formal, daily, workout, lounge, ethnic, wedding]
- mood: must be one of [romantic, casual, happy]
- season: must be one of [summer, winter, monsoon, fall]
- care: must be one of [regular, gentle, dry_clean]
- size: must be one of [XS, S, M, L, XL] (guess)
- colors: MUST contain at least 1 color
- fabric: MUST contain at least 1 fabric
- tags: MUST contain 3 to 5 tags

CATEGORY RULES:
- category_id MUST be selected from given list
- sub_category_id MUST belong to category_id

Categories:
${JSON.stringify(categoryListForAI)}

SubCategories:
${JSON.stringify(subCategoryListForAI)}

Return ONLY JSON:
{
  "name": "string",
  "category_id": "string",
  "sub_category_id": "string",
  "brand_name": "string or null",
  "occasion": "string",
  "mood": "string",
  "season": "string",
  "statuses": "closet",
  "care": "string",
  "size": "string",
  "colors": ["string"],
  "fabric": ["string"],
  "notes": "string",
  "tags": ["string"]
}
`;

      const [imageUrl, aiResponse] = await Promise.all([
        // global.removeBgAndReturnUrl(req.files.image),
        global.removeBackgroundPhotoroomAndReturnUrl(req.files.image),

        axios.post(
          process.env.OPENAI_URL || "https://api.openai.com/v1/chat/completions",
          {
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: systemPrompt },
              {
                role: "user",
                content: [
                  {
                    type: "image_url",
                    image_url: {
                      url: `data:${mimeType};base64,${base64Image}`,
                    },
                  },
                  { type: "text", text: "Analyze and return JSON" },
                ],
              },
            ],
            max_tokens: 700,
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
              "Content-Type": "application/json",
            },
          }
        ),
      ]);

      // ─── Step 4: Parse ────────────────────────────────────────────────────
      let content = aiResponse.data.choices[0].message.content.trim();
      content = content.replace(/```(?:json)?/g, "").trim();

      let rawData;
      try {
        rawData = JSON.parse(content);
      } catch (err) {
        return res.status(500).json({
          success: false,
          message: "AI JSON parse failed",
          data: content,
        });
      }

      // ─── Step 5: Find Category ────────────────────────────────────────────
      const findCategoryById = (aiId) => {
        if (!aiId) return null;
        const exact = allCategories.find((c) => c._id.toString() === aiId);
        if (exact) return exact._id;

        const lower = aiId.toLowerCase();
        const fuzzy = allCategories.find(
          (c) =>
            c.title.toLowerCase().includes(lower) ||
            lower.includes(c.title.toLowerCase())
        );

        return fuzzy ? fuzzy._id : null;
      };

      let resolvedCategoryId = findCategoryById(rawData.category_id);

      // ✅ Fallback 1: name match
      if (!resolvedCategoryId && rawData.name) {
        const fallback = allCategories.find((c) =>
          rawData.name.toLowerCase().includes(c.title.toLowerCase())
        );
        if (fallback) resolvedCategoryId = fallback._id;
      }

      // ✅ FINAL: kabhi null nahi
      if (!resolvedCategoryId) {
        resolvedCategoryId = allCategories[0]._id;
      }

      // ─── Step 6: SubCategory ──────────────────────────────────────────────
      const findSubCategoryById = (aiId, categoryId) => {
        if (!aiId) return null;

        const scoped = allSubCategories.filter(
          (s) => s.categoryId.toString() === categoryId.toString()
        );

        const exact = scoped.find((s) => s._id.toString() === aiId);
        if (exact) return exact._id;

        const lower = aiId.toLowerCase();
        const fuzzy = scoped.find(
          (s) =>
            s.title.toLowerCase().includes(lower) ||
            lower.includes(s.title.toLowerCase())
        );

        return fuzzy ? fuzzy._id : null;
      };

      let resolvedSubCategoryId = findSubCategoryById(
        rawData.sub_category_id,
        resolvedCategoryId
      );

      // ✅ Fallback: first subcategory of that category
      if (!resolvedSubCategoryId) {
        const fallbackSub = allSubCategories.find(
          (s) => s.categoryId.toString() === resolvedCategoryId.toString()
        );
        if (fallbackSub) resolvedSubCategoryId = fallbackSub._id;
      }

      // ─── Step 7: Final Data ───────────────────────────────────────────────
      const itemData = {
        name: rawData.name || null,
        category: resolvedCategoryId,
        sub_category: resolvedSubCategoryId,
        brand_name: ALLOWED_BRANDS.includes(rawData.brand_name) ? rawData.brand_name : null,
        occasion: rawData.occasion || null,
        mood: rawData.mood || null,
        season: rawData.season || null,
        statuses: "closet",
        care: rawData.care || "regular",
        size: ALLOWED_SIZES.includes(rawData.size) ? rawData.size : null,
        colors: Array.isArray(rawData.colors) ? rawData.colors : [],
        fabric: Array.isArray(rawData.fabric) ? rawData.fabric : [],
        notes: rawData.notes || null,
        tags: Array.isArray(rawData.tags) ? rawData.tags : [],
      };

      return global.successResponse(res, "Item generated successfully", {
        image: imageUrl,
        itemData,
      });

    } catch (err) {
      console.error(err);
      return global.failResponse(res, err.message, err);
    }
  }
};

export default CommonController;
