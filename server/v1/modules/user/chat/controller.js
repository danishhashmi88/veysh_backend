import global from "../../../../../helpers/global-functions.js";
import MessagesModel from "../../../../../models/messages.js";
import UserModel from "../../../../../models/users.js";
import mongoose from "mongoose";
import { FILES_URL, MESSAGE, PER_PAGE_RECORDS } from "../../../../../global-variable.js";
import OpenAI from "openai";
import axios from "axios";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Items from "../../../../../models/items.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const ObjectId = mongoose.Types.ObjectId;

const chatController = {
  /** List of users with whom current user has chatted (conversations list) */
  chatList: async (req, res) => {
    try {
      const userId = req.user._id;
      const page = Number(req.query.page) || Number(req.body?.page) || 1;
      const perPage = Number(req.query.per_page) || Number(req.body?.per_page) || PER_PAGE_RECORDS;
      const skip = perPage * page - perPage;
      const search = req.query.search || req.body?.search || "";

      const match = {
        $or: [
          { sender_id: new ObjectId(userId) },
          { receiver_id: new ObjectId(userId) },
        ],
      };

      const aggregationPipeline = [
        { $match: match },
        { $sort: { createdAt: -1 } },
        { $group: { _id: "$room", lastDoc: { $first: "$$ROOT" } } },
        { $sort: { "lastDoc.createdAt": -1 } },
      ];

      if (!search) {
        aggregationPipeline.push({ $skip: skip }, { $limit: perPage });
      }

      aggregationPipeline.push(
        {
          $lookup: {
            from: "users",
            localField: "lastDoc.sender_id",
            foreignField: "_id",
            as: "sender",
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "lastDoc.receiver_id",
            foreignField: "_id",
            as: "receiver",
          },
        },
        { $unwind: { path: "$sender", preserveNullAndEmptyArrays: true } },
        { $unwind: { path: "$receiver", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            room: "$_id",
            last_message: "$lastDoc",
            other_user_id: {
              $cond: {
                if: { $eq: ["$lastDoc.sender_id", new ObjectId(userId)] },
                then: "$lastDoc.receiver_id",
                else: "$lastDoc.sender_id",
              },
            },
            other_user: {
              $cond: {
                if: { $eq: ["$lastDoc.sender_id", new ObjectId(userId)] },
                then: "$receiver",
                else: "$sender",
              },
            },
          },
        }
      );

      let total_records = 0;

      if (search) {
        aggregationPipeline.push({
          $match: {
            $or: [
              { "other_user.full_name": { $regex: search, $options: "i" } },
              { "other_user.first_name": { $regex: search, $options: "i" } },
              { "other_user.last_name": { $regex: search, $options: "i" } },
              { "other_user.username": { $regex: search, $options: "i" } },
              { "other_user.email": { $regex: search, $options: "i" } },
              { "other_user.name": { $regex: search, $options: "i" } },
              { "last_message.message": { $regex: search, $options: "i" } },
            ],
          },
        });

        const countPipeline = [...aggregationPipeline, { $count: "total" }];
        const totalRecordsAgg = await MessagesModel.aggregate(countPipeline);
        total_records = totalRecordsAgg.length > 0 ? totalRecordsAgg[0].total : 0;

        aggregationPipeline.push({ $skip: skip }, { $limit: perPage });
      } else {
        total_records = await MessagesModel.distinct("room", match).then((r) => r.length);
      }

      const roomsAgg = await MessagesModel.aggregate(aggregationPipeline);

      const currentUser = await UserModel.findById(userId).select("blocked_users").lean();
      const blockedByMeSet = new Set((currentUser?.blocked_users || []).map((id) => id.toString()));

      const usersWhoBlockedMe = await UserModel.find({ blocked_users: new ObjectId(userId) }).distinct("_id");
      const blockedByOtherSet = new Set((usersWhoBlockedMe || []).map((id) => id.toString()));

      const list = roomsAgg.map((row) => {
        const last = row.last_message || {};
        const other = row.other_user || {};
        const otherIdStr = row.other_user_id ? row.other_user_id.toString() : "";
        const isBlockedByMe = blockedByMeSet.has(otherIdStr);
        const isBlockedByOther = blockedByOtherSet.has(otherIdStr);

        return {
          room: row.room,
          other_user_id: row.other_user_id,
          is_blocked_by_me: isBlockedByMe,
          is_blocked_by_other: isBlockedByOther,
          is_blocked: isBlockedByMe || isBlockedByOther,
          other_user: other._id
            ? {
              _id: other._id,
              name: other.full_name || other.name || other.username,
              first_name: other.first_name,
              last_name: other.last_name,
              username: other.username,
              email: other.email,
              profile_image: global.buildUserImageUrl(other.profile_image),
            }
            : null,
          last_message: {
            _id: last._id,
            message: last.message,
            type: last.type,
            file_name: last.file_name,
            file_url: last.file_name ? FILES_URL + "chat/" + last.file_name : null,
            sender_id: last.sender_id,
            receiver_id: last.receiver_id,
            createdAt: last.createdAt,
          },
        };
      });

      return global.successResponse(res, MESSAGE.OPR_SUCCESS, {
        list,
        total_records,
        page,
        offset: skip,
        per_page: perPage,
      });
    } catch (err) {
      return global.failResponse(res, err.message, err);
    }
  },

  getMessages: async (req, res) => {
    try {
      const { room, search } = req.query;
      if (!room) {
        return global.failResponse(res, MESSAGE.INVALID_REQUEST, {});
      }

      const matchQuery = { room };
      if (search) {
        matchQuery.message = { $regex: search, $options: "i" };
      }

      const list = await MessagesModel.aggregate([
        { $match: matchQuery },
        { $sort: { createdAt: 1 } },
        {
          $lookup: {
            from: "users",
            localField: "sender_id",
            foreignField: "_id",
            as: "sender",
          },
        },
        {
          $lookup: {
            from: "users",
            localField: "receiver_id",
            foreignField: "_id",
            as: "receiver",
          },
        },
        {
          $unwind: { path: "$sender", preserveNullAndEmptyArrays: true },
        },
        {
          $unwind: { path: "$receiver", preserveNullAndEmptyArrays: true },
        },
        {
          $project: {
            _id: 1,
            room: 1,
            sender_id: 1,
            receiver_id: 1,
            message: 1,
            file_name: 1,
            type: 1,
            createdAt: 1,
            "sender.name": 1,
            "sender.first_name": 1,
            "sender.email": 1,
            "receiver.name": 1,
            "receiver.first_name": 1,
            "receiver.email": 1,
          },
        },
      ]);
      const listWithUrl = list.map((doc) => ({
        ...doc,
        file_url: doc.file_name ? FILES_URL + "chat/" + doc.file_name : null,
      }));
      return global.successResponse(res, MESSAGE.OPR_SUCCESS, listWithUrl);
    } catch (err) {
      return global.failResponse(res, err.message, err);
    }
  },

  receiverInfo: async (req, res) => {
    try {
      const to = req.query.to || req.query.receiver_id;
      if (!to || !ObjectId.isValid(to)) {
        return global.failResponse(res, MESSAGE.INVALID_REQUEST, {});
      }
      const user = await global.getUserData(to);
      if (!user || !user._id) {
        return global.failResponse(res, MESSAGE.RECORD_NOT_FOUND, {});
      }

      const loggedInUserId = req.user._id;
      const currentUser = await UserModel.findById(loggedInUserId).select("blocked_users").lean();
      const isBlockedByMe = (currentUser?.blocked_users || []).some((id) => id.toString() === to.toString());
      const isBlockedByOther = !!(await UserModel.exists({ _id: new ObjectId(to), blocked_users: new ObjectId(loggedInUserId) }));

      const userResponse = {
        ...user,
        is_blocked_by_me: isBlockedByMe,
        is_blocked_by_other: isBlockedByOther,
        is_blocked: isBlockedByMe || isBlockedByOther,
      };

      return global.successResponse(res, MESSAGE.OPR_SUCCESS, userResponse);
    } catch (err) {
      return global.failResponse(res, err.message, err);
    }
  },

  uploadFile: async (req, res) => {
    try {
      const fileParam = req.files?.file ? "file" : req.files?.video ? "video" : null;
      if (!fileParam || !req.files[fileParam]) {
        return global.failResponse(res, "File is required", {});
      }
      const fileName = await global.uploadFile(req, fileParam, "chat");
      return global.successResponse(res, MESSAGE.OPR_SUCCESS, { file_name: fileName });
    } catch (err) {
      return global.failResponse(res, err.message, err);
    }
  },

  deleteMessage: async (req, res) => {
    try {
      const { _id } = req.body;
      const msg = await MessagesModel.findOne({ _id: new ObjectId(_id) });
      if (!msg) {
        return global.failResponse(res, MESSAGE.RECORD_NOT_FOUND, {});
      }
      if (String(msg.sender_id) !== String(req.user._id)) {
        return global.failResponse(res, "You can only delete your own messages", {}, 403);
      }
      await MessagesModel.deleteOne({ _id: new ObjectId(_id) });
      return global.successResponse(res, MESSAGE.DELETED, {});
    } catch (err) {
      return global.failResponse(res, err.message, err);
    }
  },

  editMessage: async (req, res) => {
    try {
      const { _id, message } = req.body;
      const msg = await MessagesModel.findOne({ _id: new ObjectId(_id) });
      if (!msg) {
        return global.failResponse(res, MESSAGE.RECORD_NOT_FOUND, {});
      }
      if (String(msg.sender_id) !== String(req.user._id)) {
        return global.failResponse(res, "You can only edit your own messages", {}, 403);
      }
      await global.editMessage({ _id: new ObjectId(_id), message });
      return global.successResponse(res, MESSAGE.EDITED, {});
    } catch (err) {
      return global.failResponse(res, err.message, err);
    }
  },

  clearChat: async (req, res) => {
    try {
      const { room } = req.body;
      const userId = req.user._id;

      const hasAccess = await MessagesModel.findOne({
        room,
        $or: [{ sender_id: new ObjectId(userId) }, { receiver_id: new ObjectId(userId) }]
      });

      if (!hasAccess) {
        // If they have no messages in the room, it's either already clear or they don't have access.
        // Returning success since it's already "clear" for them.
        return global.successResponse(res, "Chat cleared successfully", {});
      }

      await MessagesModel.deleteMany({ room });
      return global.successResponse(res, "Chat cleared successfully", {});
    } catch (err) {
      return global.failResponse(res, err.message, err);
    }
  },

  // voiceToText: async (req, res) => {
  //   try {
  //     if (!req.files || !req.files.audio) {
  //       return global.failResponse(res, "Audio file is required", {});
  //     }

  //     const audio = req.files.audio;
  //     const uploadDir = path.join(__dirname, "../../../../../public/uploads/chat");
  //     if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  //     const tempPath = path.join(uploadDir, "voice_" + Date.now() + path.extname(audio.name));
  //     await audio.mv(tempPath);

  //     const transcription = await openai.audio.transcriptions.create({
  //       file: fs.createReadStream(tempPath),
  //       model: "whisper-1",
  //     });

  //     fs.unlinkSync(tempPath);

  //     return global.successResponse(res, MESSAGE.OPR_SUCCESS, { text: transcription.text });
  //   } catch (err) {
  //     return global.failResponse(res, err.message, err);
  //   }
  // },

  //   autoImageTagging: async (req, res) => {
  //     try {
  //       if (!req.files || !req.files.image) {
  //         return res.status(400).json({ success: false, message: "Image file is required", data: {} });
  //       }

  //       const image = req.files.image;
  //       const uploadDir = path.join(__dirname, "../../../../../public/uploads/chat");
  //       if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  //       const tempPath = path.join(uploadDir, "image_" + Date.now() + path.extname(image.name));
  //       await image.mv(tempPath);

  //       const imageBuffer = fs.readFileSync(tempPath);
  //       const ext = path.extname(image.name).toLowerCase();
  //       const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
  //       const base64Image = imageBuffer.toString('base64');

  //       const response = await axios.post(
  //         process.env.OPENAI_URL || 'https://api.openai.com/v1/chat/completions',
  //         {
  //           model: 'gpt-4o-mini',
  //           messages: [
  //             {
  //               role: "system",
  //               content: `You are a fashion item analyzer. Analyze the clothing image and return ONLY a JSON object with these fields:
  // - name (string): clothing item name e.g. "Red Floral Dress"
  // - occasion: one of [party, casual, formal, daily, workout, lounge, ethnic, wedding] or null
  // - season: one of [summer, winter, monsoon, fall] or null
  // - statuses: one of [donate, laundry, closet, sell, repair, lent] — default "closet"
  // - care: one of [regular, gentle, dry_clean] — default "regular"
  // - size: one of [XS, S, M, L, XL, CUSTOM] or null
  // - colors: array of color strings e.g. ["red", "white"]
  // - fabric: array of fabric strings e.g. ["cotton", "polyester"]
  // - tags: array of descriptive tags e.g. ["floral", "sleeveless", "midi"]
  // - mood: one of [romantic, casual, happy] or null

  // Return ONLY raw JSON, no markdown, no explanation.`
  //             },
  //             {
  //               role: "user",
  //               content: [
  //                 {
  //                   type: "image_url",
  //                   image_url: {
  //                     url: `data:${mimeType};base64,${base64Image}`,
  //                     detail: "low" 
  //                   }
  //                 },
  //                 {
  //                   type: "text",
  //                   text: "Analyze this clothing item and return the JSON."
  //                 }
  //               ]
  //             }
  //           ],
  //           max_tokens: 500
  //         },
  //         {
  //           headers: {
  //             "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
  //             "Content-Type": "application/json"
  //           }
  //         }
  //       );

  //       let content = response.data.choices[0].message.content.trim();
  //       content = content.replace(/```(?:json)?/g, '').trim();

  //       let itemData;
  //       try {
  //         itemData = JSON.parse(content);
  //       } catch (err) {
  //         return res.status(500).json({
  //           success: false,
  //           message: "Failed to parse AI response JSON",
  //           data: content
  //         });
  //       }

  //       fs.unlinkSync(tempPath);

  //       return res.status(200).json({ 
  //         success: true, 
  //         message: "Item generated successfully", 
  //         data: itemData 
  //       });

  //     } catch (err) {
  //       console.error(err);
  //       return res.status(500).json({ success: false, message: err.message, data: {} });
  //     }
  //   }
};

export default chatController;
